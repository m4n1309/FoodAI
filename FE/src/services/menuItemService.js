import httpClient from './httpClient.js';

const menuItemService = {
  getAll: (params = {}) => httpClient.get('/menu-items', { params }),
  getById: (id) => httpClient.get(`/menu-items/${id}`),
  getFeatured: (params = {}) => httpClient.get('/menu-items/featured', { params }),
  create: (data) => httpClient.post('/menu-items', data),
  update: (id, data) => httpClient.put(`/menu-items/${id}`, data),
  delete: (id) => httpClient.delete(`/menu-items/${id}`),
  toggleAvailability: (id) => httpClient.patch(`/menu-items/${id}/availability`),
  toggleFeatured: (id) => httpClient.patch(`/menu-items/${id}/featured`)
};

export default menuItemService;
