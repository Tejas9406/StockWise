import api from './api';

export const warehouseService = {
  getDashboard: async (warehouseId) => {
    const response = await api.get('/warehouse/dashboard', {
      params: warehouseId ? { warehouseId } : {},
    });
    return response.data;
  },

  getInventory: async (warehouseId) => {
    const response = await api.get('/warehouse/inventory', {
      params: warehouseId ? { warehouseId } : {},
    });
    return response.data;
  },

  getApprovedTransfers: async (warehouseId) => {
    const response = await api.get('/warehouse/approved-transfers', {
      params: warehouseId ? { warehouseId } : {},
    });
    return response.data;
  },

  getPickList: async (warehouseId) => {
    const response = await api.get('/warehouse/pick-list', {
      params: warehouseId ? { warehouseId } : {},
    });
    return response.data;
  },

  getDispatchQueue: async (warehouseId) => {
    const response = await api.get('/warehouse/dispatch-queue', {
      params: warehouseId ? { warehouseId } : {},
    });
    return response.data;
  },

  getDispatchHistory: async (warehouseId) => {
    const response = await api.get('/warehouse/dispatch-history', {
      params: warehouseId ? { warehouseId } : {},
    });
    return response.data;
  },
};
