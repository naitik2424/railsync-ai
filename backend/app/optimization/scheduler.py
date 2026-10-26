import math
from typing import List, Dict, Any, Tuple, Optional
from ortools.sat.python import cp_model

from backend.app.models.schedule import (
    ScheduleResult,
    ScheduledTaskItem,
    ScheduleWindow,
    ScheduleComparison
)
from backend.app.optimization.baseline import compute_baseline_schedule


# Resolution in hours per tick (0.5 hours = 30 minutes)
TICK_HOURS = 0.5


def optimize_schedule_cp_sat(
    tasks: List[Dict[str, Any]],
    horizon_hours: float = 24.0,
    max_solve_time_seconds: float = 5.0
) -> ScheduleResult:
    """
    Optimizes railway maintenance scheduling using Google OR-Tools CP-SAT solver.
    
    Hard Operational & Safety Constraints:
    1. Precedence / Dependencies: Upstream tasks must finish before downstream tasks begin.
    2. Scarce Specialized Equipment: Single-resource machines (Tamping Machine, Tower Wagon, Flaw Detector)
       cannot be double-booked across tasks.
    3. Specialized Crews: Designated department crews cannot work two concurrent tasks.
    4. Track Section Safety: Incompatible tasks on the same section CANNOT overlap.
    5. Window Bundling: Compatible tasks on the same section ARE permitted to run concurrently,
       dramatically reducing the total duration of line blocks / track closures.
    """
    # Filter pending or in-progress tasks
    active_tasks = [t for t in tasks if t.get("status") != "Completed" and t.get("status") != "Cancelled"]
    if not active_tasks:
        return ScheduleResult(
            schedule_type="optimized",
            is_feasible=True,
            status_message="No active tasks to schedule.",
            solver_status="OPTIMAL",
            total_window_hours=0.0,
            makespan_hours=0.0,
            tasks_scheduled_count=0
        )
        
    model = cp_model.CpModel()
    horizon_ticks = int(math.ceil(horizon_hours / TICK_HOURS))
    
    task_vars = {}
    tasks_by_id = {t["id"]: t for t in active_tasks}
    
    # Check for direct cycle in dependencies first
    def has_cycle(start_id, visited=None, stack=None):
        if visited is None: visited = set()
        if stack is None: stack = set()
        visited.add(start_id)
        stack.add(start_id)
        for dep in tasks_by_id.get(start_id, {}).get("dependencies", []):
            if dep in tasks_by_id:
                if dep not in visited:
                    if has_cycle(dep, visited, stack): return True
                elif dep in stack:
                    return True
        stack.remove(start_id)
        return False

    for t_id in tasks_by_id:
        if has_cycle(t_id):
            return ScheduleResult(
                schedule_type="optimized",
                is_feasible=False,
                status_message=f"Constraint Violation: Circular dependency detected involving task {t_id}.",
                solver_status="INFEASIBLE",
                total_window_hours=0.0,
                makespan_hours=0.0,
                tasks_scheduled_count=0
            )

    # 1. Create Interval Variables
    for t in active_tasks:
        t_id = t["id"]
        duration_hrs = float(t.get("planned_duration_hours", 2.0))
        duration_ticks = max(1, int(math.ceil(duration_hrs / TICK_HOURS)))
        
        start_var = model.NewIntVar(0, horizon_ticks, f"start_{t_id}")
        end_var = model.NewIntVar(0, horizon_ticks, f"end_{t_id}")
        interval_var = model.NewIntervalVar(start_var, duration_ticks, end_var, f"interval_{t_id}")
        
        task_vars[t_id] = {
            "start": start_var,
            "end": end_var,
            "interval": interval_var,
            "duration_ticks": duration_ticks,
            "duration_hrs": duration_hrs,
            "task": t
        }

    # 2. Dependency / Precedence Constraints
    for t_id, data in task_vars.items():
        t = data["task"]
        for dep_id in t.get("dependencies", []):
            if dep_id in task_vars:
                # Precedence: start_var >= dep_end_var
                model.Add(data["start"] >= task_vars[dep_id]["end"])

    # 3. Scarce Equipment Constraints (NoOverlap)
    equipment_to_intervals: Dict[str, List[Any]] = {}
    for t_id, data in task_vars.items():
        resources = data["task"].get("resources", {})
        if isinstance(resources, dict):
            eq_list = resources.get("equipment", [])
        else:
            eq_list = getattr(resources, "equipment", [])
        for eq in eq_list:
            equipment_to_intervals.setdefault(eq, []).append(data["interval"])
            
    for eq, intervals in equipment_to_intervals.items():
        if len(intervals) > 1:
            model.AddNoOverlap(intervals)

    # 4. Specialized Crew Constraints (NoOverlap)
    crew_to_intervals: Dict[str, List[Any]] = {}
    for t_id, data in task_vars.items():
        resources = data["task"].get("resources", {})
        if isinstance(resources, dict):
            crew = resources.get("crew_type", "Standard")
        else:
            crew = getattr(resources, "crew_type", "Standard")
        crew_to_intervals.setdefault(crew, []).append(data["interval"])
        
    for crew, intervals in crew_to_intervals.items():
        if len(intervals) > 1:
            model.AddNoOverlap(intervals)

    # 5. Section Safety & Co-scheduling Compatibility Constraints
    # Tasks on the same section CANNOT overlap UNLESS mutually compatible
    section_to_tasks: Dict[str, List[str]] = {}
    for t_id, data in task_vars.items():
        sec = data["task"].get("section", "Default")
        section_to_tasks.setdefault(sec, []).append(t_id)

    for sec, t_ids in section_to_tasks.items():
        for i in range(len(t_ids)):
            for j in range(i + 1, len(t_ids)):
                id1, id2 = t_ids[i], t_ids[j]
                t1, t2 = task_vars[id1]["task"], task_vars[id2]["task"]
                
                type1 = t1.get("maintenance_type", "")
                type2 = t2.get("maintenance_type", "")
                
                comp1 = t1.get("compatible_with_simultaneous_types", [])
                comp2 = t2.get("compatible_with_simultaneous_types", [])
                
                # Check mutual compatibility
                is_compatible = (type2 in comp1) and (type1 in comp2)
                
                if not is_compatible:
                    # Hard safety constraint: Incompatible tasks on the same section must not overlap!
                    model.AddNoOverlap([task_vars[id1]["interval"], task_vars[id2]["interval"]])

    # 6. Objective Function
    # Objective: Minimize overall makespan + priority-weighted completion times + encourage compaction
    makespan_var = model.NewIntVar(0, horizon_ticks, "makespan")
    for data in task_vars.values():
        model.Add(makespan_var >= data["end"])

    priority_weights = {"Critical": 8, "High": 5, "Medium": 2, "Low": 1}
    weighted_ends = []
    for t_id, data in task_vars.items():
        priority = data["task"].get("priority", "Medium")
        weight = priority_weights.get(priority, 2)
        weighted_ends.append(weight * data["end"])

    # Combine makespan and weighted end times
    model.Minimize(makespan_var * 10 + sum(weighted_ends))

    # Solve
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = max_solve_time_seconds
    solver.parameters.num_workers = 4
    status = solver.Solve(model)

    if status not in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
        return ScheduleResult(
            schedule_type="optimized",
            is_feasible=False,
            status_message="No feasible schedule found within operational horizon constraints. Check for resource contention or incompatible deadline overlaps.",
            solver_status=solver.StatusName(status),
            total_window_hours=0.0,
            makespan_hours=0.0,
            tasks_scheduled_count=0
        )

    # 7. Post-process Scheduled Tasks and Bundle Coordinated Windows
    scheduled_tasks: List[ScheduledTaskItem] = []
    makespan_ticks = solver.Value(makespan_var)
    makespan_hours = round(makespan_ticks * TICK_HOURS, 1)

    for t_id, data in task_vars.items():
        start_tick = solver.Value(data["start"])
        end_tick = solver.Value(data["end"])
        start_hr = round(start_tick * TICK_HOURS, 1)
        end_hr = round(end_tick * TICK_HOURS, 1)
        
        t = data["task"]
        resources = t.get("resources", {})
        if isinstance(resources, dict):
            crew = resources.get("crew_type", "Standard Crew")
            power_block = resources.get("power_block_required", False)
        else:
            crew = getattr(resources, "crew_type", "Standard Crew")
            power_block = getattr(resources, "power_block_required", False)

        scheduled_tasks.append(ScheduledTaskItem(
            task_id=t_id,
            title=t.get("title", ""),
            department=t.get("department", "Track"),
            section=t.get("section", ""),
            maintenance_type=t.get("maintenance_type", ""),
            start_hour=start_hr,
            end_hour=end_hr,
            duration_hours=data["duration_hrs"],
            window_id="PENDING",
            is_power_block=power_block,
            crew_type=crew,
            priority=t.get("priority", "Medium"),
            risk_level=t.get("risk_level", "Low")
        ))

    # Sort scheduled tasks by start time
    scheduled_tasks.sort(key=lambda x: (x.start_hour, x.section))

    # Group overlapping tasks on the same section into unified "Coordinated Track Windows"
    windows: List[ScheduleWindow] = []
    window_counter = 1
    bundled_windows_count = 0
    
    tasks_by_section: Dict[str, List[ScheduledTaskItem]] = {}
    for st in scheduled_tasks:
        tasks_by_section.setdefault(st.section, []).append(st)

    for sec, sec_tasks in tasks_by_section.items():
        # Sort by start hour
        sec_tasks.sort(key=lambda x: x.start_hour)
        current_cluster: List[ScheduledTaskItem] = []
        cluster_start = 0.0
        cluster_end = 0.0

        for st in sec_tasks:
            if not current_cluster:
                current_cluster = [st]
                cluster_start = st.start_hour
                cluster_end = st.end_hour
            else:
                # If this task overlaps or starts immediately after the previous in cluster
                if st.start_hour < cluster_end:
                    current_cluster.append(st)
                    cluster_end = max(cluster_end, st.end_hour)
                else:
                    # Finalize previous cluster into a window
                    w_id = f"WIN-OPT-{window_counter:02d}"
                    window_counter += 1
                    departments = list(set(t.department for t in current_cluster))
                    if len(current_cluster) > 1:
                        bundled_windows_count += 1
                    
                    for t in current_cluster:
                        t.window_id = w_id

                    windows.append(ScheduleWindow(
                        window_id=w_id,
                        section=sec,
                        start_hour=cluster_start,
                        end_hour=cluster_end,
                        duration_hours=round(cluster_end - cluster_start, 1),
                        tasks_count=len(current_cluster),
                        bundled_departments=departments,
                        has_power_block=any(t.is_power_block for t in current_cluster)
                    ))

                    current_cluster = [st]
                    cluster_start = st.start_hour
                    cluster_end = st.end_hour

        if current_cluster:
            w_id = f"WIN-OPT-{window_counter:02d}"
            window_counter += 1
            departments = list(set(t.department for t in current_cluster))
            if len(current_cluster) > 1:
                bundled_windows_count += 1
                
            for t in current_cluster:
                t.window_id = w_id

            windows.append(ScheduleWindow(
                window_id=w_id,
                section=sec,
                start_hour=cluster_start,
                end_hour=cluster_end,
                duration_hours=round(cluster_end - cluster_start, 1),
                tasks_count=len(current_cluster),
                bundled_departments=departments,
                has_power_block=any(t.is_power_block for t in current_cluster)
            ))

    total_window_hours = round(sum(w.duration_hours for w in windows), 1)

    return ScheduleResult(
        schedule_type="optimized",
        is_feasible=True,
        status_message=f"Optimal schedule synthesized via Google OR-Tools CP-SAT ({solver.StatusName(status)}). Co-scheduled {bundled_windows_count} multi-department windows.",
        solver_status=solver.StatusName(status),
        total_window_hours=total_window_hours,
        makespan_hours=makespan_hours,
        tasks_scheduled_count=len(scheduled_tasks),
        tasks_unassigned_count=0,
        dependency_violations=0,
        resource_conflicts=0,
        bundled_windows_count=bundled_windows_count,
        tasks=scheduled_tasks,
        windows=windows
    )


