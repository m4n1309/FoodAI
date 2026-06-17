import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import OrderDetailModal from '../../components/admin/OrderDetailModal';
import { useAuth } from '../../hooks/useAuth.js';
import orderService from '../../services/orderService.js';
import tableApi from '../../services/tableService.js';
import toast from 'react-hot-toast';
import { useSocket } from '../../hooks/useSocket.js';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { MagnifyingGlassIcon, ArrowPathIcon, PlusIcon } from '@heroicons/react/24/outline';
import { playNotificationSound } from '../../utils/sound.js';

const OrdersPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  const socket = useSocket();

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  
  // Custom polling interval (refreshes data every 10s)
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: pageSize,
      };

      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (filterStatus !== 'all') params.status = filterStatus;

      const response = await orderService.getAll(params);
      setOrders(response.data.orders || []);
      setTotalItems(response.data.total || 0);
      setTotalPages(response.data.totalPages || 1);
      setLastRefreshed(new Date());
    } catch (error) {
      console.error('Fetch orders error:', error);
      toast.error('Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, searchTerm, currentPage, pageSize]);

  useEffect(() => {
    if (user?.restaurantId) {
      fetchOrders();
    }
  }, [user?.restaurantId, fetchOrders]);

  // Polling every 2 seconds for new orders
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (user?.restaurantId) {
        // Fetch quietly (no loading state to prevent flickering)
        const params = { page: currentPage, limit: pageSize };
        if (searchTerm.trim()) params.search = searchTerm.trim();
        if (filterStatus !== 'all') params.status = filterStatus;

        orderService.getAll(params).then(res => {
          const freshOrders = res.data.orders || [];
          setOrders(freshOrders);
          setTotalItems(res.data.total || 0);
          setTotalPages(res.data.totalPages || 1);
          setLastRefreshed(new Date());
          
          // Update selectedOrder if modal is open to keep details fresh
          setSelectedOrder(prev => {
            if (!prev) return prev;
            const updated = freshOrders.find(o => o.id === prev.id);
            return updated ? updated : prev;
          });
        }).catch(err => console.error('Silent fetch failed:', err));
      }
    }, 2000);
    return () => clearInterval(intervalId);
  }, [user?.restaurantId, filterStatus, searchTerm, currentPage, pageSize]);

  // Real-time socket listener for payment updates and order modifications
  useEffect(() => {
    if (!socket || !user?.restaurantId) return;

    const handleGlobalPaymentUpdate = (data) => {
      // Immediately refresh the orders board
      fetchOrders();
    };

    const handleOrderUpdated = () => {
      fetchOrders();
    };

    socket.on('order_payment_updated', handleGlobalPaymentUpdate);
    socket.on('order_updated', handleOrderUpdated);
    socket.on('payment_requested', handleOrderUpdated);
    socket.on('item_status_changed', handleOrderUpdated);

    return () => {
      socket.off('order_payment_updated', handleGlobalPaymentUpdate);
      socket.off('order_updated', handleOrderUpdated);
      socket.off('payment_requested', handleOrderUpdated);
      socket.off('item_status_changed', handleOrderUpdated);
    };
  }, [socket, user?.restaurantId, fetchOrders]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const handleOpenModal = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleUpdateStatus = async (orderId, status, cancelledReason) => {
    try {
      setModalLoading(true);
      const res = await orderService.updateStatus(orderId, status, cancelledReason);
      toast.success('Cập nhật trạng thái thành công');
      
      // Update the selected order if modal is still open
      setSelectedOrder(res.data);
      // Refresh list
      fetchOrders();
    } catch (error) {
      const message = error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật đơn';
      toast.error(message);
    } finally {
      setModalLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-indigo-100 text-indigo-800',
      ready: 'bg-orange-100 text-orange-800',
      serving: 'bg-teal-100 text-teal-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    const labels = {
      pending: 'Chờ xác nhận',
      confirmed: 'Đã xác nhận',
      preparing: 'Đang nấu',
      ready: 'Lên món',
      serving: 'Đang phục vụ',
      completed: 'Hoàn thành',
      cancelled: 'Đã huỷ',
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${badges[status] || 'bg-gray-100'}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <AdminLayout title="Quản lý Đơn hàng">
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 mb-4">
          <div className="flex-1 max-w-lg flex gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Tìm mã đơn, tên khách..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-field max-w-[180px]"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chờ xác nhận</option>
              <option value="confirmed">Đã xác nhận</option>
              <option value="preparing">Đang nấu</option>
              <option value="ready">Lên món</option>
              <option value="serving">Đang phục vụ</option>
              <option value="completed">Hoàn thành</option>
              <option value="cancelled">Đã huỷ</option>
            </select>
          </div>

          <div className="flex items-center text-sm text-gray-500">
            <button
              onClick={() => navigate('/admin/dashboard?openPOS=true')}
              className="btn-primary flex items-center justify-center py-2 px-4 text-xs font-bold whitespace-nowrap shadow-md shadow-primary-500/10 mr-4"
            >
              <PlusIcon className="h-4 w-4 mr-1.5" />
              Đặt món tại bàn
            </button>
            <span className="mr-3 hidden sm:inline">Tự động làm mới mỗi 10s</span>
            <button
              onClick={fetchOrders}
              className="btn-secondary flex items-center justify-center p-2"
              title="Làm mới ngay"
            >
              <ArrowPathIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">
            {searchTerm || filterStatus !== 'all'
              ? 'Không tìm thấy đơn hàng nào phù hợp'
              : 'Chưa có đơn hàng nào'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="card hover:shadow-lg transition-shadow cursor-pointer border-l-4"
              style={{
                borderLeftColor: 
                  order.orderStatus === 'pending' ? '#EAB308' :
                  order.orderStatus === 'completed' ? '#22C55E' :
                  order.orderStatus === 'cancelled' ? '#EF4444' : '#3B82F6'
              }}
              onClick={() => handleOpenModal(order)}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-sm font-bold text-gray-900 border-b pb-1">#{order.orderNumber}</h3>
                {getStatusBadge(order.orderStatus)}
              </div>
              <div className="text-sm text-gray-600 space-y-1 mb-3">
                <p><strong>Thời gian:</strong> {format(new Date(order.createdAt || order.created_at || new Date()), 'HH:mm (dd/MM)', { locale: vi })}</p>
                <p><strong>Bàn:</strong> {order.table?.tableNumber || 'N/A'}</p>
                {order.customerName && <p><strong>Khách:</strong> {order.customerName}</p>}
                <p><strong>Số món:</strong> {(order.items || []).length}</p>
              </div>
              <div className="text-right border-t pt-2">
                <span className="text-lg font-bold text-blue-600">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalAmount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
          <p className="text-sm text-gray-600">
            Trang {currentPage}/{totalPages} - Tổng {totalItems} đơn
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trước
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sau
            </button>
          </div>
        </div>
      )}

      <OrderDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        order={selectedOrder}
        onUpdateStatus={handleUpdateStatus}
        loading={modalLoading}
      />
    </AdminLayout>
  );
};

export default OrdersPage;
