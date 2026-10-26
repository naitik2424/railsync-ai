import { Router } from 'express';
import {
  predictDelay,
  getModelMetrics,
  retrainModel,
  getPendingPredictions,
} from '../controllers/predictionController.js';

const router = Router();

router.post('/predict', predictDelay);
router.get('/metrics', getModelMetrics);
router.post('/train', retrainModel);
router.get('/batch-pending', getPendingPredictions);

export default router;
