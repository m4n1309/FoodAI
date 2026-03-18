import httpClient from './httpClient.js';

const customerService = {
  bootstrap: (qrCode) => httpClient.get('/customer/bootstrap', { params: { qrCode } }),
  createOrGetCart: ({ restaurantId, tableId }) => httpClient.post('/customer/cart', { restaurantId, tableId }),
  getCart: ({ restaurantId, tableId }) => httpClient.get('/customer/cart', { params: { restaurantId, tableId } }),
  addCartItem: (payload) => httpClient.post('/customer/cart/items', payload),
  updateCartItem: (id, payload) => httpClient.patch(`/customer/cart/items/${id}`, payload),
  removeCartItem: (id) => httpClient.delete(`/customer/cart/items/${id}`)
};

export default customerService;
