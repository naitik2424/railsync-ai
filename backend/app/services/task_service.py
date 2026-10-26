import json
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from pathlib import Path

from backend.app.core.config import ACTIVE_TASKS_FILE
from backend.app.models.task import MaintenanceTask, TaskCreate, TaskUpdate
from backend.app.ml.synthetic_data import generate_active_tasks
from backend.app.ml.predict import predict_delay_for_task


class TaskService:
    def __init__(self):
        self._tasks: Dict[str, Dict[str, Any]] = {}
        self._initialized = False

    def initialize(self):
        if self._initialized:
            return
            
        if not ACTIVE_TASKS_FILE.exists():
            ACTIVE_TASKS_FILE.parent.mkdir(parents=True, exist_ok=True)
            tasks = generate_active_tasks()
            with open(ACTIVE_TASKS_FILE, "w", encoding="utf-8") as f:
                json.dump(tasks, f, indent=2)
                
        with open(ACTIVE_TASKS_FILE, "r", encoding="utf-8") as f:
            tasks_list = json.load(f)
            
        self._tasks = {t["id"]: t for t in tasks_list}
        
        # Enrich all tasks with real ML predictions
        self._enrich_with_ml_predictions()
        self._initialized = True

    def _persist(self):
        ACTIVE_TASKS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(ACTIVE_TASKS_FILE, "w", encoding="utf-8") as f:
            json.dump(list(self._tasks.values()), f, indent=2)

    def _enrich_with_ml_predictions(self):
        for task_id, task in self._tasks.items():
            if task.get("status") != "Completed":
                try:
                    pred = predict_delay_for_task(task)
                    task["predicted_delay_probability"] = pred["delay_probability"]
                    task["risk_level"] = pred["risk_level"]
                    task["delay_factors"] = pred["top_risk_factors"]
                except Exception as e:
                    task["predicted_delay_probability"] = 0.25
                    task["risk_level"] = "Low"
                    task["delay_factors"] = [f"Default risk profile ({str(e)})"]

    def get_all_tasks(self, department: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
        self.initialize()
        tasks = list(self._tasks.values())
        if department:
            tasks = [t for t in tasks if t.get("department") == department]
        if status:
            tasks = [t for t in tasks if t.get("status") == status]
        return tasks

    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        self.initialize()
        return self._tasks.get(task_id)

    def create_task(self, task_data: TaskCreate) -> Dict[str, Any]:
        self.initialize()
        # Generate custom id
        dept_prefix = {
            "Track": "TRK",
            "Electrical / OHE": "OHE",
            "Signalling & Telecommunications (S&T)": "SNT",
            "Railway Operations": "OPS"
        }.get(task_data.department.value if hasattr(task_data.department, 'value') else str(task_data.department), "GEN")
        
        task_id = f"TSK-{dept_prefix}-{len(self._tasks) + 101}"
        
        now_str = datetime.now(timezone.utc).isoformat()
        new_task = task_data.model_dump()
        new_task["id"] = task_id
        new_task["status"] = "Pending"
        new_task["crew_availability_ratio"] = 1.0
        new_task["equipment_available"] = True
        new_task["created_at"] = now_str
        new_task["updated_at"] = now_str
        
        # ML prediction
        try:
            pred = predict_delay_for_task(new_task)
            new_task["predicted_delay_probability"] = pred["delay_probability"]
            new_task["risk_level"] = pred["risk_level"]
            new_task["delay_factors"] = pred["top_risk_factors"]
        except Exception:
            new_task["predicted_delay_probability"] = 0.25
            new_task["risk_level"] = "Low"
            new_task["delay_factors"] = ["Standard risk assessment"]
            
        self._tasks[task_id] = new_task
        self._persist()
        return new_task

    def update_task(self, task_id: str, update_data: TaskUpdate) -> Optional[Dict[str, Any]]:
        self.initialize()
        if task_id not in self._tasks:
            return None
            
        task = self._tasks[task_id]
        updates = update_data.model_dump(exclude_unset=True)
        
        # Update nested or top-level fields
        for k, v in updates.items():
            if v is not None:
                task[k] = v
                
        task["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # Re-run ML prediction if relevant operational features changed
        if task.get("status") != "Completed":
            pred = predict_delay_for_task(task)
            task["predicted_delay_probability"] = pred["delay_probability"]
            task["risk_level"] = pred["risk_level"]
            task["delay_factors"] = pred["top_risk_factors"]
            
        self._persist()
        return task

    def delete_task(self, task_id: str) -> bool:
        self.initialize()
        if task_id in self._tasks:
            del self._tasks[task_id]
            # Remove from dependencies of other tasks
            for t in self._tasks.values():
                if task_id in t.get("dependencies", []):
                    t["dependencies"].remove(task_id)
            self._persist()
            return True
        return False

    def reset_tasks(self) -> List[Dict[str, Any]]:
        """Resets active tasks back to the deterministic initial sample set."""
        tasks = generate_active_tasks()
        self._tasks = {t["id"]: t for t in tasks}
        self._enrich_with_ml_predictions()
        self._persist()
        return list(self._tasks.values())


# Singleton instance
task_service = TaskService()
