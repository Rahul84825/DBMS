import apiClient from './api.js';

export const dashboardService = {
  getSummary: async (threshold = 30.0) => {
    const res = await apiClient.get('/dashboard/summary', {
      params: { threshold },
    });
    return res.data;
  },
};

export default dashboardService;
