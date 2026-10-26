from fastapi import APIRouter
from typing import List, Dict, Any
from backend.app.services.task_service import task_service
from backend.app.services.alert_service import alert_service
from backend.app.optimization.baseline import compute_baseline_schedule
from backend.app.optimization.scheduler import optimize_schedule_cp_sat

router = APIRouter(prefix="/coordination", tags=["Cross-Department Coordination & Dashboard"])


@router.get("/alerts", response_model=List[Dict[str, Any]])
def get_alerts():
    """Retrieve all dynamically generated cross-department alerts based on current task data and ML delay predictions."""
    return alert_service.generate_alerts()


@router.get("/dashboard-summary")
def get_dashboard_summary():
    """
    Computes aggregated operational KPI metrics for the executive railway operations dashboard:
    - Task status distribution (total, pending, completed, in progress, blocked)
    - High-risk task count and predicted delay summary
    - Department-wise task breakdown
    - Baseline vs Optimized window hours comparison
    - Active alerts count
    - Recent task updates
    """
    tasks = task_service.get_all_tasks()
    
    total_tasks = len(tasks)
    pending_tasks = sum(1 for t in tasks if t.get("status") == "Pending")
    in_progress_tasks = sum(1 for t in tasks if t.get("status") == "In Progress")
    completed_tasks = sum(1 for t in tasks if t.get("status") == "Completed")
    blocked_tasks = sum(1 for t in tasks if t.get("status") == "Blocked")
    
    high_risk_tasks = [t for t in tasks if t.get("risk_level") in ["High", "Critical"]]
    avg_delay_prob = round(
        sum(t.get("predicted_delay_probability", 0.0) for t in tasks) / total_tasks, 2
    ) if total_tasks > 0 else 0.0

    # Department breakdown
    dept_counts: Dict[str, int] = {}
    dept_risk_counts: Dict[str, int] = {}
    for t in tasks:
        dept = t.get("department", "Other")
        dept_counts[dept] = dept_counts.get(dept, 0) + 1
        if t.get("risk_level") in ["High", "Critical"]:
            dept_risk_counts[dept] = dept_risk_counts.get(dept, 0) + 1

    department_stats = [
        {
            "department": dept,
            "total_tasks": count,
            "high_risk_tasks": dept_risk_counts.get(dept, 0),
            "pending": sum(1 for t in tasks if t.get("department") == dept and t.get("status") == "Pending"),
            "completed": sum(1 for t in tasks if t.get("department") == dept and t.get("status") == "Completed"),
        }
        for dept, count in dept_counts.items()
    ]

    # Baseline vs Optimized window duration
    baseline = compute_baseline_schedule(tasks)
    optimized = optimize_schedule_cp_sat(tasks)
    
    saved_hours = round(max(0.0, baseline.total_window_hours - optimized.total_window_hours), 1)
    saved_percent = round((saved_hours / baseline.total_window_hours) * 100, 1) if baseline.total_window_hours > 0 else 0.0

    alerts = alert_service.generate_alerts(tasks)

    # Recent updates (sorted by updated_at or id)
    recent_tasks = sorted(
        tasks,
        key=lambda x: x.get("updated_at") or x.get("created_at") or "",
        reverse=True
    )[:6]

    return {
        "overview": {
            "total_tasks": total_tasks,
            "pending_tasks": pending_tasks,
            "in_progress_tasks": in_progress_tasks,
            "completed_tasks": completed_tasks,
            "blocked_tasks": blocked_tasks,
            "high_risk_count": len(high_risk_tasks),
            "avg_delay_probability": avg_delay_prob,
            "total_alerts": len(alerts),
            "critical_alerts": sum(1 for a in alerts if a.get("severity") == "CRITICAL")
        },
        "optimization_comparison": {
            "baseline_window_hours": baseline.total_window_hours,
            "optimized_window_hours": optimized.total_window_hours,
            "downtime_hours_saved": saved_hours,
            "downtime_reduction_percent": saved_percent,
            "bundled_windows_count": optimized.bundled_windows_count,
            "baseline_makespan": baseline.makespan_hours,
            "optimized_makespan": optimized.makespan_hours
        },
        "department_distribution": department_stats,
        "high_risk_tasks": [
            {
                "id": t["id"],
                "title": t["title"],
                "department": t["department"],
                "section": t["section"],
                "risk_level": t.get("risk_level"),
                "delay_probability": t.get("predicted_delay_probability"),
                "delay_factors": t.get("delay_factors", []),
                "priority": t.get("priority")
            }
            for t in high_risk_tasks
        ],
        "recent_tasks": recent_tasks,
        "is_simulated_synthetic": True
    }


@router.get("/dependency-graph")
def get_dependency_graph():
    """Returns nodes and edges for visualizing upstream and downstream task dependencies."""
    tasks = task_service.get_all_tasks()
    nodes = []
    edges = []
    
    for t in tasks:
        nodes.append({
            "id": t["id"],
            "title": t["title"],
            "department": t["department"],
            "section": t["section"],
            "status": t["status"],
            "priority": t["priority"],
            "risk_level": t.get("risk_level", "Low"),
            "delay_probability": t.get("predicted_delay_probability", 0.0),
            "planned_duration_hours": t.get("planned_duration_hours")
        })
        for dep in t.get("dependencies", []):
            edges.append({
                "from": dep,
                "to": t["id"],
                "label": "Prerequisite"
            })
            
    return {"nodes": nodes, "edges": edges}
