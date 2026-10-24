import api from './api';

export const inventoryService = {
  getAllInventory: async (params = {}) => {
    const response = await api.get('/inventory', { params });
    return response.data;
  },

  getAllBatches: async (params = {}) => {
    const response = await api.get('/batches', { params });
    return response.data;
  },

  getAllProducts: async (params = {}) => {
    const response = await api.get('/products', { params });
    return response.data;
  },

  getAllWarehouses: async () => {
    const response = await api.get('/warehouses');
    return response.data;
  },

  getAllStores: async () => {
    const response = await api.get('/stores');
    return response.data;
  },

  upsertInventory: async (data) => {
    const response = await api.post('/inventory/upsert', data);
    return response.data;
  },

  createBatch: async (data) => {
    const response = await api.post('/batches', data);
    return response.data;
  },
};
