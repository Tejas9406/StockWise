import express from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
} from '../controllers/productController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getAllProducts);
router.get('/:id', getProductById);
router.post('/', authorize('DISTRIBUTION_MANAGER'), createProduct);
router.put('/:id', authorize('DISTRIBUTION_MANAGER'), updateProduct);

export default router;
