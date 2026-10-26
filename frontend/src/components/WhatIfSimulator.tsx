import React, { useState, useEffect } from 'react';
import {
  Zap,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowRight,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Cpu
} from 'lucide-react';
import {
  WhatIfScenario,
  WhatIfResponse,
  WhatIfRequest,
  MaintenanceTask
} from '../types';
import { api } from '../services/api';
import { RiskBadge } from './RiskBadge';

interface WhatIfSimulatorProps {
  tasks: MaintenanceTask[];
  onSimulationApplied: (title: string, response: WhatIfResponse) => void;
}

export const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({
  tasks,
  onSimulationApplied,
}) => {
  const [scenarios, setScenarios] = useState<WhatIfScenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState<WhatIfResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Custom scenario builder options
  const [customType, setCustomType] = useState('equipment_breakdown');
  const [targetTaskId, setTargetTaskId] = useState(tasks[0]?.id || '');
  const [durationMult, setDurationMult] = useState(1.5);

  useEffect(() => {
    api.getWhatIfScenarios().then((list) => {
      setScenarios(list);
      if (list.length > 0) {
        setSelectedScenarioId(list[0].id);
      }
    });
  }, []);

  const handleRunPreconfigured = async (scenario: WhatIfScenario) => {
    setIsSimulating(true);
    setErrorMsg('');
    try {
      const payload: WhatIfRequest = {
        scenario_id: scenario.id,
        title: scenario.title,
        disruption_type: scenario.disruption_type,
        target_equipment: scenario.target_equipment,
        target_crew_type: scenario.target_crew_type,
        target_task_id: scenario.target_task_id,
        target_section: scenario.target_section,
        duration_multiplier: scenario.duration_multiplier ?? 1.5,
        crew_shortage_percentage: scenario.crew_shortage_percentage ?? 0.5,
      };

      const res = await api.runWhatIfSimulation(payload);
      setSimResult(res);
      onSimulationApplied(scenario.title, res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Simulation failed');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleRunCustom = async () => {
    setIsSimulating(true);
    setErrorMsg('');
    const targetTask = tasks.find((t) => t.id === targetTaskId);
    const title = `Custom Disruption on ${targetTaskId}: ${targetTask?.title || ''}`;

    try {
      const payload: WhatIfRequest = {
        title,
        disruption_type: customType,
        target_task_id: targetTaskId,
        duration_multiplier: Number(durationMult),
        crew_shortage_percentage: 0.4,
      };

      const res = await api.runWhatIfSimulation(payload);
      setSimResult(res);
      onSimulationApplied(title, res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Simulation failed');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Simulation Studio Header */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Operational Disruption Simulator
              </span>
              <span className="text-xs text-slate-400 font-mono">Real-time ML & CP-SAT Re-solve</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1 m-0">
              Railway Stress Test & What-If Cascade Engine
            </h2>
            <p className="text-xs text-slate-300 mt-1 m-0">
              Inject operational failures, recalculate Scikit-Learn delay risks, and synthesize automated OR-Tools schedule mitigations.
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Pre-configured Scenarios Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 m-0">
          Pre-Packaged Operational Disruption Scenarios
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scenarios.map((sc) => (
            <div
              key={sc.id}
              className="bg-slate-800/50 border border-slate-700/60 hover:border-amber-500/40 rounded-xl p-5 space-y-3 transition-all flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{sc.title}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                    {sc.disruption_type.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed m-0">
                  {sc.description}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-700/50">
                <span className="text-[11px] text-slate-400">
                  Target: {sc.target_equipment || sc.target_crew_type || sc.target_task_id || sc.target_section}
                </span>

                <button
                  onClick={() => handleRunPreconfigured(sc)}
                  disabled={isSimulating}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Simulate Impact</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Scenario Builder */}
      <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 m-0 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-blue-400" />
          <span>Custom Disruption Sandbox</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Disruption Type</label>
            <select
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
            >
              <option value="equipment_breakdown">Equipment Breakdown</option>
              <option value="crew_unavailable">Crew Shortage / Reassignment</option>
              <option value="task_delay_spike">Task Execution Delay Spike</option>
              <option value="weather_restriction">Severe Weather Restriction</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Target Maintenance Task</label>
            <select
              value={targetTaskId}
              onChange={(e) => setTargetTaskId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
            >
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.id}: {t.title.slice(0, 35)}...
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Duration Multiplier</label>
            <input
              type="number"
              step="0.2"
              min="1.0"
              max="4.0"
              value={durationMult}
              onChange={(e) => setDurationMult(parseFloat(e.target.value) || 1.5)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleRunCustom}
            disabled={isSimulating}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md shadow-blue-500/20 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Execute Custom Simulation</span>
          </button>
        </div>
      </div>

      {/* Simulation Results View */}
      {simResult && (
        <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 space-y-6 shadow-2xl animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase font-bold">
                Simulation Impact Report
              </span>
              <h3 className="text-lg font-bold text-white mt-1 m-0">
                {simResult.impact_summary.scenario_title}
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Scenario ID: {simResult.scenario_id}
            </span>
          </div>

          {/* AI Operational Narrative & Explanation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-1.5">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Operational Impact Assessment:</span>
              </span>
              <p className="text-xs text-slate-300 leading-relaxed m-0">
                {simResult.impact_summary.operational_explanation}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 space-y-1.5">
              <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span>Automated OR-Tools Mitigation:</span>
              </span>
              <p className="text-xs text-slate-300 leading-relaxed m-0">
                {simResult.impact_summary.recommended_mitigation}
              </p>
            </div>
          </div>

          {/* Impact Metrics Callout Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Directly Impacted</span>
              <span className="text-xl font-bold text-amber-400 font-mono">
                {simResult.impact_summary.impacted_task_ids.length} Tasks
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Cascade Affected</span>
              <span className="text-xl font-bold text-red-400 font-mono">
                {simResult.impact_summary.cascade_affected_tasks.length} Tasks
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Avg ML Delay Probability</span>
              <span className="text-xl font-bold text-purple-300 font-mono">
                +{Math.round(simResult.impact_summary.delay_probability_increase_avg * 100)}%
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Downtime Saved (Revised)</span>
              <span className="text-xl font-bold text-emerald-400 font-mono">
                {simResult.comparison.downtime_hours_saved}h
              </span>
            </div>
          </div>

          {/* Revised Schedule Windows */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider m-0">
              Revised Schedule Windows ({simResult.revised_schedule.windows.length} Windows Resolved)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {simResult.revised_schedule.windows.map((win) => (
                <div key={win.window_id} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-bold text-blue-400">{win.window_id}</span>
                    <span className="text-white font-semibold">{win.duration_hours}h</span>
                  </div>
                  <div className="text-slate-300 truncate mt-1">{win.section}</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Slot: {win.start_hour}h - {win.end_hour}h
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
