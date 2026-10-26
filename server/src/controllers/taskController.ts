import { Request, Response } from 'express';
import { taskService } from '../services/taskService.js';
import { TaskCreateSchema, TaskUpdateSchema } from '../contracts/schemas.js';

export const getTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    const department = req.query.department as string | undefined;
    const status = req.query.status as string | undefined;
    const tasks = await taskService.getAllTasks(department, status);
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ detail: error.message || 'Failed to fetch tasks' });
  }
};

export const getTaskById = async (req: Request, res: Response): Promise<void> => {
  try {
    const task = await taskService.getTaskById(req.params.id);
    if (!task) {
      res.status(404).json({ detail: `Task ${req.params.id} not found` });
      return;
    }
    res.json(task);
  } catch (error: any) {
    res.status(500).json({ detail: error.message || 'Failed to fetch task' });
  }
};

export const createTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = TaskCreateSchema.parse(req.body);
    const created = await taskService.createTask(parsed);
    res.status(201).json(created);
  } catch (error: any) {
    if (error.errors) {
      res.status(422).json({ detail: error.errors[0]?.message || 'Validation error', errors: error.errors });
      return;
    }
    res.status(500).json({ detail: error.message || 'Failed to create task' });
  }
};

export const updateTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = TaskUpdateSchema.parse(req.body);
    const updated = await taskService.updateTask(req.params.id, parsed);
    if (!updated) {
      res.status(404).json({ detail: `Task ${req.params.id} not found` });
      return;
    }
    res.json(updated);
  } catch (error: any) {
    if (error.errors) {
      res.status(422).json({ detail: error.errors[0]?.message || 'Validation error', errors: error.errors });
      return;
    }
    res.status(500).json({ detail: error.message || 'Failed to update task' });
  }
};

export const deleteTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const success = await taskService.deleteTask(req.params.id);
    if (!success) {
      res.status(404).json({ detail: `Task ${req.params.id} not found` });
      return;
    }
    res.json({ message: `Task ${req.params.id} deleted successfully` });
  } catch (error: any) {
    res.status(500).json({ detail: error.message || 'Failed to delete task' });
  }
};

export const resetSampleData = async (_req: Request, res: Response): Promise<void> => {
  try {
    const tasks = await taskService.resetSampleData();
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ detail: error.message || 'Failed to reset sample data' });
  }
};
