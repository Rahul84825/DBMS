import apiClient from './api.js';

export const irrigationService = {
  getAll: async (params = {}) => {
    const res = await apiClient.get('/irrigation', { params });
    return { data: res.data, meta: res.meta };
  },

  create: async (data) => {
    const res = await apiClient.post('/irrigation', data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await apiClient.put(`/irrigation/${id}`, data);
    return res.data;
  },

  delete: async (id) => {
    const res = await apiClient.delete(`/irrigation/${id}`);
    return res.data;
  },
};

export default irrigationService;
