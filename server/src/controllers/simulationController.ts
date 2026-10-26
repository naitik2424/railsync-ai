import { Request, Response } from 'express';
import { mlService } from '../services/mlService.js';
import { WhatIfRequestSchema } from '../contracts/schemas.js';

export const getScenarios = async (_req: Request, res: Response): Promise<void> => {
  try {
    const scenarios = await mlService.getSimulationScenarios();
    res.json(scenarios);
  } catch (error: any) {
    res.status(500).json({ detail: error.message || 'Failed to fetch simulation scenarios' });
  }
};

export const runSimulation = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = WhatIfRequestSchema.parse(req.body);
    const result = await mlService.runSimulation(parsed);
    res.json(result);
  } catch (error: any) {
    if (error.errors) {
      res.status(422).json({ detail: error.errors[0]?.message || 'Validation error', errors: error.errors });
      return;
    }
    res.status(500).json({ detail: error.message || 'Failed to execute simulation' });
  }
};
