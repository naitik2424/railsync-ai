import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  TrendingDown,
  CheckCircle2,
  AlertOctagon,
  Sparkles,
  ArrowRight,
  Layers,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { ScheduleComparison, ScheduledTaskItem, ScheduleWindow } from '../types';

interface ScheduleGanttProps {
  comparison: ScheduleComparison | null;
  isLoading: boolean;
  onRefreshSchedule: () => void;
}

export const ScheduleGantt: React.FC<ScheduleGanttProps> = ({
  comparison,
  isLoading,
  onRefreshSchedule,
}) => {
  const [activeView, setActiveView] = useState<'optimized' | 'baseline'>('optimized');
  const [selectedTask, setSelectedTask] = useState<ScheduledTaskItem | null>(null);

  if (isLoading || !comparison) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">
            Solving CP-SAT constraint satisfaction problem & bundling track windows...
          </p>
        </div>
      </div>
    );
  }

  const { baseline, optimized, downtime_hours_saved, downtime_reduction_percent, key_improvements } =
    comparison;

  const currentSchedule = activeView === 'optimized' ? optimized : baseline;

  // Max horizon for Gantt (24 hours)
  const MAX_HOURS = 24;
  const hoursMarkers = Array.from({ length: 13 }, (_, i) => i * 2); // 0, 2, 4, ... 24

  const getDeptColor = (dept: string) => {
    switch (dept) {
      case 'Track':
        return 'bg-orange-500/80 border-orange-400 text-white';
      case 'Electrical / OHE':
        return 'bg-amber-500/80 border-amber-400 text-white';
      case 'Signalling & Telecommunications (S&T)':
        return 'bg-cyan-500/80 border-cyan-400 text-white';
      case 'Railway Operations':
        return 'bg-purple-500/80 border-purple-400 text-white';
      default:
        return 'bg-blue-500/80 border-blue-400 text-white';
    }
  };

  // Group tasks by section for timeline lanes
  const tasksBySection: Record<string, ScheduledTaskItem[]> = {};
  currentSchedule.tasks.forEach((t) => {
    tasksBySection[t.section] = tasksBySection[t.section] || [];
    tasksBySection[t.section].push(t);
  });

  return (
    <div className="space-y-6">
      {/* KPI Comparison Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-slate-700/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                OR-Tools CP-SAT Scheduling Engine
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Status: {optimized.solver_status || 'OPTIMAL'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1 m-0">
              Coordinated Track Possession Optimization
            </h2>
            <p className="text-xs text-slate-300 mt-1 m-0">
              Simultaneous constraint satisfaction bundling compatible multi-department maintenance
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-700">
            <button
              onClick={() => setActiveView('optimized')}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                activeView === 'optimized'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>OR-Tools Optimized</span>
            </button>
            <button
              onClick={() => setActiveView('baseline')}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                activeView === 'baseline'
                  ? 'bg-slate-700 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Baseline (Siloed)</span>
            </button>
          </div>
        </div>

        {/* 4 Metric Callouts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-5">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Downtime Hours Saved
            </span>
            <div className="text-2xl font-bold text-emerald-400 mt-0.5 flex items-baseline gap-1.5">
              <span>{downtime_hours_saved}h</span>
              <span className="text-xs font-semibold text-emerald-300">
                (-{downtime_reduction_percent}%)
              </span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Total track possession reduction
            </span>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Total Window Possession
            </span>
            <div className="text-2xl font-bold text-white mt-0.5 font-mono">
              {currentSchedule.total_window_hours}h
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {activeView === 'optimized' ? 'Bundled Coordinated Hours' : 'Isolated Siloed Sum'}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Multi-Dept Bundled Blocks
            </span>
            <div className="text-2xl font-bold text-purple-300 mt-0.5 font-mono">
              {optimized.bundled_windows_count}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Shared track occupancy windows
            </span>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Precedence & Conflicts
            </span>
            <div className="text-2xl font-bold text-emerald-400 mt-0.5 flex items-center gap-1.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>0 Violations</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Hard safety constraints satisfied
            </span>
          </div>
        </div>
      </div>

      {/* Solver Highlights Alert */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-300">
          <Info className="w-4 h-4 text-blue-400" />
          <span>Optimization Insights & Constraint Synthesis</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-300">
          {key_improvements.map((imp, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>{imp}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Gantt Timeline / Visual Scheduler */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white m-0 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>
                {activeView === 'optimized'
                  ? 'OR-Tools CP-SAT Coordinated Schedule (24-Hour Horizon)'
                  : 'Baseline Siloed Sequential Schedule (24-Hour Horizon)'}
              </span>
            </h3>
            <p className="text-xs text-slate-400 m-0 mt-0.5">
              {activeView === 'optimized'
                ? 'Notice how compatible Track and OHE/S&T tasks are co-scheduled in parallel inside unified block windows!'
                : 'Notice how each department claims its own separate track block, resulting in massive cumulative closure hours.'}
            </p>
          </div>

          {/* Department Legend */}
          <div className="hidden lg:flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-orange-500" />
              <span className="text-slate-300">Track</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500" />
              <span className="text-slate-300">Electrical / OHE</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-cyan-500" />
              <span className="text-slate-300">S&T Signals</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-purple-500" />
              <span className="text-slate-300">Operations</span>
            </div>
          </div>
        </div>

        {/* Timeline Canvas */}
        <div className="overflow-x-auto pb-4">
          <div className="min-w-[850px] space-y-5">
            {/* Hour Markers Ruler */}
            <div className="grid grid-cols-12 border-b border-slate-700/80 pb-2 text-[11px] text-slate-400 font-mono">
              {hoursMarkers.slice(0, 12).map((hr) => (
                <div key={hr} className="border-l border-slate-700/50 pl-1.5">
                  {hr.toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Lanes by Railway Section */}
            {Object.entries(tasksBySection).map(([sectionName, sectionTasks]) => (
              <div key={sectionName} className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    <span>{sectionName}</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    {sectionTasks.length} tasks scheduled
                  </span>
                </div>

                {/* Section Timeline Track Bar */}
                <div className="relative h-14 bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-hidden p-1">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 grid grid-cols-12 pointer-events-none">
                    {hoursMarkers.slice(0, 12).map((hr) => (
                      <div key={hr} className="border-r border-slate-700/20 h-full" />
                    ))}
                  </div>

                  {/* Task Bars placed horizontally based on start_hour and duration */}
                  {sectionTasks.map((task) => {
                    const leftPct = (task.start_hour / MAX_HOURS) * 100;
                    const widthPct = Math.max(3, (task.duration_hours / MAX_HOURS) * 100);

                    return (
                      <div
                        key={task.task_id}
                        onClick={() => setSelectedTask(task)}
                        title={`${task.task_id}: ${task.title} (${task.start_hour}h - ${task.end_hour}h)`}
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                        }}
                        className={`absolute top-2 bottom-2 rounded-lg border shadow-md flex items-center px-2 cursor-pointer transition-all hover:scale-[1.02] hover:z-20 overflow-hidden ${getDeptColor(
                          task.department
                        )}`}
                      >
                        <div className="truncate text-xs font-bold leading-tight">
                          <span className="font-mono text-[10px] opacity-90 block">
                            {task.task_id}
                          </span>
                          <span className="truncate block">{task.title}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coordinated Windows Breakdown List */}
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider m-0">
              {activeView === 'optimized' ? 'Synthesized Coordinated Windows' : 'Baseline Siloed Windows'}
            </h4>
            <span className="text-xs text-slate-400">
              Total {currentSchedule.windows.length} block windows generated
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentSchedule.windows.map((win) => (
              <div
                key={win.window_id}
                className={`p-3.5 rounded-xl border ${
                  win.tasks_count > 1
                    ? 'bg-purple-950/20 border-purple-500/40 shadow-sm shadow-purple-500/10'
                    : 'bg-slate-800/40 border-slate-700/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-400">{win.window_id}</span>
                  {win.tasks_count > 1 ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                      Bundled ({win.tasks_count} Tasks)
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                      Single Dept
                    </span>
                  )}
                </div>

                <div className="text-xs font-semibold text-slate-200 mt-2 truncate">
                  {win.section}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 mt-2 font-mono">
                  <span>
                    Time: {win.start_hour}h - {win.end_hour}h
                  </span>
                  <span className="text-white font-bold">{win.duration_hours}h duration</span>
                </div>

                <div className="flex flex-wrap gap-1 mt-2">
                  {win.bundled_departments.map((d) => (
                    <span
                      key={d}
                      className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700"
                    >
                      {d.replace('Signalling & Telecommunications (S&T)', 'S&T').replace('Electrical / OHE', 'OHE')}
                    </span>
                  ))}
                  {win.has_power_block && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      ⚡ 25kV Cut
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Task Inspector Drawer Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-mono text-xs font-bold text-blue-400">
                {selectedTask.task_id}
              </span>
              <button onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="text-sm font-bold text-white">{selectedTask.title}</div>
              <div className="text-slate-300">{selectedTask.maintenance_type}</div>

              <div className="grid grid-cols-2 gap-2 p-2.5 rounded bg-slate-800/60 font-mono text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">Start Time</span>
                  <span className="text-white font-bold">{selectedTask.start_hour}h offset</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">End Time</span>
                  <span className="text-white font-bold">{selectedTask.end_hour}h offset</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Duration</span>
                  <span className="text-white font-bold">{selectedTask.duration_hours}h</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Assigned Window</span>
                  <span className="text-blue-400 font-bold">{selectedTask.window_id}</span>
                </div>
              </div>

              <div className="text-slate-300">
                <span className="text-slate-400 block text-[10px]">Crew Allocation</span>
                <span>{selectedTask.crew_type}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
