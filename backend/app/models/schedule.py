from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class ScheduledTaskItem(BaseModel):
    task_id: str
    title: str
    department: str
    section: str
    maintenance_type: str
    start_hour: float
    end_hour: float
    duration_hours: float
    window_id: str
    is_power_block: bool = False
    crew_type: str
    priority: str
    risk_level: str = "Low"


class ScheduleWindow(BaseModel):
    window_id: str
    section: str
    start_hour: float
    end_hour: float
    duration_hours: float
    tasks_count: int
    bundled_departments: List[str]
    has_power_block: bool = False


class ScheduleResult(BaseModel):
    schedule_type: str  # "baseline" or "optimized"
    is_feasible: bool
    status_message: str
    solver_status: Optional[str] = None
    total_window_hours: float
    makespan_hours: float
    tasks_scheduled_count: int
    tasks_unassigned_count: int = 0
    dependency_violations: int = 0
    resource_conflicts: int = 0
    bundled_windows_count: int = 0
    tasks: List[ScheduledTaskItem] = []
    windows: List[ScheduleWindow] = []


class ScheduleComparison(BaseModel):
    baseline: ScheduleResult
    optimized: ScheduleResult
    downtime_hours_saved: float
    downtime_reduction_percent: float
    dependency_violations_resolved: int
    conflicts_resolved: int
    coordination_efficiency_score: float
    key_improvements: List[str]
