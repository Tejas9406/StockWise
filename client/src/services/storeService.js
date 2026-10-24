import api from './api';

export const storeService = {
  getDashboard: async (storeId) => {
    const response = await api.get('/store/dashboard', {
      params: storeId ? { storeId } : {},
    });
    return response.data;
  },

  getInventory: async (storeId) => {
    const response = await api.get('/store/inventory', {
      params: storeId ? { storeId } : {},
    });
    return response.data;
  },

  getSalesHistory: async (storeId) => {
    const response = await api.get('/store/sales', {
      params: storeId ? { storeId } : {},
    });
    return response.data;
  },

  recordSale: async (saleData) => {
    const response = await api.post('/sales', saleData);
    return response.data;
  },

  getDemandForecast: async (storeId) => {
    const response = await api.get('/store/forecast', {
      params: storeId ? { storeId } : {},
    });
    return response.data;
  },

  getStockRequirements: async (storeId) => {
    const response = await api.get('/store/requirements', {
      params: storeId ? { storeId } : {},
    });
    return response.data;
  },

  getIncomingTransfers: async (storeId) => {
    const response = await api.get('/store/incoming', {
      params: storeId ? { storeId } : {},
    });
    return response.data;
  },

  getReceiveQueue: async (storeId) => {
    const response = await api.get('/store/receive-queue', {
      params: storeId ? { storeId } : {},
    });
    return response.data;
  },

  confirmReceiveStock: async (transferId) => {
    const response = await api.post(`/store/receive/${transferId}`);
    return response.data;
  },
};
