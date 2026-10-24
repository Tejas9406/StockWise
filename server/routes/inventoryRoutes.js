import express from 'express';
import {
  getAllInventory,
  getInventoryById,
  upsertInventory,
} from '../controllers/inventoryController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getAllInventory);
router.get('/:id', getInventoryById);
router.post('/upsert', authorize('DISTRIBUTION_MANAGER', 'WAREHOUSE'), upsertInventory);

export default router;
