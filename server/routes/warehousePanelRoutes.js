import express from 'express';
import {
  getWarehouseDashboard,
  getWarehouseInventory,
  getApprovedTransfers,
  getPickList,
  getDispatchQueue,
  getDispatchHistory,
} from '../controllers/warehousePanelController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('WAREHOUSE', 'DISTRIBUTION_MANAGER'));

router.get('/dashboard', getWarehouseDashboard);
router.get('/inventory', getWarehouseInventory);
router.get('/approved-transfers', getApprovedTransfers);
router.get('/pick-list', getPickList);
router.get('/dispatch-queue', getDispatchQueue);
router.get('/dispatch-history', getDispatchHistory);

export default router;
