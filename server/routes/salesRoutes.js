import express from 'express';
import {
  getAllSales,
  recordSale,
  getSalesTrends,
} from '../controllers/salesController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getAllSales);
router.get('/trends', getSalesTrends);
router.post('/', authorize('STORE_MANAGER', 'DISTRIBUTION_MANAGER'), recordSale);

export default router;
