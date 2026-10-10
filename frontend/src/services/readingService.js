import apiClient from './api.js';

export const readingService = {
  getLatest: async () => {
    const res = await apiClient.get('/readings/latest');
    return res.data;
  },

  getAlerts: async (threshold = 30.0) => {
    const res = await apiClient.get('/readings/alerts', {
      params: { threshold },
    });
    return { data: res.data, meta: res.meta };
  },

  getHistory: async (params = {}) => {
    const res = await apiClient.get('/readings', { params });
    return { data: res.data, meta: res.meta };
  },

  create: async (readingData) => {
    const res = await apiClient.post('/readings', readingData);
    return res.data;
  },
};

export default readingService;
