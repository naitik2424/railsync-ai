import copy
import uuid
from typing import Dict, Any, List, Optional

from backend.app.models.simulation import (
    WhatIfRequest,
    WhatIfResponse,
    WhatIfImpactSummary
)
from backend.app.models.schedule import ScheduleComparison
from backend.app.services.task_service import task_service
from backend.app.services.alert_service import alert_service
from backend.app.ml.predict import predict_delay_for_task
from backend.app.optimization.baseline import compute_baseline_schedule
from backend.app.optimization.scheduler import optimize_schedule_cp_sat, compare_schedules


PRECONFIGURED_SCENARIOS = [
    {
        "id": "scenario-tower-wagon-failure",
        "title": "OHE Tower Wagon TW-202 Breakdown",
        "description": "Critical hydraulic failure on specialized tower wagon halts all 25kV catenary maintenance, forcing equipment reallocation or postponement.",
        "disruption_type": "equipment_breakdown",
        "target_equipment": "Tower Wagon TW-202",
        "target_task_id": "TSK-OHE-201",
        "duration_multiplier": 1.75,
        "crew_shortage_percentage": 0.0
    },
    {
        "id": "scenario-snt-crew-shortage",
        "title": "S&T Signal Engineers Emergency Reassignment",
        "description": "50% of the S&T interlocking team is diverted to emergency signal fault in Sector 4, causing a staffing bottleneck on active point machine servicing.",
        "disruption_type": "crew_unavailable",
        "target_crew_type": "Signal Engineers Group A",
        "target_task_id": "TSK-SNT-301",
        "duration_multiplier": 1.5,
        "crew_shortage_percentage": 0.50
    },
    {
        "id": "scenario-track-renewal-defect",
        "title": "Severe Rail Base Defect in Section B-1",
        "description": "Deep subsurface flaw discovered during sleeper renewal extends planned track possession from 5.5 hours to 8.5 hours (+55%).",
        "disruption_type": "task_delay_spike",
        "target_task_id": "TSK-TRK-103",
        "duration_multiplier": 1.55,
        "crew_shortage_percentage": 0.20
    },
    {
        "id": "scenario-monsoon-storm",
        "title": "Heavy Monsoon Thunderstorm Warning in Section A-1",
        "description": "Severe weather alerts trigger safety protocols, reducing nighttime visual work velocity and increasing delay risks on mainline track testing.",
        "disruption_type": "weather_restriction",
        "target_section": "Section A-1 (Mainline North)",
        "duration_multiplier": 1.40,
        "crew_shortage_percentage": 0.0
    }
]


