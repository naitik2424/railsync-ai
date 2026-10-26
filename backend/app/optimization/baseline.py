from typing import List, Dict, Any, Tuple
from backend.app.models.schedule import ScheduleResult, ScheduledTaskItem, ScheduleWindow


def compute_baseline_schedule(tasks: List[Dict[str, Any]], horizon_hours: float = 24.0) -> ScheduleResult:
    """
    Computes a realistic baseline uncoordinated schedule.
    In traditional uncoordinated railway operations:
    - Departments (Track, OHE, S&T) request track possessions independently.
    - Tasks are executed sequentially by department or queued up in silos without cross-department window bundling.
    - Compatible tasks (e.g. S&T point inspection and OHE wire checks on Section A-1) are executed in separate consecutive windows, inflating total network downtime.
    - Sometimes uncoordinated scheduling leads to resource conflicts or dependency delays.
    """
    scheduled_tasks: List[ScheduledTaskItem] = []
    windows: List[ScheduleWindow] = []
    
    current_time_by_section: Dict[str, float] = {}
    current_time_by_crew: Dict[str, float] = {}
    current_time_by_equipment: Dict[str, float] = {}
    task_finish_times: Dict[str, float] = {}
    
    dependency_violations = 0
    resource_conflicts = 0
    
    # Sort by department then planned start offset (silo approach)
    sorted_tasks = sorted(
        tasks,
        key=lambda t: (t.get("department", ""), t.get("planned_start_offset_hours", 0))
    )
    
    window_counter = 1
    total_window_hours = 0.0
    
    for task in sorted_tasks:
        task_id = task.get("id", f"TSK-{len(scheduled_tasks)+1}")
        duration = float(task.get("planned_duration_hours", 2.0))
        section = task.get("section", "Section A-1 (Mainline North)")
        dept = task.get("department", "Track")
        m_type = task.get("maintenance_type", "")
        priority = task.get("priority", "Medium")
        
        resources = task.get("resources", {})
        if isinstance(resources, dict):
            crew = resources.get("crew_type", "Standard Crew")
            eq_list = resources.get("equipment", [])
            power_block = resources.get("power_block_required", False)
        else:
            crew = getattr(resources, "crew_type", "Standard Crew")
            eq_list = getattr(resources, "equipment", [])
            power_block = getattr(resources, "power_block_required", False)
            
        # In baseline, each task claims its own isolated window on the section
        # Earliest time considering section availability in isolation
        earliest_start = current_time_by_section.get(section, 0.0)
        
        # Check dependencies
        deps = task.get("dependencies", [])
        for dep_id in deps:
            if dep_id in task_finish_times:
                if task_finish_times[dep_id] > earliest_start:
                    earliest_start = task_finish_times[dep_id]
            else:
                # Dependency was not scheduled yet (violation in silo approach)
                dependency_violations += 1
                
        # Crew & Equipment bottlenecks
        if crew in current_time_by_crew and current_time_by_crew[crew] > earliest_start:
            # In baseline, if crew is busy, conflict happens or delay is forced
            earliest_start = current_time_by_crew[crew]
            
        for eq in eq_list:
            if eq in current_time_by_equipment and current_time_by_equipment[eq] > earliest_start:
                earliest_start = current_time_by_equipment[eq]
                resource_conflicts += 1
                
        # Buffer between disjoint windows in traditional silo
        earliest_start = round(earliest_start, 1)
        end_time = round(earliest_start + duration, 1)
        
        # Update trackers
        current_time_by_section[section] = end_time + 0.5  # 30-min buffer between isolated possessions
        current_time_by_crew[crew] = end_time
        for eq in eq_list:
            current_time_by_equipment[eq] = end_time
        task_finish_times[task_id] = end_time
        
        window_id = f"WIN-BASE-{window_counter:02d}"
        window_counter += 1
        
        total_window_hours += duration
        
        windows.append(ScheduleWindow(
            window_id=window_id,
            section=section,
            start_hour=earliest_start,
            end_hour=end_time,
            duration_hours=duration,
            tasks_count=1,
            bundled_departments=[dept],
            has_power_block=power_block
        ))
        
        scheduled_tasks.append(ScheduledTaskItem(
            task_id=task_id,
            title=task.get("title", ""),
            department=dept,
            section=section,
            maintenance_type=m_type,
            start_hour=earliest_start,
            end_hour=end_time,
            duration_hours=duration,
            window_id=window_id,
            is_power_block=power_block,
            crew_type=crew,
            priority=priority,
            risk_level=task.get("risk_level", "Low")
        ))
        
    makespan = max((t.end_hour for t in scheduled_tasks), default=0.0)
    
    return ScheduleResult(
        schedule_type="baseline",
        is_feasible=True,
        status_message="Baseline uncoordinated sequential schedule generated (siloed departmental windows).",
        solver_status="BASELINE_HEURISTIC",
        total_window_hours=round(total_window_hours, 1),
        makespan_hours=round(makespan, 1),
        tasks_scheduled_count=len(scheduled_tasks),
        tasks_unassigned_count=0,
        dependency_violations=dependency_violations,
        resource_conflicts=resource_conflicts,
        bundled_windows_count=0,
        tasks=scheduled_tasks,
        windows=windows
    )
