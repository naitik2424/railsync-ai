import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  BrainCircuit,
  Plus,
  Trash2,
  CheckCircle2,
  HelpCircle,
  Clock,
  HardHat,
  Cpu
} from 'lucide-react';
import { MaintenanceTask, TaskCreateInput, Department, Priority, MaintenanceType } from '../types';
import { api } from '../services/api';
import { RiskBadge } from './RiskBadge';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: any) => Promise<void>;
  existingTask?: MaintenanceTask | null;
  allTasks: MaintenanceTask[];
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingTask,
  allTasks,
}) => {
  if (!isOpen) return null;

  const isEdit = !!existingTask;

  const [title, setTitle] = useState(existingTask?.title || '');
  const [description, setDescription] = useState(existingTask?.description || '');
  const [department, setDepartment] = useState<Department>(existingTask?.department || 'Track');
  const [section, setSection] = useState(existingTask?.section || 'Section A-1 (Mainline North)');
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>(
    existingTask?.maintenance_type || 'Ballast Tamping'
  );
  const [plannedDuration, setPlannedDuration] = useState(existingTask?.planned_duration_hours || 3.0);
  const [actualDuration, setActualDuration] = useState<number | undefined>(existingTask?.actual_duration_hours ?? undefined);
  const [priority, setPriority] = useState<Priority>(existingTask?.priority || 'Medium');
  const [status, setStatus] = useState(existingTask?.status || 'Pending');

  // Resources
  const [crewType, setCrewType] = useState(existingTask?.resources.crew_type || 'Track Gang Alpha');
  const [crewSize, setCrewSize] = useState(existingTask?.resources.crew_size || 4);
  const [equipmentInput, setEquipmentInput] = useState(
    existingTask?.resources.equipment.join(', ') || 'Tamping Machine 01'
  );
  const [powerBlock, setPowerBlock] = useState(existingTask?.resources.power_block_required || false);
  const [crewAvailability, setCrewAvailability] = useState(existingTask?.crew_availability_ratio ?? 1.0);

  // Dependencies
  const [selectedDeps, setSelectedDeps] = useState<string[]>(existingTask?.dependencies || []);

  // Live ML Delay Prediction inside modal
  const [liveRisk, setLiveRisk] = useState<{
    prob: number;
    level: string;
    factors: string[];
    loading: boolean;
  }>({
    prob: existingTask?.predicted_delay_probability ?? 0.25,
    level: existingTask?.risk_level ?? 'Low',
    factors: existingTask?.delay_factors ?? ['Nominal operational profile'],
    loading: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Maintenance types by department
  const maintenanceTypeMap: Record<Department, MaintenanceType[]> = {
    Track: [
      'Track Relaying / Renewal',
      'Ballast Tamping',
      'Rail Grinding & Ultrasonic Testing',
    ],
    'Electrical / OHE': [
      'OHE Power Block Inspection',
      'Overhead Wire Tensioning',
    ],
    'Signalling & Telecommunications (S&T)': [
      'Point Machine Maintenance',
      'Signal Interlocking Overhaul',
      'Level Crossing S&T Servicing',
    ],
    'Railway Operations': [
      'Traffic Block Coordination',
    ],
  };

  const sectionsList = [
    'Section A-1 (Mainline North)',
    'Section A-2 (Junction Yard)',
    'Section B-1 (Suburban Corridor)',
    'Section B-2 (Freight Loop)',
    'Section C-1 (Terminal Approaches)',
  ];

  // Update default maintenance type when department changes
  const handleDepartmentChange = (newDept: Department) => {
    setDepartment(newDept);
    const types = maintenanceTypeMap[newDept];
    if (types && types.length > 0) {
      setMaintenanceType(types[0]);
    }
  };

  // Re-estimate ML prediction whenever key parameters change
  useEffect(() => {
    let active = true;
    const fetchPrediction = async () => {
      setLiveRisk((prev) => ({ ...prev, loading: true }));
      try {
        const res = await api.predictDelay({
          department,
          maintenance_type: maintenanceType,
          section,
          planned_duration_hours: Number(plannedDuration),
          complexity_score: priority === 'Critical' ? 5 : priority === 'High' ? 4 : 3,
          crew_experience_level: 2,
          crew_size_allocated: Number(crewSize),
          crew_shortage_ratio: Math.max(0, 1.0 - Number(crewAvailability)),
          equipment_age_years: 5,
          weather_condition: 'Clear',
          is_night_shift: 0,
          dependency_count: selectedDeps.length,
          historical_section_delay_rate: 0.28,
        });

        if (active) {
          setLiveRisk({
            prob: res.delay_probability,
            level: res.risk_level,
            factors: res.top_risk_factors,
            loading: false,
          });
        }
      } catch (e) {
        if (active) {
          setLiveRisk((prev) => ({ ...prev, loading: false }));
        }
      }
    };

    const timer = setTimeout(fetchPrediction, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [department, maintenanceType, section, plannedDuration, priority, crewSize, crewAvailability, selectedDeps]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Task title is required');
      return;
    }
    if (Number(plannedDuration) <= 0) {
      setErrorMsg('Planned duration must be greater than zero');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const equipmentList = equipmentInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const payload: any = {
        title,
        description,
        department,
        section,
        maintenance_type: maintenanceType,
        planned_duration_hours: Number(plannedDuration),
        priority,
        resources: {
          crew_type: crewType,
          crew_size: Number(crewSize),
          equipment: equipmentList,
          power_block_required: powerBlock,
        },
        crew_availability_ratio: Number(crewAvailability),
        dependencies: selectedDeps,
        compatible_with_simultaneous_types: [],
      };

      if (isEdit) {
        payload.status = status;
        if (actualDuration !== undefined && !isNaN(Number(actualDuration))) {
          payload.actual_duration_hours = Number(actualDuration);
        }
      }

      await onSave(payload);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDependency = (depId: string) => {
    setSelectedDeps((prev) =>
      prev.includes(depId) ? prev.filter((id) => id !== depId) : [...prev, depId]
    );
  };

  // Filter possible dependencies (cannot depend on itself)
  const candidateDeps = allTasks.filter((t) => !existingTask || t.id !== existingTask.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white m-0">
                {isEdit ? `Edit Task: ${existingTask.id}` : 'Create Maintenance Task'}
              </h2>
              <p className="text-xs text-slate-400 m-0">
                Railway asset maintenance dispatch & resource scheduling
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Live ML Prediction Preview Box */}
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
                <BrainCircuit className={`w-4 h-4 ${liveRisk.loading ? 'animate-pulse' : ''}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-purple-300">Live ML Delay Assessment</span>
                  <span className="text-[10px] text-slate-400 font-mono">(Random Forest Inference)</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {liveRisk.factors[0] || 'Nominal execution parameters'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <RiskBadge level={liveRisk.level} probability={liveRisk.prob} size="sm" />
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Task Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Mainline Rail Ultrasonic Testing & Joint Tightening"
                className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Detailed scope of work, safety protocol, or specific track km milestones..."
                className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Department, Type & Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Department</label>
              <select
                value={department}
                onChange={(e) => handleDepartmentChange(e.target.value as Department)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="Track">Track</option>
                <option value="Electrical / OHE">Electrical / OHE</option>
                <option value="Signalling & Telecommunications (S&T)">S&T Signals</option>
                <option value="Railway Operations">Railway Operations</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Maintenance Type</label>
              <select
                value={maintenanceType}
                onChange={(e) => setMaintenanceType(e.target.value as MaintenanceType)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {maintenanceTypeMap[department]?.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Railway Section</label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {sectionsList.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Duration & Priority & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Planned Duration (Hours) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                value={plannedDuration}
                onChange={(e) => setPlannedDuration(parseFloat(e.target.value) || 1)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            {isEdit ? (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Blocked">Blocked</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Crew Availability</label>
                <select
                  value={crewAvailability}
                  onChange={(e) => setCrewAvailability(parseFloat(e.target.value))}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="1.0">100% (Full Crew)</option>
                  <option value="0.85">85% (Minor Shortage)</option>
                  <option value="0.70">70% (Moderate Shortage)</option>
                  <option value="0.50">50% (Severe Shortage)</option>
                </select>
              </div>
            )}
          </div>

          {/* Resources & Equipment */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              <span>Crew & Specialized Equipment Allocation</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Crew Designation</label>
                <input
                  type="text"
                  value={crewType}
                  onChange={(e) => setCrewType(e.target.value)}
                  placeholder="e.g. Track Gang Alpha"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Crew Size</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={crewSize}
                  onChange={(e) => setCrewSize(parseInt(e.target.value) || 4)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Specialized Equipment (Comma-separated)
              </label>
              <input
                type="text"
                value={equipmentInput}
                onChange={(e) => setEquipmentInput(e.target.value)}
                placeholder="Tamping Machine 01, Ballast Regulator BR-3"
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Scarce equipment enforces OR-Tools mutual exclusion (NoOverlap constraint).
              </p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={powerBlock}
                  onChange={(e) => setPowerBlock(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                />
                <span>Requires 25kV OHE Power Block (Overhead de-energization)</span>
              </label>
            </div>
          </div>

          {/* Dependencies Selector */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Upstream Dependencies ({selectedDeps.length} selected)
              </span>
              <span className="text-[10px] text-slate-400">Prerequisite tasks that must complete first</span>
            </div>

            {candidateDeps.length === 0 ? (
              <p className="text-xs text-slate-400">No other candidate tasks available.</p>
            ) : (
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-800">
                {candidateDeps.map((dep) => {
                  const isChecked = selectedDeps.includes(dep.id);
                  return (
                    <label
                      key={dep.id}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                        isChecked ? 'bg-blue-600/15 border border-blue-500/30' : 'hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleDependency(dep.id)}
                          className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                        />
                        <span className="font-mono text-xs font-semibold text-blue-400">{dep.id}</span>
                        <span className="text-xs text-slate-300 truncate max-w-xs">{dep.title}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {dep.department}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 flex items-center justify-between bg-slate-800/40 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 shadow-md shadow-blue-500/20"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving Task...</span>
              </>
            ) : (
              <span>{isEdit ? 'Update Task' : 'Create & Schedule Task'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
