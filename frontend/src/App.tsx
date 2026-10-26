import React, { useState, useEffect } from 'react';
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
  WhatIfResponse
} from './types';
import { api } from './services/api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [scheduleComparison, setScheduleComparison] = useState<ScheduleComparison | null>(null);
  const [alerts, setAlerts] = useState<OperationalAlert[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [activeSimulationTitle, setActiveSimulationTitle] = useState<string | undefined>();

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<MaintenanceTask | null>(null);

  // Load all initial data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedTasks, fetchedSummary, fetchedComp, fetchedAlerts] = await Promise.all([
        api.getTasks(),
        api.getDashboardSummary(),
        api.getScheduleComparison(),
        api.getAlerts(),
      ]);

      setTasks(fetchedTasks);
      setSummary(fetchedSummary);
      setScheduleComparison(fetchedComp);
      setAlerts(fetchedAlerts);
    } catch (err) {
      console.error('Failed to load railway system data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResetData = async () => {
    setIsResetting(true);
    try {
      await api.resetSampleData();
      setActiveSimulationTitle(undefined);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleEditTask = (task: MaintenanceTask) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleSaveTask = async (taskData: any) => {
    if (editingTask) {
      await api.updateTask(editingTask.id, taskData);
    } else {
      await api.createTask(taskData);
    }
    await loadData();
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm(`Are you sure you want to delete task ${taskId}?`)) {
      try {
        await api.deleteTask(taskId);
        await loadData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleUpdateStatus = async (taskId: string, status: TaskStatus) => {
    try {
      await api.updateTask(taskId, { status });
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulationApplied = (title: string, response: WhatIfResponse) => {
    setActiveSimulationTitle(title);
    setScheduleComparison(response.comparison);
    setAlerts(response.generated_alerts);
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

      <div className="flex flex-1">
        {/* Left Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          pendingTasksCount={pendingCount}
          criticalAlertsCount={criticalAlertsCount}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          {activeTab === 'dashboard' && (
            <DashboardOverview
              summary={summary}
              isLoading={isLoading}
              onNavigateTab={setActiveTab}
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
              onRefreshSchedule={loadData}
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
