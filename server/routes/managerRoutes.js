import express from 'express';
import {
  getDashboardSummary,
  getRiskAlerts,
  getDecisionHistory,
  getDemandForecastOverview,
  getBaselineComparisonOverview,
} from '../controllers/managerController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('DISTRIBUTION_MANAGER'));

router.get('/dashboard', getDashboardSummary);
router.get('/risks', getRiskAlerts);
router.get('/history', getDecisionHistory);
router.get('/forecast', getDemandForecastOverview);
router.get('/baseline-comparison', getBaselineComparisonOverview);

export default router;
