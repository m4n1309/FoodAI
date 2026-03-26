import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { useAuth } from '../../hooks/useAuth.js';
import { useSocket } from '../../hooks/useSocket.js';
import kitchenService from '../../services/kitchenService.js';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const KitchenPage = () => {
  const { user } = useAuth();
  const socket = useSocket();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await kitchenService.getActiveOrders();
      setOrders(response.data || []);
    } catch (error) {
      console.error('Fetch kitchen orders error:', error);
      toast.error('Không thể tải danh sách món chờ nấu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.restaurantId) fetchOrders();
  }, [user?.restaurantId, fetchOrders]);

  useEffect(() => {
    if (!socket) return;
    
    const handleRefresh = () => {
      fetchOrders();
    };

    // Listen to events that affect kitchen
    socket.on('order_placed', handleRefresh);
    socket.on('order_updated', handleRefresh); // When waiter confirms an order
    socket.on('item_status_changed', handleRefresh); // Just in case another kitchen staff updates it

    return () => {
      socket.off('order_placed', handleRefresh);
      socket.off('order_updated', handleRefresh);
      socket.off('item_status_changed', handleRefresh);
    };
  }, [socket, fetchOrders]);

  const handleUpdateItem = async (itemId, status) => {
    try {
      await kitchenService.updateItemStatus(itemId, status);
      // Let socket event trigger the refresh or do it optimistically
      fetchOrders();
    } catch (error) {
      toast.error('Không thể cập nhật món');
    }
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    preparing: 'bg-blue-100 text-blue-800',
    ready: 'bg-green-100 text-green-800',
  };

  const statusLabels = {
    pending: 'Chờ nấu',
    preparing: 'Đang nấu',
    ready: 'Đã xong'
  };

  return (
    <AdminLayout title="Bảng Điều Khiển Bếp (KDS)">
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 text-lg">Tuyệt vời! Hiện không có đơn hàng nào cần nấu.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
          {orders.map((order) => (
            <div key={order.id} className="card bg-white shadow-md border-t-4 border-t-primary-500 flex flex-col h-full">
              <div className="border-b pb-3 mb-3">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-lg text-gray-900 border-b-2 border-primary-200 pb-1">Bàn {order.table?.tableNumber || 'N/A'}</h3>
                  <span className="text-sm font-medium text-gray-500">
                    {format(new Date(order.createdAt || order.created_at || new Date()), 'HH:mm', { locale: vi })}
                  </span>
                </div>
                <p className="text-sm text-gray-600">Đơn: #{order.orderNumber.slice(-6)}</p>
                {order.customerNote && (
                  <p className="mt-2 text-sm bg-yellow-50 text-yellow-800 p-2 rounded">
                    <strong>Ghi chú đơn:</strong> {order.customerNote}
                  </p>
                )}
              </div>

              <div className="flex-1 space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold text-gray-900 flex-1">
                        <span className="bg-white rounded px-2 py-0.5 border mr-2 text-primary-700">{item.quantity}x</span>
                        {item.itemName}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ml-2 ${statusColors[item.itemStatus]}`}>
                        {statusLabels[item.itemStatus] || item.itemStatus}
                      </span>
                    </div>

                    {item.specialInstructions && (
                      <p className="text-xs text-red-600 mb-2 italic">⚠️ {item.specialInstructions}</p>
                    )}

                    <div className="flex gap-2 mt-2 pt-2 border-t border-gray-200">
                      {item.itemStatus === 'pending' && (
                        <button
                          onClick={() => handleUpdateItem(item.id, 'preparing')}
                          className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1.5 rounded text-sm font-medium transition-colors border border-blue-200"
                        >
                          Nấu món này
                        </button>
                      )}
                      {(item.itemStatus === 'pending' || item.itemStatus === 'preparing') && (
                        <button
                          onClick={() => handleUpdateItem(item.id, 'ready')}
                          className="flex-1 bg-green-500 text-white hover:bg-green-600 px-2 py-1.5 rounded text-sm font-medium transition-colors shadow-sm"
                        >
                          Hoàn thành
                        </button>
                      )}
                      {item.itemStatus === 'ready' && (
                        <span className="flex-1 text-center text-sm text-gray-400 py-1.5 line-through">
                          Đã chuyển lên
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default KitchenPage;
