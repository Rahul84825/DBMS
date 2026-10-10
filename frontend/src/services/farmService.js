import apiClient from './api.js';

export const farmService = {
  getAll: async (params = {}) => {
    const res = await apiClient.get('/farms', { params });
    return { data: res.data, meta: res.meta };
  },

  getById: async (id) => {
    const res = await apiClient.get(`/farms/${id}`);
    return res.data;
  },

  create: async (farmData) => {
    const res = await apiClient.post('/farms', farmData);
    return res.data;
  },

  update: async (id, farmData) => {
    const res = await apiClient.put(`/farms/${id}`, farmData);
    return res.data;
  },

  delete: async (id) => {
    const res = await apiClient.delete(`/farms/${id}`);
    return res.data;
  },
};

export default farmService;
