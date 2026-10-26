from typing import List, Dict, Any
from backend.app.services.task_service import task_service


class AlertService:
    @staticmethod
    def generate_alerts(tasks: List[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Dynamically analyzes tasks, dependency topologies, and ML delay probabilities
        to generate actionable cross-department operational alerts.
        """
        if tasks is None:
            tasks = task_service.get_all_tasks()
            
        alerts = []
        task_map = {t["id"]: t for t in tasks}
        
        # Build downstream dependencies map
        downstream_map: Dict[str, List[str]] = {}
        for t in tasks:
            for dep in t.get("dependencies", []):
                downstream_map.setdefault(dep, []).append(t["id"])
                
        # 1. Delay Cascade Alerts (High-Risk Upstream Task impacting Downstream)
        for t in tasks:
            prob = t.get("predicted_delay_probability", 0.0)
            t_id = t["id"]
            downstream = downstream_map.get(t_id, [])
            
            if prob >= 0.55 and downstream:
                impacted_titles = [f"{d} ({task_map[d].get('department', 'Dept')})" for d in downstream if d in task_map]
                alerts.append({
                    "id": f"ALT-CAS-{t_id}",
                    "type": "cascade_risk",
                    "severity": "CRITICAL" if prob >= 0.75 else "WARNING",
                    "source_task_id": t_id,
                    "source_task_title": t.get("title", ""),
                    "source_department": t.get("department", ""),
                    "impacted_task_ids": downstream,
                    "title": f"Predicted Delay Cascade on {t_id}",
                    "message": (
                        f"{t['department']} task {t_id} has a {int(prob*100)}% predicted delay probability. "
                        f"This directly threatens downstream work: {', '.join(impacted_titles)}. "
                        f"Coordinate schedule buffer or pre-deploy standby crew."
                    ),
                    "created_at": t.get("updated_at")
                })
                
        # 2. Blocked Task Alerts
        for t in tasks:
            deps = t.get("dependencies", [])
            for dep_id in deps:
                dep_task = task_map.get(dep_id)
                if dep_task and dep_task.get("status") in ["Pending", "In Progress", "Blocked"]:
                    alerts.append({
                        "id": f"ALT-BLK-{t['id']}-{dep_id}",
                        "type": "dependency_hold",
                        "severity": "INFO" if dep_task.get("status") == "In Progress" else "WARNING",
                        "source_task_id": t["id"],
                        "source_task_title": t.get("title", ""),
                        "source_department": t.get("department", ""),
                        "impacted_task_ids": [dep_id],
                        "title": f"Task {t['id']} Waiting on {dep_id}",
                        "message": (
                            f"{t['department']} task '{t.get('title')}' is held pending completion of "
                            f"{dep_task.get('department')} task {dep_id} ('{dep_task.get('title')}')."
                        ),
                        "created_at": t.get("updated_at")
                    })

        # 3. Co-Scheduling Opportunity Alerts
        # When two different departments have compatible tasks on the same section
        sections: Dict[str, List[Dict[str, Any]]] = {}
        for t in tasks:
            if t.get("status") != "Completed":
                sections.setdefault(t.get("section", "Default"), []).append(t)
                
        checked_pairs = set()
        for sec, sec_tasks in sections.items():
            for i in range(len(sec_tasks)):
                for j in range(i + 1, len(sec_tasks)):
                    t1, t2 = sec_tasks[i], sec_tasks[j]
                    if t1.get("department") != t2.get("department"):
                        pair_key = tuple(sorted([t1["id"], t2["id"]]))
                        if pair_key in checked_pairs:
                            continue
                        checked_pairs.add(pair_key)
                        
                        m1, m2 = t1.get("maintenance_type", ""), t2.get("maintenance_type", "")
                        comp1 = t1.get("compatible_with_simultaneous_types", [])
                        comp2 = t2.get("compatible_with_simultaneous_types", [])
                        
                        if m2 in comp1 and m1 in comp2:
                            saved_window = min(float(t1.get("planned_duration_hours", 0)), float(t2.get("planned_duration_hours", 0)))
                            alerts.append({
                                "id": f"ALT-COOP-{t1['id']}-{t2['id']}",
                                "type": "co_scheduling_opportunity",
                                "severity": "SUCCESS",
                                "source_task_id": t1["id"],
                                "source_task_title": t1.get("title", ""),
                                "source_department": t1.get("department", ""),
                                "impacted_task_ids": [t1["id"], t2["id"]],
                                "title": f"Multi-Department Track Window Bundling Opportunity ({sec})",
                                "message": (
                                    f"{t1.get('department')} and {t2.get('department')} both require access to {sec}. "
                                    f"Tasks {t1['id']} and {t2['id']} are safe for concurrent execution, saving ~{saved_window}h of track block downtime."
                                ),
                                "created_at": t1.get("updated_at")
                            })

        # 4. Resource Shortage Alerts
        for t in tasks:
            ratio = t.get("crew_availability_ratio", 1.0)
            if ratio < 0.85:
                shortage = int((1.0 - ratio) * 100)
                alerts.append({
                    "id": f"ALT-RES-{t['id']}",
                    "type": "resource_shortage",
                    "severity": "CRITICAL" if ratio < 0.65 else "WARNING",
                    "source_task_id": t["id"],
                    "source_task_title": t.get("title", ""),
                    "source_department": t.get("department", ""),
                    "impacted_task_ids": [],
                    "title": f"Staffing Deficit: {t.get('department')} ({t['id']})",
                    "message": (
                        f"Task {t['id']} reports a {shortage}% crew deficit. "
                        f"Allocated crew cannot maintain normal execution pace. High risk of maintenance overrun."
                    ),
                    "created_at": t.get("updated_at")
                })

        return alerts


alert_service = AlertService()
