import httpClient from './httpClient.js';

const customerService = {
  bootstrap: (qrCode) => httpClient.get('/customer/bootstrap', { params: { qrCode } }),
  createOrGetCart: ({ restaurantId, tableId }) => httpClient.post('/customer/cart', { restaurantId, tableId }),
  getCart: ({ restaurantId, tableId }) => httpClient.get('/customer/cart', { params: { restaurantId, tableId } }),
  addCartItem: (payload) => httpClient.post('/customer/cart/items', payload),
  updateCartItem: (id, payload) => httpClient.patch(`/customer/cart/items/${id}`, payload),
  removeCartItem: (id) => httpClient.delete(`/customer/cart/items/${id}`),
  placeOrder: (payload) => httpClient.post('/customer/orders', payload),
  validatePromotion: (payload) => httpClient.post('/promotions/validate', payload),
  submitReview: (payload) => httpClient.post('/reviews', payload),
  submitMenuItemReview: (payload) => httpClient.post('/reviews/menu-item', payload),
  getRestaurantReviews: (restaurantId, params) => httpClient.get(`/reviews/restaurant/${restaurantId}`, { params }),
  getMenuItemReviews: (menuItemId, params) => httpClient.get(`/reviews/menu-item/${menuItemId}`, { params }),
  getAvailablePromotions: (restaurantId) => httpClient.get(`/promotions/public/${restaurantId}`)
};

export default customerService;
