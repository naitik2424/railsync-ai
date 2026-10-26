from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from backend.app.models.task import MaintenanceTask, TaskCreate, TaskUpdate
from backend.app.services.task_service import task_service

router = APIRouter(prefix="/tasks", tags=["Maintenance Tasks"])


@router.get("", response_model=List[MaintenanceTask])
def get_tasks(
    department: Optional[str] = Query(None, description="Filter by department"),
    status: Optional[str] = Query(None, description="Filter by status")
):
    """Retrieve all maintenance tasks across all railway departments."""
    return task_service.get_all_tasks(department=department, status=status)


@router.get("/{task_id}", response_model=MaintenanceTask)
def get_task(task_id: str):
    """Retrieve single maintenance task by unique ID."""
    task = task_service.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    return task


@router.post("", response_model=MaintenanceTask, status_code=201)
def create_task(task_in: TaskCreate):
    """Create a new maintenance task and immediately compute ML delay prediction."""
    return task_service.create_task(task_in)


@router.patch("/{task_id}", response_model=MaintenanceTask)
def update_task(task_id: str, task_update: TaskUpdate):
    """Update task details, status, duration, crew or dependencies."""
    updated = task_service.update_task(task_id, task_update)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    return updated


@router.delete("/{task_id}")
def delete_task(task_id: str):
    """Delete a task and clean up dependent references."""
    success = task_service.delete_task(task_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    return {"message": f"Task {task_id} deleted successfully"}


@router.post("/reset-sample-data", response_model=List[MaintenanceTask])
def reset_sample_data():
    """Reset active tasks to the baseline sample dataset across all 4 departments."""
    return task_service.reset_tasks()
