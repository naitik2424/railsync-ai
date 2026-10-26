import pytest
from backend.app.optimization.baseline import compute_baseline_schedule
from backend.app.optimization.scheduler import optimize_schedule_cp_sat, compare_schedules
from backend.app.ml.synthetic_data import generate_active_tasks


def test_baseline_schedule_generation():
    tasks = generate_active_tasks()
    result = compute_baseline_schedule(tasks)
    assert result.is_feasible is True
    assert result.tasks_scheduled_count == len(tasks)
    assert result.total_window_hours > 0.0
    assert result.makespan_hours > 0.0


def test_cp_sat_schedule_optimization():
    tasks = generate_active_tasks()
    result = optimize_schedule_cp_sat(tasks)
    assert result.is_feasible is True
    assert result.solver_status in ["OPTIMAL", "FEASIBLE"]
    assert result.tasks_scheduled_count > 0
    assert len(result.tasks) > 0
    assert len(result.windows) > 0


def test_cp_sat_precedence_constraint():
    """Verify that every dependent task starts strictly after its prerequisites finish."""
    tasks = generate_active_tasks()
    result = optimize_schedule_cp_sat(tasks)
    task_map = {t.task_id: t for t in result.tasks}
    
    original_tasks_map = {t["id"]: t for t in tasks}
    
    for t_item in result.tasks:
        orig = original_tasks_map.get(t_item.task_id, {})
        for dep_id in orig.get("dependencies", []):
            if dep_id in task_map:
                dep_item = task_map[dep_id]
                # Precedence: start must be >= end of prerequisite
                assert t_item.start_hour >= dep_item.end_hour, (
                    f"Precedence violation: {t_item.task_id} started at {t_item.start_hour} "
                    f"before prerequisite {dep_id} finished at {dep_item.end_hour}"
                )


def test_cp_sat_equipment_no_overlap():
    """Verify that tasks sharing scarce equipment do not overlap."""
    tasks = generate_active_tasks()
    result = optimize_schedule_cp_sat(tasks)
    
    # Group scheduled intervals by equipment
    equipment_intervals = {}
    original_tasks_map = {t["id"]: t for t in tasks}
    
    for t_item in result.tasks:
        orig = original_tasks_map.get(t_item.task_id, {})
        eq_list = orig.get("resources", {}).get("equipment", [])
        for eq in eq_list:
            equipment_intervals.setdefault(eq, []).append(t_item)
            
    for eq, items in equipment_intervals.items():
        # Sort by start hour
        items_sorted = sorted(items, key=lambda x: x.start_hour)
        for i in range(len(items_sorted) - 1):
            assert items_sorted[i].end_hour <= items_sorted[i+1].start_hour, (
                f"Equipment conflict on '{eq}': {items_sorted[i].task_id} ends at {items_sorted[i].end_hour} "
                f"but {items_sorted[i+1].task_id} starts at {items_sorted[i+1].start_hour}"
            )


def test_schedule_comparison_efficiency():
    tasks = generate_active_tasks()
    baseline = compute_baseline_schedule(tasks)
    optimized = optimize_schedule_cp_sat(tasks)
    comparison = compare_schedules(baseline, optimized)
    
    assert comparison.downtime_hours_saved >= 0.0
    assert comparison.downtime_reduction_percent >= 0.0
    assert comparison.coordination_efficiency_score > 0.0
    assert len(comparison.key_improvements) > 0


def test_circular_dependency_infeasibility_reporting():
    """Ensure optimizer catches circular dependencies and reports infeasibility cleanly."""
    cyclic_tasks = [
        {
            "id": "CYC-1",
            "title": "Task 1",
            "department": "Track",
            "section": "Sec 1",
            "maintenance_type": "Ballast Tamping",
            "planned_duration_hours": 2.0,
            "status": "Pending",
            "resources": {"crew_type": "Gang 1", "equipment": []},
            "dependencies": ["CYC-2"]
        },
        {
            "id": "CYC-2",
            "title": "Task 2",
            "department": "Signalling & Telecommunications (S&T)",
            "section": "Sec 1",
            "maintenance_type": "Point Machine Maintenance",
            "planned_duration_hours": 2.0,
            "status": "Pending",
            "resources": {"crew_type": "Gang 2", "equipment": []},
            "dependencies": ["CYC-1"]
        }
    ]
    result = optimize_schedule_cp_sat(cyclic_tasks)
    assert result.is_feasible is False
    assert "Circular dependency" in result.status_message
    assert result.solver_status == "INFEASIBLE"
