import {
  MaintenanceTask,
  TaskCreateInput,
  ScheduleResult,
  ScheduleComparison,
  DelayPredictionRequest,
  DelayPredictionResponse,
  ModelMetrics,
  OperationalAlert,
  WhatIfScenario,
  WhatIfRequest,
  WhatIfResponse,
  DashboardSummary,
} from '../types';

// Default to Express backend port 5000, fallback to import.meta.env if provided
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:5000/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorText = await res.text();
    let msg = `API Error ${res.status}: ${res.statusText}`;
    try {
      const parsed = JSON.parse(errorText);
      msg = parsed.detail || msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  // Tasks
  async getTasks(department?: string, status?: string): Promise<MaintenanceTask[]> {
    const params = new URLSearchParams();
    if (department && department !== 'All') params.append('department', department);
    if (status && status !== 'All') params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/tasks${query}`);
    return handleResponse<MaintenanceTask[]>(res);
  },

  async getTask(taskId: string): Promise<MaintenanceTask> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}`);
    return handleResponse<MaintenanceTask>(res);
  },

  async createTask(task: TaskCreateInput): Promise<MaintenanceTask> {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    return handleResponse<MaintenanceTask>(res);
  },

  async updateTask(taskId: string, updates: Partial<MaintenanceTask>): Promise<MaintenanceTask> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return handleResponse<MaintenanceTask>(res);
  },

  async deleteTask(taskId: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'DELETE',
    });
    return handleResponse<{ message: string }>(res);
  },

  async resetSampleData(): Promise<MaintenanceTask[]> {
    const res = await fetch(`${API_BASE}/tasks/reset-sample-data`, {
      method: 'POST',
    });
    return handleResponse<MaintenanceTask[]>(res);
  },

  // Predictions with AbortSignal support to cancel stale in-flight requests
  async predictDelay(
    req: DelayPredictionRequest,
    signal?: AbortSignal
  ): Promise<DelayPredictionResponse> {
    const res = await fetch(`${API_BASE}/predictions/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal,
    });
    return handleResponse<DelayPredictionResponse>(res);
  },

  async getModelMetrics(): Promise<ModelMetrics> {
    const res = await fetch(`${API_BASE}/predictions/metrics`);
    return handleResponse<ModelMetrics>(res);
  },

  async retrainModel(): Promise<ModelMetrics> {
    const res = await fetch(`${API_BASE}/predictions/train`, {
      method: 'POST',
    });
    return handleResponse<ModelMetrics>(res);
  },

  // Optimization
  async getBaselineSchedule(horizonHours = 24): Promise<ScheduleResult> {
    const res = await fetch(`${API_BASE}/optimization/baseline?horizon_hours=${horizonHours}`);
    return handleResponse<ScheduleResult>(res);
  },

  async getOptimizedSchedule(horizonHours = 24): Promise<ScheduleResult> {
    const res = await fetch(`${API_BASE}/optimization/optimized?horizon_hours=${horizonHours}`);
    return handleResponse<ScheduleResult>(res);
  },

  async getScheduleComparison(horizonHours = 24): Promise<ScheduleComparison> {
    const res = await fetch(`${API_BASE}/optimization/comparison?horizon_hours=${horizonHours}`);
    return handleResponse<ScheduleComparison>(res);
  },

  // Coordination & Dashboard
  async getDashboardSummary(): Promise<DashboardSummary> {
    const res = await fetch(`${API_BASE}/coordination/dashboard-summary`);
    return handleResponse<DashboardSummary>(res);
  },

  async getAlerts(): Promise<OperationalAlert[]> {
    const res = await fetch(`${API_BASE}/coordination/alerts`);
    return handleResponse<OperationalAlert[]>(res);
  },

  async getDependencyGraph(): Promise<{ nodes: any[]; edges: any[] }> {
    const res = await fetch(`${API_BASE}/coordination/dependency-graph`);
    return handleResponse<{ nodes: any[]; edges: any[] }>(res);
  },

  // Simulation
  async getWhatIfScenarios(): Promise<WhatIfScenario[]> {
    const res = await fetch(`${API_BASE}/simulation/scenarios`);
    return handleResponse<WhatIfScenario[]>(res);
  },

  async runWhatIfSimulation(req: WhatIfRequest): Promise<WhatIfResponse> {
    const res = await fetch(`${API_BASE}/simulation/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    return handleResponse<WhatIfResponse>(res);
  },
};
