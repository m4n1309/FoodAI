import httpClient from './httpClient.js';

const orderService = {
  // Lấy danh sách đơn hàng cho staff/admin
  getAll: (params) => httpClient.get('/orders', { params }),
  
  // Lấy chi tiết một đơn hàng
  getById: (id) => httpClient.get(`/orders/${id}`),
  
  // Cập nhật trạng thái đơn (pending, confirmed, preparing, ready, serving, completed, cancelled)
  updateStatus: (id, status, cancelledReason) => 
    httpClient.patch(`/orders/${id}/status`, { status, cancelledReason }),
};

export default orderService;