class SimulationService:
    @staticmethod
    def get_preconfigured_scenarios() -> List[Dict[str, Any]]:
        return PRECONFIGURED_SCENARIOS

    @staticmethod
    def run_simulation(request: WhatIfRequest) -> WhatIfResponse:
        """
        Executes an end-to-end operational what-if simulation:
        1. Clones active tasks
        2. Applies operational disruption
        3. Recalculates ML delay probabilities for impacted and downstream tasks
        4. Re-solves Google OR-Tools CP-SAT schedule
        5. Computes analytical delta and operational explanation
        """
        original_tasks = task_service.get_all_tasks()
        simulated_tasks = copy.deepcopy(original_tasks)
        task_map = {t["id"]: t for t in simulated_tasks}
        
        impacted_task_ids: List[str] = []
        cascade_affected_tasks: List[str] = []
        
        # 1. Apply disruption
        if request.disruption_type == "equipment_breakdown":
            eq = request.target_equipment or "Tower Wagon TW-202"
            for t in simulated_tasks:
                resources = t.get("resources", {})
                eq_list = resources.get("equipment", []) if isinstance(resources, dict) else getattr(resources, "equipment", [])
                if eq in eq_list or t.get("id") == request.target_task_id:
                    t["equipment_available"] = False
                    t["planned_duration_hours"] = round(float(t["planned_duration_hours"]) * request.duration_multiplier, 1)
                    t["crew_availability_ratio"] = max(0.4, float(t.get("crew_availability_ratio", 1.0)) - 0.2)
                    impacted_task_ids.append(t["id"])
                    
        elif request.disruption_type == "crew_unavailable":
            crew = request.target_crew_type or "Signal Engineers Group A"
            for t in simulated_tasks:
                resources = t.get("resources", {})
                t_crew = resources.get("crew_type") if isinstance(resources, dict) else getattr(resources, "crew_type", "")
                if t_crew == crew or t.get("id") == request.target_task_id:
                    shortage = request.crew_shortage_percentage or 0.5
                    t["crew_availability_ratio"] = round(max(0.2, 1.0 - shortage), 2)
                    t["planned_duration_hours"] = round(float(t["planned_duration_hours"]) * (1.0 + shortage * 0.8), 1)
                    impacted_task_ids.append(t["id"])

        elif request.disruption_type == "task_delay_spike":
            t_id = request.target_task_id or "TSK-TRK-103"
            if t_id in task_map:
                t = task_map[t_id]
                t["planned_duration_hours"] = round(float(t["planned_duration_hours"]) * request.duration_multiplier, 1)
                t["crew_availability_ratio"] = max(0.5, float(t.get("crew_availability_ratio", 1.0)) - 0.2)
                impacted_task_ids.append(t_id)

        elif request.disruption_type == "weather_restriction":
            sec = request.target_section or "Section A-1 (Mainline North)"
            for t in simulated_tasks:
                if t.get("section") == sec:
                    t["weather_condition"] = "Rain"
                    t["planned_duration_hours"] = round(float(t["planned_duration_hours"]) * request.duration_multiplier, 1)
                    impacted_task_ids.append(t["id"])

        else:
            # Fallback custom target
            if request.target_task_id and request.target_task_id in task_map:
                t = task_map[request.target_task_id]
                t["planned_duration_hours"] = round(float(t["planned_duration_hours"]) * request.duration_multiplier, 1)
                impacted_task_ids.append(request.target_task_id)

        # 2. Identify cascade downstream tasks
        for t in simulated_tasks:
            for dep in t.get("dependencies", []):
                if dep in impacted_task_ids and t["id"] not in impacted_task_ids:
                    cascade_affected_tasks.append(t["id"])

        # 3. Recalculate ML predictions for all tasks under simulated conditions
        prob_increases = []
        new_high_risk_count = 0
        
        for t in simulated_tasks:
            old_prob = task_service.get_task(t["id"]).get("predicted_delay_probability", 0.25) if task_service.get_task(t["id"]) else 0.25
            pred = predict_delay_for_task(t)
            t["predicted_delay_probability"] = pred["delay_probability"]
            t["risk_level"] = pred["risk_level"]
            t["delay_factors"] = pred["top_risk_factors"]
            
            if t["id"] in impacted_task_ids or t["id"] in cascade_affected_tasks:
                diff = pred["delay_probability"] - old_prob
                prob_increases.append(diff)
                if pred["risk_level"] in ["High", "Critical"]:
                    new_high_risk_count += 1

        avg_prob_increase = round(float(sum(prob_increases) / len(prob_increases)), 3) if prob_increases else 0.0

        # 4. Run baseline and optimized schedules on simulated state
        sim_baseline = compute_baseline_schedule(simulated_tasks)
        sim_optimized = optimize_schedule_cp_sat(simulated_tasks)
        comparison = compare_schedules(sim_baseline, sim_optimized)
        
        # Original schedule for comparison reference
        orig_optimized = optimize_schedule_cp_sat(original_tasks)

        # 5. Generate operational narrative
        explanation = (
            f"The simulated disruption '{request.title}' directly impacted {len(impacted_task_ids)} tasks "
            f"and cascaded risk to {len(cascade_affected_tasks)} dependent downstream operations. "
            f"ML delay risk increased by an average of +{int(avg_prob_increase * 100)}% across affected tasks."
        )

        mitigation = (
            f"Google OR-Tools CP-SAT re-sequenced the work windows: "
            f"It dynamically shifted dependent tasks forward by {comparison.downtime_hours_saved}h, "
            f"avoiding line block conflicts while preserving {sim_optimized.bundled_windows_count} synchronized track windows."
        )

        impact_summary = WhatIfImpactSummary(
            scenario_title=request.title,
            disruption_type=request.disruption_type,
            impacted_task_ids=impacted_task_ids,
            cascade_affected_tasks=cascade_affected_tasks,
            delay_probability_increase_avg=avg_prob_increase,
            new_high_risk_tasks_count=new_high_risk_count,
            operational_explanation=explanation,
            recommended_mitigation=mitigation
        )

        # Generate fresh alerts for simulated state
        sim_alerts = alert_service.generate_alerts(simulated_tasks)

        scenario_id = request.scenario_id or f"sim-{uuid.uuid4().hex[:8]}"

        return WhatIfResponse(
            scenario_id=scenario_id,
            impact_summary=impact_summary,
            original_schedule=orig_optimized,
            revised_schedule=sim_optimized,
            comparison=comparison,
            generated_alerts=sim_alerts
        )


simulation_service = SimulationService()
