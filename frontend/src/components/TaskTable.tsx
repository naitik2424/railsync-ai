import React, { useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  AlertTriangle,
  Clock,
  Shield,
  Layers,
  CheckCircle,
  Eye,
  ArrowUpDown
} from 'lucide-react';
import { MaintenanceTask, Department, TaskStatus } from '../types';
import { RiskBadge } from './RiskBadge';

interface TaskTableProps {
  tasks: MaintenanceTask[];
  onOpenCreateModal: () => void;
  onEditTask: (task: MaintenanceTask) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
}

export const TaskTable: React.FC<TaskTableProps> = ({
  tasks,
  onOpenCreateModal,
  onEditTask,
  onDeleteTask,
  onUpdateStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedRisk, setSelectedRisk] = useState<string>('All');
  const [detailTask, setDetailTask] = useState<MaintenanceTask | null>(null);

  const departments = [
    'All',
    'Track',
    'Electrical / OHE',
    'Signalling & Telecommunications (S&T)',
    'Railway Operations',
  ];

  const statuses = ['All', 'Pending', 'In Progress', 'Completed', 'Blocked', 'Cancelled'];
  const risks = ['All', 'Critical', 'High', 'Medium', 'Low'];

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    const matchSearch =
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.maintenance_type.toLowerCase().includes(searchTerm.toLowerCase());

    const matchDept = selectedDept === 'All' || t.department === selectedDept;
    const matchStatus = selectedStatus === 'All' || t.status === selectedStatus;
    const matchRisk = selectedRisk === 'All' || t.risk_level === selectedRisk;

    return matchSearch && matchDept && matchStatus && matchRisk;
  });

  const getDeptColorBadge = (dept: string) => {
    switch (dept) {
      case 'Track':
        return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
      case 'Electrical / OHE':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'Signalling & Telecommunications (S&T)':
        return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
      case 'Railway Operations':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'In Progress':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30 animate-pulse';
      case 'Blocked':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'Pending':
      default:
        return 'bg-slate-700/60 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="space-y-5">
      {/* Top action & filter bar */}
      <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by ID, task title, section, or equipment..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Department */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            {departments.map((d) => (
              <option key={d} value={d}>
                Dept: {d === 'Signalling & Telecommunications (S&T)' ? 'S&T' : d}
              </option>
            ))}
          </select>

          {/* Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                Status: {s}
              </option>
            ))}
          </select>

          {/* Risk */}
          <select
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            {risks.map((r) => (
              <option key={r} value={r}>
                Risk: {r}
              </option>
            ))}
          </select>

          {/* Create Button */}
          <button
            onClick={onOpenCreateModal}
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm shadow-blue-500/20 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-700/80 bg-slate-900/60 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Task ID & Details</th>
                <th className="py-3 px-3">Department & Section</th>
                <th className="py-3 px-3">Duration</th>
                <th className="py-3 px-3">Resources (Crew / Eq)</th>
                <th className="py-3 px-3">Precedence</th>
                <th className="py-3 px-3">ML Delay Risk</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No tasks matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr
                    key={task.id}
                    className="hover:bg-slate-800/50 transition-colors group"
                  >
                    {/* ID & Title */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-400">
                          {task.id}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                            task.priority === 'Critical'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : task.priority === 'High'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {task.priority}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-slate-200 mt-1 truncate">
                        {task.title}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {task.maintenance_type}
                      </div>
                    </td>

                    {/* Department & Section */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full font-medium text-[11px] border ${getDeptColorBadge(
                          task.department
                        )}`}
                      >
                        {task.department.replace('Signalling & Telecommunications (S&T)', 'S&T')}
                      </span>
                      <div className="text-slate-300 text-[11px] mt-1 font-medium">
                        {task.section}
                      </div>
                    </td>

                    {/* Duration */}
                    <td className="py-3.5 px-3 font-mono">
                      <div className="text-slate-200 font-semibold">
                        {task.planned_duration_hours}h planned
                      </div>
                      {task.actual_duration_hours !== null && task.actual_duration_hours !== undefined && (
                        <div className="text-slate-400 text-[11px]">
                          {task.actual_duration_hours}h actual
                        </div>
                      )}
                    </td>

                    {/* Resources */}
                    <td className="py-3.5 px-3 text-[11px]">
                      <div className="text-slate-300 font-medium truncate max-w-[140px]">
                        👷 {task.resources.crew_type} ({task.resources.crew_size})
                      </div>
                      {task.resources.equipment.length > 0 && (
                        <div className="text-slate-400 text-[10px] truncate max-w-[140px] mt-0.5">
                          ⚙️ {task.resources.equipment.join(', ')}
                        </div>
                      )}
                      {task.resources.power_block_required && (
                        <span className="inline-block mt-1 text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          ⚡ 25kV Power Block
                        </span>
                      )}
                    </td>

                    {/* Dependencies */}
                    <td className="py-3.5 px-3">
                      {task.dependencies.length === 0 ? (
                        <span className="text-slate-400 text-[11px]">None</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {task.dependencies.map((dep) => (
                            <span
                              key={dep}
                              className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-blue-400 border border-slate-700"
                            >
                              {dep}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Risk Level */}
                    <td className="py-3.5 px-3">
                      <RiskBadge
                        level={task.risk_level}
                        probability={task.predicted_delay_probability}
                        size="sm"
                      />
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3">
                      <select
                        value={task.status}
                        onChange={(e) => onUpdateStatus(task.id, e.target.value as TaskStatus)}
                        className={`text-[11px] font-semibold px-2 py-1 rounded border bg-slate-900 cursor-pointer focus:outline-none ${getStatusBadge(
                          task.status
                        )}`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Blocked">Blocked</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right shrink-0">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setDetailTask(task)}
                          title="Inspect Details & Factors"
                          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onEditTask(task)}
                          title="Edit Task"
                          className="p-1.5 rounded text-slate-400 hover:text-blue-400 hover:bg-slate-700 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteTask(task.id)}
                          title="Delete Task"
                          className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Task Details Quick Drawer Modal */}
      {detailTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-blue-400">{detailTask.id}</span>
                <span className="text-sm font-bold text-white">{detailTask.title}</span>
              </div>
              <button
                onClick={() => setDetailTask(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-800/60">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Department</span>
                  <span className="text-slate-200 font-semibold">{detailTask.department}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Section</span>
                  <span className="text-slate-200 font-semibold">{detailTask.section}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Duration</span>
                  <span className="text-slate-200 font-semibold font-mono">
                    {detailTask.planned_duration_hours}h planned
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Risk Category</span>
                  <RiskBadge
                    level={detailTask.risk_level}
                    probability={detailTask.predicted_delay_probability}
                    size="sm"
                  />
                </div>
              </div>

              {detailTask.description && (
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold mb-1">Scope of Work</span>
                  <p className="text-slate-300 bg-slate-800/40 p-2.5 rounded border border-slate-800 m-0">
                    {detailTask.description}
                  </p>
                </div>
              )}

              {/* Explanatory ML Risk Factors */}
              <div>
                <span className="text-slate-400 block text-[11px] font-semibold mb-1">
                  Random Forest Delay Factors
                </span>
                {detailTask.delay_factors && detailTask.delay_factors.length > 0 ? (
                  <ul className="space-y-1 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded text-amber-300 list-disc list-inside">
                    {detailTask.delay_factors.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-400">No adverse risk factors detected.</p>
                )}
              </div>

              {/* Dependencies */}
              <div>
                <span className="text-slate-400 block text-[11px] font-semibold mb-1">
                  Upstream Dependencies ({detailTask.dependencies.length})
                </span>
                {detailTask.dependencies.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {detailTask.dependencies.map((dep) => (
                      <span
                        key={dep}
                        className="font-mono text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      >
                        {dep}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400">None (Independent Task)</p>
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setDetailTask(null)}
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
