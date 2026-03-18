import httpClient from './httpClient.js';

const categoryService = {
  getAll: (params = {}) => httpClient.get('/categories', { params }),
  getById: (id) => httpClient.get(`/categories/${id}`),
  create: (data) => httpClient.post('/categories', data),
  update: (id, data) => httpClient.put(`/categories/${id}`, data),
  delete: (id) => httpClient.delete(`/categories/${id}`),
  toggleStatus: (id) => httpClient.patch(`/categories/${id}/toggle`),
  reorder: (categoryIds) => httpClient.patch('/categories/reorder', { categoryIds })
};

export default categoryService;
