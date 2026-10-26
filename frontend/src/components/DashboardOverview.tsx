import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts';
import {
  AlertTriangle,
  Clock,
  TrendingDown,
  CheckCircle2,
  Calendar,
  Zap,
  ArrowRight,
  ShieldCheck,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { DashboardSummary } from '../types';
import { RiskBadge } from './RiskBadge';

interface DashboardOverviewProps {
  summary: DashboardSummary | null;
  isLoading: boolean;
  onNavigateTab: (tab: any) => void;
  onRunSimulationQuick: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  summary,
  isLoading,
  onNavigateTab,
  onRunSimulationQuick,
}) => {
  if (isLoading || !summary) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Aggregating railway network telemetry & ML predictions...</p>
        </div>
      </div>
    );
  }

  const { overview, optimization_comparison, department_distribution, high_risk_tasks, recent_tasks } = summary;

  // Chart data for Baseline vs Optimized
  const durationComparisonData = [
    {
      metric: 'Window Possession',
      Baseline: optimization_comparison.baseline_window_hours,
      Optimized: optimization_comparison.optimized_window_hours,
    },
    {
      metric: 'Overall Makespan',
      Baseline: optimization_comparison.baseline_makespan,
      Optimized: optimization_comparison.optimized_makespan,
    },
  ];

  // Department distribution chart data
  const deptChartData = department_distribution.map((d) => ({
    name: d.department.replace('Signalling & Telecommunications (S&T)', 'S&T').replace('Electrical / OHE', 'OHE'),
    Total: d.total_tasks,
    HighRisk: d.high_risk_tasks,
    Pending: d.pending,
    Completed: d.completed,
  }));

  const deptColors: Record<string, string> = {
    Track: '#f97316',
    'Electrical / OHE': '#eab308',
    'Signalling & Telecommunications (S&T)': '#06b6d4',
    'Railway Operations': '#8b5cf6',
  };

  return (
    <div className="space-y-6">
      {/* Simulation banner disclaimer */}
      <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-xs text-blue-200">
          <Info className="w-4 h-4 text-blue-400 shrink-0" />
          <span>
            <strong>Simulated Operational Environment:</strong> Delay predictions are synthesized via Random Forest trained on realistic railway maintenance features. Schedules are computed using Google OR-Tools CP-SAT solver.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigateTab('optimizer')}
            className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <span>View Solver</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tasks */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Tasks</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-white">{overview.total_tasks}</span>
            <span className="text-xs text-slate-400 font-mono">
              ({overview.pending_tasks} pending, {overview.completed_tasks} done)
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Multi-department coverage</span>
          </div>
        </div>

        {/* High-Risk Tasks */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">High Risk Tasks</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-amber-400">{overview.high_risk_count}</span>
            <span className="text-xs text-slate-400 font-mono">predicted delays</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-300 font-medium">
            <span>Avg Risk: {Math.round(overview.avg_delay_probability * 100)}% probability</span>
          </div>
        </div>

        {/* Downtime Hours Saved */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Downtime Saved</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-emerald-400">
              {optimization_comparison.downtime_hours_saved}h
            </span>
            <span className="text-xs text-emerald-300 font-semibold">
              (-{optimization_comparison.downtime_reduction_percent}%)
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-300 font-medium">
            <span>Via OR-Tools CP-SAT bundling</span>
          </div>
        </div>

        {/* Bundled Windows */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Coordinated Blocks</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-purple-300">
              {optimization_comparison.bundled_windows_count}
            </span>
            <span className="text-xs text-slate-400 font-mono">shared track windows</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-purple-400 font-medium">
            <span>Zero safety violations</span>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Baseline vs Optimized Window Duration Chart */}
        <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white m-0">Baseline vs. Optimized Window Hours</h2>
              <p className="text-xs text-slate-400 m-0 mt-0.5">
                Comparison of siloed sequential possessions vs CP-SAT coordinated track windows
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
              {optimization_comparison.downtime_hours_saved}h Saved
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={durationComparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="metric" stroke="#64748b" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 12, fill: '#94a3b8' }} unit="h" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                  }}
                  formatter={(val: any) => [`${val} hours`, '']}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="Baseline" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Baseline (Siloed)" />
                <Bar dataKey="Optimized" fill="#3b82f6" radius={[4, 4, 0, 0]} name="OR-Tools Optimized" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
            <span>Baseline: {optimization_comparison.baseline_window_hours}h total closure</span>
            <span className="text-emerald-400 font-semibold">
              Optimized: {optimization_comparison.optimized_window_hours}h (-{optimization_comparison.downtime_reduction_percent}%)
            </span>
          </div>
        </div>

        {/* Department-wise Distribution Chart */}
        <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white m-0">Department-wise Maintenance Load</h2>
              <p className="text-xs text-slate-400 m-0 mt-0.5">
                Task volume and pending work across railway engineering divisions
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('tasks')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
            >
              <span>Manage Tasks</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="Total" fill="#6366f1" radius={[4, 4, 0, 0]} name="Total Tasks" />
                <Bar dataKey="Pending" fill="#38bdf8" radius={[4, 4, 0, 0]} name="Pending" />
                <Bar dataKey="HighRisk" fill="#f59e0b" radius={[4, 4, 0, 0]} name="High Risk Delay" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
            <span>4 Departments Integrated</span>
            <span className="text-slate-300 font-medium">Track • Electrical • S&T • Operations</span>
          </div>
        </div>
      </div>

      {/* High-Risk Tasks Watchlist & Recent Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* High Risk Tasks Watchlist (2 cols) */}
        <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700/60 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white m-0 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>ML Predicted High-Risk Tasks Watchlist</span>
              </h2>
              <p className="text-xs text-slate-400 m-0 mt-0.5">
                Tasks flagged by Random Forest classifier for high delay probability
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('ml')}
              className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1"
            >
              <span>Inspect ML Pipeline</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {high_risk_tasks.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <span>No high-risk delays currently flagged. All active tasks within nominal variance.</span>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {high_risk_tasks.map((task) => (
                <div key={task.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-400">{task.id}</span>
                      <span className="text-sm font-semibold text-slate-200">{task.title}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="text-slate-300 font-medium">{task.department}</span>
                      <span>•</span>
                      <span>{task.section}</span>
                    </div>
                    {task.delay_factors && task.delay_factors.length > 0 && (
                      <p className="text-xs text-amber-300/80 m-0 pt-0.5">
                        ⚠️ {task.delay_factors[0]}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <RiskBadge level={task.risk_level} probability={task.delay_probability} />
                    <button
                      onClick={() => onNavigateTab('coordination')}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                    >
                      Mitigate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Operational Actions (1 col) */}
        <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-base font-bold text-white m-0">Operational Actions</h2>
            <p className="text-xs text-slate-400 m-0">
              Execute cross-functional railway maintenance coordination workflows
            </p>

            <div className="space-y-2.5">
              <button
                onClick={() => onNavigateTab('optimizer')}
                className="w-full text-left p-3 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-semibold text-blue-300">Run Schedule Optimizer</div>
                  <div className="text-[11px] text-slate-400">Google OR-Tools CP-SAT bundling</div>
                </div>
                <ArrowRight className="w-4 h-4 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={onRunSimulationQuick}
                className="w-full text-left p-3 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-semibold text-amber-300">Simulate Operational Disruption</div>
                  <div className="text-[11px] text-slate-400">Equipment or crew failure what-if</div>
                </div>
                <Zap className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              </button>

              <button
                onClick={() => onNavigateTab('coordination')}
                className="w-full text-left p-3 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-semibold text-purple-300">Cross-Department Alerts</div>
                  <div className="text-[11px] text-slate-400">{overview.total_alerts} active cascade warnings</div>
                </div>
                <ArrowRight className="w-4 h-4 text-purple-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/40 text-[11px] text-slate-400 space-y-1">
            <span className="font-semibold text-slate-300 block">System Health Note:</span>
            <span>All hard constraints strictly verified: Precedence order, single-use equipment mutual exclusion, and safety section non-overlap.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
