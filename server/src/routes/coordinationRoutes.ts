import { Router } from 'express';
import {
  getAlerts,
  getDashboardSummary,
  getDependencyGraph,
} from '../controllers/coordinationController.js';

const router = Router();

router.get('/alerts', getAlerts);
router.get('/dashboard-summary', getDashboardSummary);
router.get('/dependency-graph', getDependencyGraph);

export default router;
