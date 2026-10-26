import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, TabType } from './components/Sidebar';
import { DashboardOverview } from './components/DashboardOverview';
import { TaskTable } from './components/TaskTable';
import { TaskModal } from './components/TaskModal';
import { ScheduleGantt } from './components/ScheduleGantt';
import { CrossDepartmentCoordination } from './components/CrossDepartmentCoordination';
import { WhatIfSimulator } from './components/WhatIfSimulator';
import { MLModelHealth } from './components/MLModelHealth';
import {
  MaintenanceTask,
  DashboardSummary,
  ScheduleComparison,
  OperationalAlert,
  TaskStatus,
  WhatIfResponse,
} from './types';
import { api } from './services/api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Modular state stores
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [scheduleComparison, setScheduleComparison] = useState<ScheduleComparison | null>(null);
  const [alerts, setAlerts] = useState<OperationalAlert[]>([]);

  // Cache tracker to avoid redundant API requests when switching tabs
  const loadedTabsRef = useRef<Set<TabType>>(new Set());

  // Loading & Action states
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [activeSimulationTitle, setActiveSimulationTitle] = useState<string | undefined>();
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<MaintenanceTask | null>(null);

  // Helper to show transient feedback banner
  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Invalidate cache when data is mutated
  const invalidateCache = () => {
    loadedTabsRef.current.clear();
  };

  // On-demand fetching: Only fetch what the active tab specifically requires
  const loadActiveTabData = useCallback(
    async (force = false) => {
      if (!force && loadedTabsRef.current.has(activeTab)) {
        return; // Cache hit: Reuse existing state to reduce network traffic
      }

      setIsLoading(true);
      try {
        switch (activeTab) {
          case 'dashboard': {
            const fetchedSummary = await api.getDashboardSummary();
            setSummary(fetchedSummary);
            break;
          }
          case 'tasks': {
            const fetchedTasks = await api.getTasks();
            setTasks(fetchedTasks);
            break;
          }
          case 'optimizer': {
            const fetchedComp = await api.getScheduleComparison();
            setScheduleComparison(fetchedComp);
            break;
          }
          case 'coordination': {
            const [fetchedAlerts, fetchedTasks] = await Promise.all([
              api.getAlerts(),
              api.getTasks(),
            ]);
            setAlerts(fetchedAlerts);
            setTasks(fetchedTasks);
            break;
          }
          case 'simulation': {
            // Need tasks list for target task selection
            if (tasks.length === 0) {
              const fetchedTasks = await api.getTasks();
              setTasks(fetchedTasks);
            }
            break;
          }
          case 'ml': {
            // ML metrics are handled directly in MLModelHealth component
            break;
          }
        }
        loadedTabsRef.current.add(activeTab);
      } catch (err: any) {
        console.error(`Error loading data for tab ${activeTab}:`, err);
        showFeedback('error', `Failed to load ${activeTab} data. Ensure backend is running.`);
      } finally {
        setIsLoading(false);
      }
    },
    [activeTab, tasks.length]
  );

  useEffect(() => {
    loadActiveTabData();
  }, [loadActiveTabData]);

  // Handle sample data reset
  const handleResetData = async () => {
    setIsResetting(true);
    try {
      await api.resetSampleData();
      invalidateCache();
      setActiveSimulationTitle(undefined);
      showFeedback('success', 'Sample maintenance tasks and baseline windows reset successfully.');
      await loadActiveTabData(true);
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to reset sample data');
    } finally {
      setIsResetting(false);
    }
  };

  const handleOpenCreateModal = async () => {
    // Ensure allTasks are loaded for dependency picker
    if (tasks.length === 0) {
      try {
        const fetchedTasks = await api.getTasks();
        setTasks(fetchedTasks);
      } catch (e) {
        // ignore
      }
    }
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleEditTask = (task: MaintenanceTask) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleSaveTask = async (taskData: any) => {
    try {
      if (editingTask) {
        await api.updateTask(editingTask.id, taskData);
        showFeedback('success', `Task ${editingTask.id} updated successfully.`);
      } else {
        const created = await api.createTask(taskData);
        showFeedback('success', `Task ${created.id} created and scheduled.`);
      }
      invalidateCache();
      await loadActiveTabData(true);
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to save task.');
      throw err;
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm(`Are you sure you want to delete task ${taskId}?`)) {
      try {
        await api.deleteTask(taskId);
        showFeedback('success', `Task ${taskId} removed.`);
        invalidateCache();
        await loadActiveTabData(true);
      } catch (err: any) {
        showFeedback('error', err.message || 'Failed to delete task.');
      }
    }
  };

  const handleUpdateStatus = async (taskId: string, status: TaskStatus) => {
    try {
      await api.updateTask(taskId, { status });
      showFeedback('success', `Task ${taskId} status set to ${status}.`);
      invalidateCache();
      await loadActiveTabData(true);
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to update status.');
    }
  };

  const handleSimulationApplied = (title: string, response: WhatIfResponse) => {
    setActiveSimulationTitle(title);
    setScheduleComparison(response.comparison);
    setAlerts(response.generated_alerts);
    showFeedback('success', `Simulation applied: ${title}`);
  };

  const pendingCount = tasks.filter((t) => t.status === 'Pending').length;
  const criticalAlertsCount = alerts.filter((a) => a.severity === 'CRITICAL').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        onResetData={handleResetData}
        isResetting={isResetting}
        activeSimulationTitle={activeSimulationTitle}
        onClearSimulation={handleResetData}
      />

      {/* Global Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`px-6 py-2 text-xs font-semibold flex items-center justify-between border-b ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
              : 'bg-red-950/60 text-red-300 border-red-500/30'
          }`}
        >
          <span>{feedbackMessage.text}</span>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-white ml-4"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-1">
        {/* Left Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
          }}
          pendingTasksCount={pendingCount}
          criticalAlertsCount={criticalAlertsCount}
        />

        {/* Main Content Area with Lazy On-Demand Rendering */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          {activeTab === 'dashboard' && (
            <DashboardOverview
              summary={summary}
              isLoading={isLoading}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onRunSimulationQuick={() => setActiveTab('simulation')}
            />
          )}

          {activeTab === 'tasks' && (
            <TaskTable
              tasks={tasks}
              onOpenCreateModal={handleOpenCreateModal}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onUpdateStatus={handleUpdateStatus}
            />
          )}

          {activeTab === 'optimizer' && (
            <ScheduleGantt
              comparison={scheduleComparison}
              isLoading={isLoading}
              onRefreshSchedule={() => loadActiveTabData(true)}
            />
          )}

          {activeTab === 'coordination' && (
            <CrossDepartmentCoordination
              tasks={tasks}
              alerts={alerts}
              isLoading={isLoading}
              onSelectTask={handleEditTask}
            />
          )}

          {activeTab === 'simulation' && (
            <WhatIfSimulator
              tasks={tasks}
              onSimulationApplied={handleSimulationApplied}
            />
          )}

          {activeTab === 'ml' && <MLModelHealth />}
        </main>
      </div>

      {/* Task Creation & Edit Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        existingTask={editingTask}
        allTasks={tasks}
      />
    </div>
  );
};

export default App;
