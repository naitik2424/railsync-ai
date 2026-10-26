import { Router } from 'express';
import {
  getBaselineSchedule,
  getOptimizedSchedule,
  getScheduleComparison,
} from '../controllers/optimizationController.js';

const router = Router();

router.get('/baseline', getBaselineSchedule);
router.get('/optimized', getOptimizedSchedule);
router.get('/comparison', getScheduleComparison);

export default router;
