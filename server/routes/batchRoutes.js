import express from 'express';
import {
  getAllBatches,
  createBatch,
  updateBatch,
} from '../controllers/batchController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getAllBatches);
router.post('/', authorize('DISTRIBUTION_MANAGER', 'WAREHOUSE'), createBatch);
router.put('/:id', authorize('DISTRIBUTION_MANAGER', 'WAREHOUSE'), updateBatch);

export default router;
