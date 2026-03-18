import axiosClient from './axiosClient';

const customerApi = {
  bootstrap: (qrCode) =>
    axiosClient.get('/customer/bootstrap', { params: { qrCode } }),

  createOrGetCart: ({ restaurantId, tableId }) =>
    axiosClient.post('/customer/cart', { restaurantId, tableId }),

  getCart: ({ restaurantId, tableId }) =>
    axiosClient.get('/customer/cart', { params: { restaurantId, tableId } }),

  addCartItem: (payload) =>
    axiosClient.post('/customer/cart/items', payload),

  updateCartItem: (id, payload) =>
    axiosClient.patch(`/customer/cart/items/${id}`, payload),

  removeCartItem: (id) =>
    axiosClient.delete(`/customer/cart/items/${id}`),
};

export default customerApi;