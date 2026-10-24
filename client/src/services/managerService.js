import api from './api';

export const managerService = {
  getDashboardSummary: async () => {
    const response = await api.get('/manager/dashboard');
    return response.data;
  },

  getRiskAlerts: async () => {
    const response = await api.get('/manager/risks');
    return response.data;
  },

  getDecisionHistory: async () => {
    const response = await api.get('/manager/history');
    return response.data;
  },

  getDemandForecastOverview: async (params = {}) => {
    const response = await api.get('/manager/forecast', { params });
    return response.data;
  },

  getBaselineComparison: async (params = {}) => {
    const response = await api.get('/manager/baseline-comparison', { params });
    return response.data;
  },
};
