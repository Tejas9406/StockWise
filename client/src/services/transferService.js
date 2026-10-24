import api from './api';

export const transferService = {
  getAllTransfers: async (params = {}) => {
    const response = await api.get('/transfers', { params });
    return response.data;
  },

  getTransferById: async (id) => {
    const response = await api.get(`/transfers/${id}`);
    return response.data;
  },

  createTransfer: async (data) => {
    const response = await api.post('/transfers', data);
    return response.data;
  },

  approveTransfer: async (id, payload) => {
    const response = await api.put(`/transfers/${id}/approve`, payload);
    return response.data;
  },

  rejectTransfer: async (id, payload) => {
    const response = await api.put(`/transfers/${id}/reject`, payload);
    return response.data;
  },

  markPicked: async (id, payload = {}) => {
    const response = await api.put(`/transfers/${id}/pick`, payload);
    return response.data;
  },

  markPacked: async (id, payload = {}) => {
    const response = await api.put(`/transfers/${id}/pack`, payload);
    return response.data;
  },

  markDispatched: async (id, payload = {}) => {
    const response = await api.put(`/transfers/${id}/dispatch`, payload);
    return response.data;
  },

  receiveTransfer: async (id, payload = {}) => {
    const response = await api.put(`/transfers/${id}/receive`, payload);
    return response.data;
  },

  // AI Recommendations
  getAllRecommendations: async (params = {}) => {
    const response = await api.get('/recommendations', { params });
    return response.data;
  },

  approveRecommendation: async (id) => {
    const response = await api.put(`/recommendations/${id}/approve`);
    return response.data;
  },

  rejectRecommendation: async (id, payload = {}) => {
    const response = await api.put(`/recommendations/${id}/reject`, payload);
    return response.data;
  },

  editAndApproveRecommendation: async (id, payload) => {
    const response = await api.put(`/recommendations/${id}/edit-approve`, payload);
    return response.data;
  },

  autoGenerateRecommendations: async (params = {}) => {
    const response = await api.post('/recommendations/auto-generate', params);
    return response.data;
  },
};
