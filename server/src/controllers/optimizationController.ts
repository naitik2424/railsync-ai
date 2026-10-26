import { Request, Response } from 'express';
import { mlService } from '../services/mlService.js';

export const getBaselineSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const horizon = parseFloat(req.query.horizon_hours as string) || 24;
    const schedule = await mlService.getBaselineSchedule(horizon);
    res.json(schedule);
  } catch (error: any) {
    res.status(500).json({ detail: error.message || 'Failed to generate baseline schedule' });
  }
};

export const getOptimizedSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const horizon = parseFloat(req.query.horizon_hours as string) || 24;
    const schedule = await mlService.getOptimizedSchedule(horizon);
    res.json(schedule);
  } catch (error: any) {
    res.status(500).json({ detail: error.message || 'Failed to generate optimized schedule' });
  }
};

export const getScheduleComparison = async (req: Request, res: Response): Promise<void> => {
  try {
    const horizon = parseFloat(req.query.horizon_hours as string) || 24;
    const comparison = await mlService.getScheduleComparison(horizon);
    res.json(comparison);
  } catch (error: any) {
    res.status(500).json({ detail: error.message || 'Failed to generate schedule comparison' });
  }
};
