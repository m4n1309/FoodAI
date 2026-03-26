import httpClient from './httpClient.js';

const kitchenService = {
  // Lấy danh sách các order cần bếp làm
  getActiveOrders: () => httpClient.get('/kitchen/orders'),
  
  // Cập nhật trạng thái món ăn
  updateItemStatus: (itemId, status) => 
    httpClient.patch(`/kitchen/items/${itemId}/status`, { status }),
};

export default kitchenService;
