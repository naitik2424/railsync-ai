from fastapi import APIRouter, Query
from backend.app.models.schedule import ScheduleResult, ScheduleComparison
from backend.app.services.task_service import task_service
from backend.app.optimization.baseline import compute_baseline_schedule
from backend.app.optimization.scheduler import optimize_schedule_cp_sat, compare_schedules

router = APIRouter(prefix="/optimization", tags=["Maintenance Scheduling Optimization"])


@router.get("/baseline", response_model=ScheduleResult)
def get_baseline_schedule(horizon_hours: float = Query(24.0, ge=6.0, le=72.0)):
    """
    Computes baseline schedule representing traditional uncoordinated departmental silo planning.
    """
    tasks = task_service.get_all_tasks()
    return compute_baseline_schedule(tasks, horizon_hours=horizon_hours)


@router.get("/optimized", response_model=ScheduleResult)
def get_optimized_schedule(horizon_hours: float = Query(24.0, ge=6.0, le=72.0)):
    """
    Computes globally optimized railway maintenance schedule using Google OR-Tools CP-SAT.
    Enforces dependencies, equipment and crew availability, and bundles compatible line blocks.
    """
    tasks = task_service.get_all_tasks()
    return optimize_schedule_cp_sat(tasks, horizon_hours=horizon_hours)


@router.get("/comparison", response_model=ScheduleComparison)
def get_schedule_comparison(horizon_hours: float = Query(24.0, ge=6.0, le=72.0)):
    """
    Computes comparative analytics: Baseline uncoordinated schedule vs OR-Tools CP-SAT optimized schedule.
    Demonstrates total downtime hours saved, cross-department window bundling, and conflict resolution.
    """
    tasks = task_service.get_all_tasks()
    baseline = compute_baseline_schedule(tasks, horizon_hours=horizon_hours)
    optimized = optimize_schedule_cp_sat(tasks, horizon_hours=horizon_hours)
    return compare_schedules(baseline, optimized)
