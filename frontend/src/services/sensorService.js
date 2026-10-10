import apiClient from './api.js';

export const sensorService = {
  getAll: async (params = {}) => {
    const res = await apiClient.get('/sensors', { params });
    return { data: res.data, meta: res.meta };
  },

  getById: async (id) => {
    const res = await apiClient.get(`/sensors/${id}`);
    return res.data;
  },

  create: async (sensorData) => {
    const res = await apiClient.post('/sensors', sensorData);
    return res.data;
  },

  update: async (id, sensorData) => {
    const res = await apiClient.put(`/sensors/${id}`, sensorData);
    return res.data;
  },

  delete: async (id) => {
    const res = await apiClient.delete(`/sensors/${id}`);
    return res.data;
  },
};

export default sensorService;
