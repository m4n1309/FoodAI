import httpClient from './httpClient.js';

const promotionService = {
  getAll: (params = {}) => httpClient.get('/promotions', { params }),
  getById: (id) => httpClient.get(`/promotions/${id}`),
  create: (data) => httpClient.post('/promotions', data),
  update: (id, data) => httpClient.put(`/promotions/${id}`, data),
  delete: (id) => httpClient.delete(`/promotions/${id}`)
};

export default promotionService;
