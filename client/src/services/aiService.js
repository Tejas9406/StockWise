import api from './api';

export const aiService = {
  // ─── Phase 2: Core AIML Intelligence ────────────────────────────
  
  // Demand Forecasting (FastAPI ML + Baseline comparison)
  getForecast: async (params = {}) => {
    const response = await api.get('/ai/forecast', { params });
    return response.data;
  },

  // Predictive Stockout Risk & Excess Inventory
  getRiskAssessment: async (params = {}) => {
    const response = await api.get('/ai/risk', { params });
    return response.data;
  },

  // Expiry Intelligence & Advanced FEFO
  getExpiryIntelligence: async (params = {}) => {
    const response = await api.get('/ai/expiry', { params });
    return response.data;
  },

  // PuLP MILP Constrained Optimization Engine
  runOptimization: async (payload = {}) => {
    const response = await api.post('/ai/optimize', payload);
    return response.data;
  },

  // AI Allocation Recommendations
  getRecommendations: async (params = {}) => {
    const response = await api.get('/ai/recommendations', { params });
    return response.data;
  },

  // Manager Decision (Accept, Edit, Reject) -> Atomically creates operational transfer
  handleDecision: async (recommendationId, { decision, edited_quantity, reason }) => {
    const response = await api.post(`/ai/recommendations/${recommendationId}/decision`, {
      decision,
      edited_quantity,
      reason,
    });
    return response.data;
  },

  // End-to-end Decision History & Audit Trail
  getDecisionHistory: async (params = {}) => {
    const response = await api.get('/ai/decision-history', { params });
    return response.data;
  },

  // Quantitative Baseline vs AI Plan Comparison
  getComparison: async (params = {}) => {
    const response = await api.get('/ai/comparison', { params });
    return response.data;
  },

  // ML Model Registry & Benchmarks
  getModels: async () => {
    const response = await api.get('/ai/models');
    return response.data;
  },

  // ─── Phase 3: Decision Intelligence + Simulation + Continuous Learning ──

  // What-If Scenario Simulation
  runSimulation: async (payload) => {
    const response = await api.post('/ai/simulation', payload);
    return response.data;
  },

  // Get Saved Scenario History
  getScenarios: async (params = {}) => {
    const response = await api.get('/ai/scenarios', { params });
    return response.data;
  },

  // Record Decision Outcome (Actual vs Predicted)
  recordOutcome: async (payload) => {
    const response = await api.post('/ai/outcomes', payload);
    return response.data;
  },

  // Get Decision Outcomes for Continuous Learning Analytics
  getOutcomes: async (params = {}) => {
    const response = await api.get('/ai/outcomes', { params });
    return response.data;
  },

  // Model Drift Monitoring
  getModelDrift: async (params = {}) => {
    const response = await api.get('/ai/drift', { params });
    return response.data;
  },

  // Business Impact Dashboard Metrics
  getBusinessImpact: async (params = {}) => {
    const response = await api.get('/ai/impact', { params });
    return response.data;
  },

  // Intelligence Alerts (Proactive Anomaly Detection)
  getAlerts: async (params = {}) => {
    const response = await api.get('/ai/alerts', { params });
    return response.data;
  },
};

export default aiService;
