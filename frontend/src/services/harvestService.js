import apiClient from './api.js';

export const harvestService = {
  getAll: async (params = {}) => {
    const res = await apiClient.get('/harvests', { params });
    return { data: res.data, meta: res.meta };
  },

  create: async (data) => {
    const res = await apiClient.post('/harvests', data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await apiClient.put(`/harvests/${id}`, data);
    return res.data;
  },

  delete: async (id) => {
    const res = await apiClient.delete(`/harvests/${id}`);
    return res.data;
  },
};

export default harvestService;
