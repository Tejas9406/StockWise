import express from 'express';
import multer from 'multer';
import {
  getCsvTemplate,
  previewAndValidate,
  confirmImport,
  getImportHistory,
  getDataHealth,
} from '../controllers/importController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
});

// All import and data health endpoints require Manager authentication
router.use(authenticate);
router.use(authorize('DISTRIBUTION_MANAGER'));

// Template downloads
router.get('/templates/:datasetType', getCsvTemplate);

// Preview & validate CSV file
router.post('/preview', upload.single('file'), previewAndValidate);

// Confirm and persist import
router.post('/confirm', confirmImport);

// Import history
router.get('/history', getImportHistory);

// Data health & freshness status
router.get('/data-health', getDataHealth);

export default router;
