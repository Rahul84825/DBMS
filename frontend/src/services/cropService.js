import apiClient from './api.js';

export const cropService = {
  getAll: async (params = {}) => {
    const res = await apiClient.get('/crops', { params });
    return { data: res.data, meta: res.meta };
  },

  getById: async (id) => {
    const res = await apiClient.get(`/crops/${id}`);
    return res.data;
  },

  create: async (cropData) => {
    const res = await apiClient.post('/crops', cropData);
    return res.data;
  },

  update: async (id, cropData) => {
    const res = await apiClient.put(`/crops/${id}`, cropData);
    return res.data;
  },

  delete: async (id) => {
    const res = await apiClient.delete(`/crops/${id}`);
    return res.data;
  },
};

export default cropService;
