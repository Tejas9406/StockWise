import express from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import {
  getForecast,
  getRiskAssessment,
  getExpiryIntelligence,
  runOptimization,
  getRecommendations,
  handleManagerDecision,
  getBaselineVsAiComparison,
  getDecisionHistory,
  getModelMetadata,
  // Phase 3 — Decision Intelligence + Simulation + Continuous Learning
  runScenarioSimulation,
  getScenarioHistory,
  recordDecisionOutcome,
  getDecisionOutcomes,
  getModelDrift,
  getBusinessImpact,
  getIntelligenceAlerts,
} from '../controllers/aiController.js';

const router = express.Router();

// All AI endpoints require Firebase authentication
router.use(authenticate);

// ─── Phase 2: Core AIML Intelligence ────────────────────────────────
router.get('/forecast', getForecast);
router.get('/risk', getRiskAssessment);
router.get('/expiry', getExpiryIntelligence);
router.get('/recommendations', getRecommendations);
router.get('/comparison', getBaselineVsAiComparison);
router.get('/decision-history', getDecisionHistory);
router.get('/models', getModelMetadata);

// Manager actions (Optimization execution & Decision overrides)
router.post('/optimize', authorize('DISTRIBUTION_MANAGER'), runOptimization);
router.post('/recommendations/:id/decision', authorize('DISTRIBUTION_MANAGER'), handleManagerDecision);

// ─── Phase 3: Decision Intelligence + Simulation + Continuous Learning ──
router.post('/simulation', authorize('DISTRIBUTION_MANAGER'), runScenarioSimulation);
router.get('/scenarios', getScenarioHistory);
router.post('/outcomes', authorize('DISTRIBUTION_MANAGER'), recordDecisionOutcome);
router.get('/outcomes', getDecisionOutcomes);
router.get('/drift', getModelDrift);
router.get('/impact', getBusinessImpact);
router.get('/alerts', getIntelligenceAlerts);

export default router;
