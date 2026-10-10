import apiClient from './api.js';

export const fieldService = {
  getAll: async (params = {}) => {
    const res = await apiClient.get('/fields', { params });
    return { data: res.data, meta: res.meta };
  },

  getById: async (id) => {
    const res = await apiClient.get(`/fields/${id}`);
    return res.data;
  },

  create: async (fieldData) => {
    const res = await apiClient.post('/fields', fieldData);
    return res.data;
  },

  update: async (id, fieldData) => {
    const res = await apiClient.put(`/fields/${id}`, fieldData);
    return res.data;
  },

  delete: async (id) => {
    const res = await apiClient.delete(`/fields/${id}`);
    return res.data;
  },
};

export default fieldService;
