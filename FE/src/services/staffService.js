import httpClient from './httpClient.js';

const staffService = {
  getAll: (params) => httpClient.get('/staffs', { params }),
  getById: (id) => httpClient.get(`/staffs/${id}`),
  create: (data) => httpClient.post('/staffs', data),
  update: (id, data) => httpClient.put(`/staffs/${id}`, data),
  delete: (id) => httpClient.delete(`/staffs/${id}`)
};

export default staffService;
