import apiClient from './api.js';

export const plantingService = {
  getAll: async (params = {}) => {
    const res = await apiClient.get('/plantings', { params });
    return { data: res.data, meta: res.meta };
  },

  getById: async (id) => {
    const res = await apiClient.get(`/plantings/${id}`);
    return res.data;
  },

  create: async (plantingData) => {
    const res = await apiClient.post('/plantings', plantingData);
    return res.data;
  },

  update: async (id, plantingData) => {
    const res = await apiClient.put(`/plantings/${id}`, plantingData);
    return res.data;
  },

  delete: async (id) => {
    const res = await apiClient.delete(`/plantings/${id}`);
    return res.data;
  },
};

export default plantingService;
