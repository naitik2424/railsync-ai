import { MaintenanceTask } from '../contracts/schemas.js';

export interface OperationalAlert {
  id: string;
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
  source_task_id: string;
  source_task_title: string;
  source_department: string;
  impacted_task_ids: string[];
  title: string;
  message: string;
  created_at?: string;
}

export class AlertService {
  static generateAlerts(tasks: MaintenanceTask[]): OperationalAlert[] {
    const alerts: OperationalAlert[] = [];
    const taskMap = new Map<string, MaintenanceTask>();
    tasks.forEach((t) => taskMap.set(t.id, t));

    // Downstream dependencies mapping
    const downstreamMap = new Map<string, string[]>();
    for (const t of tasks) {
      for (const dep of t.dependencies || []) {
        const list = downstreamMap.get(dep) || [];
        list.push(t.id);
        downstreamMap.set(dep, list);
      }
    }

    // 1. Delay Cascade Alerts
    for (const t of tasks) {
      const prob = t.predicted_delay_probability ?? 0.0;
      const downstream = downstreamMap.get(t.id) || [];

      if (prob >= 0.55 && downstream.length > 0) {
        const impactedTitles = downstream
          .map((d) => {
            const dt = taskMap.get(d);
            return dt ? `${d} (${dt.department})` : d;
          })
          .join(', ');

        alerts.push({
          id: `ALT-CAS-${t.id}`,
          type: 'cascade_risk',
          severity: prob >= 0.75 ? 'CRITICAL' : 'WARNING',
          source_task_id: t.id,
          source_task_title: t.title,
          source_department: t.department,
          impacted_task_ids: downstream,
          title: `Predicted Delay Cascade on ${t.id}`,
          message: `${t.department} task ${t.id} has a ${Math.round(prob * 100)}% predicted delay probability. This directly threatens downstream work: ${impactedTitles}. Coordinate schedule buffer or pre-deploy standby crew.`,
          created_at: t.updated_at || t.created_at || new Date().toISOString(),
        });
      }
    }

    // 2. Blocked Task Alerts
    for (const t of tasks) {
      for (const depId of t.dependencies || []) {
        const depTask = taskMap.get(depId);
        if (depTask && ['Pending', 'In Progress', 'Blocked'].includes(depTask.status)) {
          alerts.push({
            id: `ALT-BLK-${t.id}-${depId}`,
            type: 'dependency_hold',
            severity: depTask.status === 'In Progress' ? 'INFO' : 'WARNING',
            source_task_id: t.id,
            source_task_title: t.title,
            source_department: t.department,
            impacted_task_ids: [depId],
            title: `Task ${t.id} Waiting on ${depId}`,
            message: `${t.department} task '${t.title}' is held pending completion of ${depTask.department} task ${depId} ('${depTask.title}').`,
            created_at: t.updated_at || t.created_at || new Date().toISOString(),
          });
        }
      }
    }

    // 3. Co-Scheduling Opportunity Alerts
    const sections = new Map<string, MaintenanceTask[]>();
    for (const t of tasks) {
      if (t.status !== 'Completed') {
        const list = sections.get(t.section) || [];
        list.push(t);
        sections.set(t.section, list);
      }
    }

    const checkedPairs = new Set<string>();
    for (const [sec, secTasks] of sections.entries()) {
      for (let i = 0; i < secTasks.length; i++) {
        for (let j = i + 1; j < secTasks.length; j++) {
          const t1 = secTasks[i];
          const t2 = secTasks[j];

          if (t1.department !== t2.department) {
            const pairKey = [t1.id, t2.id].sort().join(':');
            if (checkedPairs.has(pairKey)) continue;
            checkedPairs.add(pairKey);

            const comp1 = t1.compatible_with_simultaneous_types || [];
            const comp2 = t2.compatible_with_simultaneous_types || [];

            if (comp1.includes(t2.maintenance_type) && comp2.includes(t1.maintenance_type)) {
              const savedHrs = Math.min(t1.planned_duration_hours, t2.planned_duration_hours);
              alerts.push({
                id: `ALT-COOP-${t1.id}-${t2.id}`,
                type: 'co_scheduling_opportunity',
                severity: 'SUCCESS',
                source_task_id: t1.id,
                source_task_title: t1.title,
                source_department: t1.department,
                impacted_task_ids: [t1.id, t2.id],
                title: `Multi-Department Track Window Bundling Opportunity (${sec})`,
                message: `${t1.department} and ${t2.department} both require access to ${sec}. Tasks ${t1.id} and ${t2.id} are safe for concurrent execution, saving ~${savedHrs}h of track block downtime.`,
                created_at: t1.updated_at || t1.created_at || new Date().toISOString(),
              });
            }
          }
        }
      }
    }

    // 4. Resource Shortage Alerts
    for (const t of tasks) {
      const ratio = t.crew_availability_ratio ?? 1.0;
      if (ratio < 0.85) {
        const deficit = Math.round((1.0 - ratio) * 100);
        alerts.push({
          id: `ALT-RES-${t.id}`,
          type: 'resource_shortage',
          severity: ratio < 0.65 ? 'CRITICAL' : 'WARNING',
          source_task_id: t.id,
          source_task_title: t.title,
          source_department: t.department,
          impacted_task_ids: [],
          title: `Staffing Deficit: ${t.department} (${t.id})`,
          message: `Task ${t.id} reports a ${deficit}% crew deficit. Allocated crew cannot maintain normal execution pace. High risk of maintenance overrun.`,
          created_at: t.updated_at || t.created_at || new Date().toISOString(),
        });
      }
    }

    return alerts;
  }
}
