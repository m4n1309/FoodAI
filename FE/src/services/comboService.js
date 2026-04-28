import httpClient from './httpClient.js';

const comboApi = {
  getAll: (params) => httpClient.get('/combos', { params }),
  getById: (id) => httpClient.get(`/combos/${id}`),
  create: (data) => httpClient.post('/combos', data),
  update: (id, data) => httpClient.put(`/combos/${id}`, data),
  delete: (id) => httpClient.delete(`/combos/${id}`),
  toggleAvailability: (id) => httpClient.patch(`/combos/${id}/toggle-availability`),
};

export default comboApi;
