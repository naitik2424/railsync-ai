import { Router } from 'express';
import { getScenarios, runSimulation } from '../controllers/simulationController.js';

const router = Router();

router.get('/scenarios', getScenarios);
router.post('/run', runSimulation);

export default router;
