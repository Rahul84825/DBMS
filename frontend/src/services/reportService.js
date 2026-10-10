import apiClient from './api.js';

export const reportService = {
  getHarvests: async () => {
    const res = await apiClient.get('/reports/harvests');
    return res.data;
  },

  getExpenses: async () => {
    const res = await apiClient.get('/reports/expenses');
    return res.data;
  },

  getCrops: async () => {
    const res = await apiClient.get('/reports/crops');
    return res.data;
  },

  getIrrigation: async () => {
    const res = await apiClient.get('/reports/irrigation');
    return res.data;
  },
};

export default reportService;
