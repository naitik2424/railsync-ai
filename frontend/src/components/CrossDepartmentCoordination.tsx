import React, { useState } from 'react';
import {
  Network,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Link2,
  CheckCircle2,
  Clock,
  Layers,
  Activity,
  HardHat,
  Filter
} from 'lucide-react';
import { MaintenanceTask, OperationalAlert } from '../types';
import { RiskBadge } from './RiskBadge';

interface CrossDepartmentCoordinationProps {
  tasks: MaintenanceTask[];
  alerts: OperationalAlert[];
  isLoading: boolean;
  onSelectTask: (task: MaintenanceTask) => void;
}

export const CrossDepartmentCoordination: React.FC<CrossDepartmentCoordinationProps> = ({
  tasks,
  alerts,
  isLoading,
  onSelectTask,
}) => {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('All');
  const [selectedAlertSource, setSelectedAlertSource] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Evaluating cross-department dependency cascades...</p>
        </div>
      </div>
    );
  }

  // Filter alerts
  const filteredAlerts = alerts.filter((a) => {
    if (selectedSeverity !== 'All' && a.severity !== selectedSeverity) return false;
    return true;
  });

  // Calculate upstream and downstream dependencies for each task
  const taskMap: Record<string, MaintenanceTask> = {};
  tasks.forEach((t) => (taskMap[t.id] = t));

  const downstreamMap: Record<string, string[]> = {};
  tasks.forEach((t) => {
    t.dependencies.forEach((dep) => {
      downstreamMap[dep] = downstreamMap[dep] || [];
      downstreamMap[dep].push(t.id);
    });
  });

  // Blocked or waiting tasks
  const blockedTasks = tasks.filter((t) => {
    if (t.status === 'Blocked') return true;
    // Or has incomplete dependencies
    return t.dependencies.some((depId) => {
      const dep = taskMap[depId];
      return dep && dep.status !== 'Completed';
    });
  });

  const getAlertSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          card: 'bg-red-950/20 border-red-500/40 text-red-300',
          badge: 'bg-red-500/20 text-red-300 border-red-500/40',
          icon: <ShieldAlert className="w-4 h-4 text-red-400" />,
        };
      case 'WARNING':
        return {
          card: 'bg-amber-950/20 border-amber-500/40 text-amber-300',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
        };
      case 'SUCCESS':
        return {
          card: 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300',
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          icon: <Sparkles className="w-4 h-4 text-emerald-400" />,
        };
      case 'INFO':
      default:
        return {
          card: 'bg-blue-950/20 border-blue-500/40 text-blue-300',
          badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
          icon: <Activity className="w-4 h-4 text-blue-400" />,
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Shared Coordination Center
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {alerts.length} Active System Alerts
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1 m-0">
              Inter-Departmental Dependencies & Risk Cascades
            </h2>
            <p className="text-xs text-slate-400 mt-1 m-0">
              Coordinating Track, Electrical / OHE, S&T Signals, and Operations in real-time
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Filter Severity:</span>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="All">All Severities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="WARNING">Warnings</option>
              <option value="SUCCESS">Co-op Opportunities</option>
              <option value="INFO">Info / Holds</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: Left = Dynamic Alerts Feed, Right = Blocked Tasks & Dependencies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white m-0">
                Live Dynamic Operational Alerts ({filteredAlerts.length})
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">Derived from active telemetry & ML</span>
          </div>

          <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
            {filteredAlerts.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <span>No alerts matching the selected severity level.</span>
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const styles = getAlertSeverityStyles(alert.severity);
                return (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-xl border transition-all ${styles.card}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {styles.icon}
                        <span className="text-xs font-bold text-white">{alert.title}</span>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border uppercase ${styles.badge}`}
                      >
                        {alert.severity}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mt-2 leading-relaxed m-0">
                      {alert.message}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-800/80">
                      <span>Source: {alert.source_department} ({alert.source_task_id})</span>
                      {alert.impacted_task_ids.length > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400">Impacts:</span>
                          <span className="font-mono text-blue-400 font-bold">
                            {alert.impacted_task_ids.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Blocked Tasks & Precedence Matrix */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white m-0">
                Cross-Department Task Precedence Matrix
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">
              {blockedTasks.length} tasks currently constrained
            </span>
          </div>

          <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
            {tasks.map((task) => {
              const upstreamTasks = task.dependencies
                .map((depId) => taskMap[depId])
                .filter(Boolean);
              const downstreamIds = downstreamMap[task.id] || [];
              const downstreamTasks = downstreamIds
                .map((dId) => taskMap[dId])
                .filter(Boolean);

              const hasPrereqs = upstreamTasks.length > 0;
              const hasDownstream = downstreamTasks.length > 0;

              return (
                <div
                  key={task.id}
                  className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-2.5 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-400">
                        {task.id}
                      </span>
                      <span className="text-xs font-semibold text-slate-200">
                        {task.title}
                      </span>
                    </div>
                    <RiskBadge
                      level={task.risk_level}
                      probability={task.predicted_delay_probability}
                      size="sm"
                    />
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="text-slate-300 font-medium">{task.department}</span>
                    <span>•</span>
                    <span>{task.section}</span>
                    <span>•</span>
                    <span className="font-mono">{task.planned_duration_hours}h duration</span>
                  </div>

                  {/* Upstream Prerequisites */}
                  {hasPrereqs && (
                    <div className="p-2 rounded bg-slate-900/80 border border-slate-800 text-[11px] space-y-1">
                      <span className="text-slate-400 font-medium block">
                        ⬅️ Upstream Prerequisites (Must finish first):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {upstreamTasks.map((up) => (
                          <span
                            key={up.id}
                            className={`px-2 py-0.5 rounded font-mono text-[10px] border ${
                              up.status === 'Completed'
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {up.id}: {up.title} [{up.status}]
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Downstream Impact */}
                  {hasDownstream && (
                    <div className="p-2 rounded bg-slate-900/80 border border-slate-800 text-[11px] space-y-1">
                      <span className="text-slate-400 font-medium block">
                        ➡️ Downstream Tasks (Blocked if this delays):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {downstreamTasks.map((down) => (
                          <span
                            key={down.id}
                            className="px-2 py-0.5 rounded font-mono text-[10px] bg-blue-500/15 text-blue-300 border border-blue-500/30"
                          >
                            {down.id} ({down.department})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
