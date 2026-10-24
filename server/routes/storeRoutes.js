import express from 'express';
import {
  getAllStores,
  getStoreById,
  createStore,
  updateStore,
} from '../controllers/storeController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getAllStores);
router.get('/:id', getStoreById);
router.post('/', authorize('DISTRIBUTION_MANAGER'), createStore);
router.put('/:id', authorize('DISTRIBUTION_MANAGER'), updateStore);

export default router;
