import React from 'react';
import { Activity, Clock, RefreshCw, Cpu, TrainTrack, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  onResetData: () => void;
  isResetting: boolean;
  activeSimulationTitle?: string;
  onClearSimulation?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onResetData,
  isResetting,
  activeSimulationTitle,
  onClearSimulation,
}) => {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
          <TrainTrack className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-white m-0">RailSync AI</h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
              OR-Tools + Random Forest
            </span>
          </div>
          <p className="text-xs text-slate-400 m-0">
            Railway Maintenance Coordination & Downtime Optimization
          </p>
        </div>
      </div>

      {/* Center status info */}
      <div className="hidden lg:flex items-center gap-6 text-xs text-slate-300">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-slate-400">Shift Window:</span>
          <span className="font-mono font-medium text-slate-200">04:00 - 12:00 IST (Day Block)</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
          <Cpu className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-400">Solver Engine:</span>
          <span className="font-medium text-emerald-300">CP-SAT Active</span>
        </div>

        {activeSimulationTitle && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 animate-pulse">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-xs">Simulating: {activeSimulationTitle}</span>
            {onClearSimulation && (
              <button
                onClick={onClearSimulation}
                className="ml-1 text-[11px] underline hover:text-white"
              >
                Reset
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/60 px-2.5 py-1 rounded-full border border-slate-700/50">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-slate-300">Simulated MVP</span>
        </span>

        <button
          onClick={onResetData}
          disabled={isResetting}
          title="Reset to initial sample tasks"
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          <span>Reset Sample Tasks</span>
        </button>
      </div>
    </header>
  );
};
