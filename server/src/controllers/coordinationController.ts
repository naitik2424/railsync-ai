import { Request, Response } from 'express';
import { taskService } from '../services/taskService.js';
import { AlertService } from '../services/alertService.js';

export const getAlerts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const tasks = await taskService.getAllTasks();
    const alerts = AlertService.generateAlerts(tasks);
    res.json(alerts);
  } catch (error: any) {
    res.status(500).json({ detail: error.message || 'Failed to fetch alerts' });
  }
};

export const getDashboardSummary = async (_req: Request, res: Response): Promise<void> => {
  try {
    const summary = await taskService.getDashboardSummary();
    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ detail: error.message || 'Failed to fetch dashboard summary' });
  }
};

export const getDependencyGraph = async (_req: Request, res: Response): Promise<void> => {
  try {
    const graph = await taskService.getDependencyGraph();
    res.json(graph);
  } catch (error: any) {
    res.status(500).json({ detail: error.message || 'Failed to fetch dependency graph' });
  }
};
