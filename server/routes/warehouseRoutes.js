import express from 'express';
import {
  getAllWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
} from '../controllers/warehouseController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getAllWarehouses);
router.get('/:id', getWarehouseById);
router.post('/', authorize('DISTRIBUTION_MANAGER'), createWarehouse);
router.put('/:id', authorize('DISTRIBUTION_MANAGER'), updateWarehouse);

export default router;
