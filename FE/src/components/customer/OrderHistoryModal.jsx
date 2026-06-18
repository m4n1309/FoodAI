import { Fragment, useState, useEffect, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, CalendarDaysIcon, ArrowLeftStartOnRectangleIcon, SparklesIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import customerApi from '../../services/customerService.js';
import toast from 'react-hot-toast';
import PropTypes from 'prop-types';
import ReviewModal from './ReviewModal.jsx';

const formatMoney = (v) => Number(v || 0).toLocaleString('vi-VN') + 'đ';

const OrderHistoryModal = ({ open, onClose, phone, onLogout }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [activeReviewOrder, setActiveReviewOrder] = useState(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await customerApi.getOrderHistory(phone);
      setData(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải lịch sử đặt món');
    } finally {
      setLoading(false);
    }
  }, [phone]);

  useEffect(() => {
    if (open && phone) {
      fetchHistory();
    }
  }, [open, phone, fetchHistory]);

  const statusMap = {
    pending: { label: 'Chờ xác nhận', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
    confirmed: { label: 'Đã xác nhận', color: 'text-blue-700 bg-blue-50 border-blue-200' },
    preparing: { label: 'Đang nấu', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
    ready: { label: 'Chờ phục vụ', color: 'text-orange-700 bg-orange-50 border-orange-200' },
    serving: { label: 'Đang phục vụ', color: 'text-teal-700 bg-teal-50 border-teal-200' },
    completed: { label: 'Hoàn thành', color: 'text-green-700 bg-green-50 border-green-200' },
    cancelled: { label: 'Đã hủy', color: 'text-red-700 bg-red-50 border-red-200' },
  };

  if (!open) return null;

  const customer = data?.customer;
  const orders = data?.orders || [];

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-primary-950/40 backdrop-blur-md" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 translate-y-4"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-4"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-[2.5rem] bg-gradient-to-b from-white to-orange-50/20 p-6 shadow-2xl transition-all border border-orange-100 flex flex-col max-h-[85vh]">
                
                {/* Header */}
                <div className="flex justify-between items-center mb-6 pb-2 border-b border-orange-100">
                  <Dialog.Title className="text-xl font-black text-gray-900 flex items-center gap-2">
                    <SparklesIcon className="w-6 h-6 text-primary-600 animate-pulse" />
                    Thành viên & Lịch sử
                  </Dialog.Title>
                  <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors">
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {loading && !data ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600"></div>
                    <p className="mt-4 text-xs font-bold text-gray-500">Đang tải lịch sử đặt món...</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto pr-1 space-y-6 custom-scrollbar">
                    
                    {/* Membership Card */}
                    {customer && (
                      <div className="bg-gradient-to-br from-primary-900 via-primary-850 to-primary-950 text-white rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-8 -translate-y-8"></div>
                        <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full"></div>
                        
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <p className="text-xs font-bold text-primary-300 uppercase tracking-widest leading-none">Thẻ Thành Viên</p>
                            <h3 className="text-xl font-black mt-2 leading-tight">{customer.fullName}</h3>
                            <p className="text-xs text-primary-200/80 font-medium mt-1">{customer.phone}</p>
                          </div>
                          <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 flex items-center gap-1.5">
                            <span className="text-amber-400 font-bold text-sm">🏆</span>
                            <span className="text-xs font-black tracking-wide">{customer.loyaltyPoints} Điểm</span>
                          </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                          <div>
                            <span className="text-[10px] font-bold text-primary-300 uppercase tracking-wider block">Tổng đơn đặt</span>
                            <span className="text-lg font-black block mt-0.5">{customer.totalOrders} đơn</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-primary-300 uppercase tracking-wider block">Đã chi tiêu</span>
                            <span className="text-lg font-black block mt-0.5">{formatMoney(customer.totalSpent)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Order History Title */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <ShoppingBagIcon className="w-4 h-4" /> Lịch sử đơn hàng ({orders.length})
                      </h4>

                      {orders.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
                          <p className="text-sm text-gray-400 font-semibold">Chưa có đơn hàng nào.</p>
                          <p className="text-xs text-gray-400 mt-1">Các món bạn đặt sẽ được lưu trữ tại đây.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {orders.map((order) => (
                            <div key={order.id} className="bg-white rounded-3xl p-4 border border-orange-100 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <span className="text-xs font-bold text-gray-900">#{order.orderNumber}</span>
                                  <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5 font-medium">
                                    <CalendarDaysIcon className="w-3.5 h-3.5" />
                                    <span>
                                      {new Date(order.createdAt || order.created_at).toLocaleDateString('vi-VN', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric'
                                      })}
                                    </span>
                                    <span>•</span>
                                    <span>
                                      {new Date(order.createdAt || order.created_at).toLocaleTimeString('vi-VN', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                </div>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusMap[order.orderStatus]?.color || 'bg-gray-50 text-gray-700'}`}>
                                  {statusMap[order.orderStatus]?.label || order.orderStatus}
                                </span>
                              </div>

                              {/* Items list */}
                              <div className="space-y-1 py-2 border-t border-b border-gray-50">
                                {order.items?.map((item) => (
                                  <div key={item.id} className="flex justify-between text-xs text-gray-600 font-medium">
                                    <span className={item.itemStatus === 'cancelled' ? 'line-through opacity-50' : ''}>
                                      x{item.quantity} {item.itemName}
                                    </span>
                                    <span className={item.itemStatus === 'cancelled' ? 'line-through opacity-50' : ''}>
                                      {formatMoney(item.totalPrice)}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {/* Footer */}
                              <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50 text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400 font-medium">Bàn {order.table?.tableNumber || 'N/A'}</span>
                                  {order.orderStatus === 'completed' && (
                                    <button
                                      onClick={() => setActiveReviewOrder(order)}
                                      className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] transition-colors flex items-center gap-1 shadow-sm"
                                    >
                                      ⭐ Đánh giá
                                    </button>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400 font-semibold">Tổng:</span>
                                  <span className="font-bold text-primary-700">{formatMoney(order.totalAmount)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Logout/Switch Button */}
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          if (window.confirm('Bạn có muốn đổi tài khoản tích điểm khác không?')) {
                            onLogout();
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-all active:scale-98"
                      >
                        <ArrowLeftStartOnRectangleIcon className="w-4 h-4 stroke-2" />
                        Đổi tài khoản tích điểm
                      </button>
                    </div>

                  </div>
                )}

              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
      <ReviewModal 
        isOpen={!!activeReviewOrder} 
        onClose={() => setActiveReviewOrder(null)} 
        restaurantId={activeReviewOrder?.restaurantId ? String(activeReviewOrder.restaurantId) : undefined}
        order={activeReviewOrder} 
      />
    </Transition>
  );
};

OrderHistoryModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  phone: PropTypes.string,
  onLogout: PropTypes.func.isRequired,
};

export default OrderHistoryModal;
