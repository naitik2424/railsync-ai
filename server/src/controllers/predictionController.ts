import { Request, Response } from 'express';
import { mlService } from '../services/mlService.js';
import { DelayPredictionRequestSchema } from '../contracts/schemas.js';

export const predictDelay = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = DelayPredictionRequestSchema.parse(req.body);
    const result = await mlService.predictDelay(parsed);
    res.json(result);
  } catch (error: any) {
    if (error.errors) {
      res.status(422).json({ detail: error.errors[0]?.message || 'Validation error', errors: error.errors });
      return;
    }
    res.status(500).json({ detail: error.message || 'Failed to predict delay' });
  }
};

export const getModelMetrics = async (_req: Request, res: Response): Promise<void> => {
  try {
    const metrics = await mlService.getModelMetrics();
    res.json(metrics);
  } catch (error: any) {
    res.status(500).json({ detail: error.message || 'Failed to fetch model metrics' });
  }
};

export const retrainModel = async (_req: Request, res: Response): Promise<void> => {
  try {
    const metrics = await mlService.retrainModel();
    res.json(metrics);
  } catch (error: any) {
    res.status(500).json({ detail: error.message || 'Failed to retrain model' });
  }
};

export const getPendingPredictions = async (_req: Request, res: Response): Promise<void> => {
  try {
    const predictions = await mlService.getPendingPredictions();
    res.json(predictions);
  } catch (error: any) {
    res.status(500).json({ detail: error.message || 'Failed to fetch pending predictions' });
  }
};
