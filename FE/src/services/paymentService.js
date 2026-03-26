import httpClient from './httpClient.js';

const paymentService = {
  // Lấy lịch sử giao dịch của 1 order
  getPaymentHistory: (orderId) => httpClient.get(`/orders/${orderId}/payments`),
  
  // Tạo thanh toán mới
  createPayment: (orderId, paymentData) => 
    httpClient.post(`/orders/${orderId}/payments`, paymentData),
};

export default paymentService;
