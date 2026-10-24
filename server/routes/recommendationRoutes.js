import express from 'express';
import {
  getAllRecommendations,
  approveRecommendation,
  rejectRecommendation,
  editAndApproveRecommendation,
  createRecommendation,
  generateAutoRecommendations,
} from '../controllers/recommendationController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getAllRecommendations);
router.post('/', authorize('DISTRIBUTION_MANAGER'), createRecommendation);
router.post('/auto-generate', authorize('DISTRIBUTION_MANAGER'), generateAutoRecommendations);
router.put('/:id/approve', authorize('DISTRIBUTION_MANAGER'), approveRecommendation);
router.put('/:id/reject', authorize('DISTRIBUTION_MANAGER'), rejectRecommendation);
router.put('/:id/edit-approve', authorize('DISTRIBUTION_MANAGER'), editAndApproveRecommendation);

export default router;
