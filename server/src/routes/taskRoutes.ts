import { Router } from 'express';
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  resetSampleData,
} from '../controllers/taskController.js';

const router = Router();

router.get('/', getTasks);
router.post('/reset-sample-data', resetSampleData);
router.get('/:id', getTaskById);
router.post('/', createTask);
router.patch('/:id', updateTask);
router.delete('/:id', deleteTask);

export default router;
