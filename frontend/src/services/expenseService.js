import apiClient from './api.js';

export const expenseService = {
  getAll: async (params = {}) => {
    const res = await apiClient.get('/expenses', { params });
    return { data: res.data, meta: res.meta };
  },

  create: async (data) => {
    const res = await apiClient.post('/expenses', data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await apiClient.put(`/expenses/${id}`, data);
    return res.data;
  },

  delete: async (id) => {
    const res = await apiClient.delete(`/expenses/${id}`);
    return res.data;
  },
};

export default expenseService;