def compare_schedules(baseline: ScheduleResult, optimized: ScheduleResult) -> ScheduleComparison:
    """
    Computes rigorous comparative performance analytics between baseline and optimized schedules.
    """
    if not baseline.is_feasible or not optimized.is_feasible:
        return ScheduleComparison(
            baseline=baseline,
            optimized=optimized,
            downtime_hours_saved=0.0,
            downtime_reduction_percent=0.0,
            dependency_violations_resolved=baseline.dependency_violations,
            conflicts_resolved=baseline.resource_conflicts,
            coordination_efficiency_score=0.0,
            key_improvements=["Optimization failed or infeasible constraints encountered."]
        )

    saved_hours = round(max(0.0, baseline.total_window_hours - optimized.total_window_hours), 1)
    if baseline.total_window_hours > 0:
        reduction_pct = round((saved_hours / baseline.total_window_hours) * 100.0, 1)
    else:
        reduction_pct = 0.0

    violations_resolved = baseline.dependency_violations - optimized.dependency_violations
    conflicts_resolved = baseline.resource_conflicts - optimized.resource_conflicts
    
    # Efficiency score: combo of downtime reduction + bundling ratio + constraint fulfillment
    efficiency = min(100.0, round(reduction_pct * 1.5 + (optimized.bundled_windows_count * 10.0), 1))

    improvements = [
        f"Saved {saved_hours} hours of total network track possession downtime ({reduction_pct}% reduction).",
        f"Bundled compatible multi-department tasks across {optimized.bundled_windows_count} synchronized track block windows.",
        f"Eliminated {max(0, conflicts_resolved)} potential machine and crew allocation bottlenecks.",
        f"Maintained strict zero-violation precedence across all {optimized.tasks_scheduled_count} scheduled maintenance tasks."
    ]

    return ScheduleComparison(
        baseline=baseline,
        optimized=optimized,
        downtime_hours_saved=saved_hours,
        downtime_reduction_percent=reduction_pct,
        dependency_violations_resolved=violations_resolved,
        conflicts_resolved=conflicts_resolved,
        coordination_efficiency_score=efficiency,
        key_improvements=improvements
    )
