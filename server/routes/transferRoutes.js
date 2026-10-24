import express from 'express';
import {
  getAllTransfers,
  getTransferById,
  createTransfer,
  approveTransfer,
  rejectTransfer,
  markPicked,
  markPacked,
  markDispatched,
  receiveTransfer,
} from '../controllers/transferController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getAllTransfers);
router.get('/:id', getTransferById);
router.post('/', authorize('DISTRIBUTION_MANAGER', 'STORE_MANAGER'), createTransfer);

// State transitions
router.put('/:id/approve', authorize('DISTRIBUTION_MANAGER'), approveTransfer);
router.put('/:id/reject', authorize('DISTRIBUTION_MANAGER'), rejectTransfer);
router.put('/:id/pick', authorize('WAREHOUSE', 'DISTRIBUTION_MANAGER'), markPicked);
router.put('/:id/pack', authorize('WAREHOUSE', 'DISTRIBUTION_MANAGER'), markPacked);
router.put('/:id/dispatch', authorize('WAREHOUSE', 'DISTRIBUTION_MANAGER'), markDispatched);
router.put('/:id/receive', authorize('STORE_MANAGER', 'DISTRIBUTION_MANAGER'), receiveTransfer);

export default router;
