import express from 'express';
import {
  getStoreDashboard,
  getStoreInventory,
  getStoreSalesHistory,
  getStoreDemandForecast,
  getStockRequirements,
  getIncomingTransfers,
  getReceiveStockQueue,
  receiveStock,
} from '../controllers/storePanelController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('STORE_MANAGER', 'DISTRIBUTION_MANAGER'));

router.get('/dashboard', getStoreDashboard);
router.get('/inventory', getStoreInventory);
router.get('/sales', getStoreSalesHistory);
router.get('/forecast', getStoreDemandForecast);
router.get('/requirements', getStockRequirements);
router.get('/incoming', getIncomingTransfers);
router.get('/receive-queue', getReceiveStockQueue);
router.post('/receive/:transferId', receiveStock);

export default router;
