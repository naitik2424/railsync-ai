from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from backend.app.models.schedule import ScheduleResult, ScheduleComparison


class DisruptionType(str):
    EQUIPMENT_BREAKDOWN = "equipment_breakdown"
    CREW_UNAVAILABLE = "crew_unavailable"
    TASK_DELAY_SPIKE = "task_delay_spike"
    WEATHER_RESTRICTION = "weather_restriction"
    EMERGENCY_POWER_CUT = "emergency_power_cut"


class WhatIfRequest(BaseModel):
    scenario_id: Optional[str] = None
    title: str = Field(..., description="Scenario description")
    disruption_type: str = Field(..., description="equipment_breakdown, crew_unavailable, task_delay_spike, weather_restriction")
    target_task_id: Optional[str] = None
    target_equipment: Optional[str] = None
    target_crew_type: Optional[str] = None
    target_section: Optional[str] = None
    duration_multiplier: float = Field(default=1.5, ge=1.0, le=4.0)
    crew_shortage_percentage: float = Field(default=0.5, ge=0.0, le=1.0)


class WhatIfImpactSummary(BaseModel):
    scenario_title: str
    disruption_type: str
    impacted_task_ids: List[str]
    cascade_affected_tasks: List[str]
    delay_probability_increase_avg: float
    new_high_risk_tasks_count: int
    operational_explanation: str
    recommended_mitigation: str


class WhatIfResponse(BaseModel):
    scenario_id: str
    impact_summary: WhatIfImpactSummary
    original_schedule: ScheduleResult
    revised_schedule: ScheduleResult
    comparison: ScheduleComparison
    generated_alerts: List[Dict[str, Any]]
