import httpClient from './httpClient.js';

const tableService = {
  getAll: (params) => httpClient.get('/tables', { params }),
  getById: (id) => httpClient.get(`/tables/${id}`),
  getByQRCode: (qrCode) => httpClient.get(`/tables/qr/${qrCode}`),
  create: (data) => httpClient.post('/tables', data),
  update: (id, data) => httpClient.put(`/tables/${id}`, data),
  delete: (id) => httpClient.delete(`/tables/${id}`),
  updateStatus: (id, status) => httpClient.patch(`/tables/${id}/status`, { status }),
  generateQRCode: (id, options = {}) => httpClient.post(`/tables/${id}/qr-code`, options),
  getStatusSummary: (restaurantId) => httpClient.get('/tables/status/summary', {
    params: { restaurantId }
  })
};

export default tableService;
