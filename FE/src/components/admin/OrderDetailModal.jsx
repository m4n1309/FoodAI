import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const OrderDetailModal = ({ isOpen, onClose, order, onUpdateStatus, loading }) => {
  const [updating, setUpdating] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  if (!isOpen || !order) return null;

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const statusMap = {
    pending: { label: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-800' },
    confirmed: { label: 'Đã xác nhận', color: 'bg-blue-100 text-blue-800' },
    preparing: { label: 'Đang nấu', color: 'bg-indigo-100 text-indigo-800' },
    ready: { label: 'Lên món', color: 'bg-orange-100 text-orange-800' },
    serving: { label: 'Đang phục vụ', color: 'bg-teal-100 text-teal-800' },
    completed: { label: 'Hoàn thành', color: 'bg-green-100 text-green-800' },
    cancelled: { label: 'Đã huỷ', color: 'bg-red-100 text-red-800' },
  };

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    await onUpdateStatus(order.id, newStatus, cancelReason);
    setUpdating(false);
  };

  const items = order.items || [];

  return (
    <Transition appear show={isOpen} as={Fragment}>
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
          <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <Dialog.Title className="text-xl font-bold text-gray-900">
                      Đơn hàng #{order.orderNumber}
                    </Dialog.Title>
                    <p className="text-sm text-gray-500 mt-1">
                      {format(new Date(order.createdAt || order.created_at || new Date()), 'dd/MM/yyyy HH:mm', { locale: vi })}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusMap[order.orderStatus]?.color}`}>
                    {statusMap[order.orderStatus]?.label || order.orderStatus}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500 mb-1">Bàn ăn</p>
                    <p className="font-semibold text-gray-900">Bàn {order.table?.tableNumber || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500 mb-1">Khách hàng</p>
                    <p className="font-semibold text-gray-900">{order.customerName || 'Khách vãng lai'}</p>
                    {order.customerPhone && <p className="text-gray-600">{order.customerPhone}</p>}
                  </div>
                </div>

                {order.customerNote && (
                  <div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg mb-6 text-sm">
                    <strong>Ghi chú:</strong> {order.customerNote}
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="font-bold text-gray-900 mb-3 border-b pb-2">Danh sách món ({items.length})</h3>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">
                            {item.quantity} × {item.itemName}
                          </p>
                          {item.specialInstructions && (
                            <p className="text-xs text-red-500 mt-0.5">Note: {item.specialInstructions}</p>
                          )}
                        </div>
                        <p className="font-medium text-gray-900">
                          {formatMoney(item.totalPrice)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4 mb-6">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Tạm tính</span>
                      <span>{formatMoney(order.subtotal)}</span>
                    </div>
                    {Number(order.taxAmount) > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Thuế</span>
                        <span>{formatMoney(order.taxAmount)}</span>
                      </div>
                    )}
                    {Number(order.serviceCharge) > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Phí phục vụ</span>
                        <span>{formatMoney(order.serviceCharge)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t">
                      <span>Tổng cộng</span>
                      <span className="text-blue-600">{formatMoney(order.totalAmount)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-end">
                  <div className="flex-1 mr-4">
                    {order.orderStatus !== 'cancelled' && order.orderStatus !== 'completed' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cập nhật trạng thái</label>
                        <div className="flex gap-2 flex-wrap">
                          {order.orderStatus === 'pending' && (
                            <button
                              onClick={() => handleStatusChange('confirmed')}
                              disabled={updating || loading}
                              className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700"
                            >
                              Xác nhận
                            </button>
                          )}
                          {(order.orderStatus === 'confirmed' || order.orderStatus === 'pending') && (
                            <button
                              onClick={() => handleStatusChange('preparing')}
                              disabled={updating || loading}
                              className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-indigo-700"
                            >
                              Báo bếp nấu
                            </button>
                          )}
                          {order.orderStatus === 'preparing' && (
                            <button
                              onClick={() => handleStatusChange('ready')}
                              disabled={updating || loading}
                              className="bg-orange-500 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-orange-600"
                            >
                              Hoàn thành món
                            </button>
                          )}
                          {(order.orderStatus === 'ready' || order.orderStatus === 'preparing') && (
                            <button
                              onClick={() => handleStatusChange('serving')}
                              disabled={updating || loading}
                              className="bg-teal-500 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-teal-600"
                            >
                              Mang ra bàn
                            </button>
                          )}
                          {order.orderStatus === 'serving' && (
                            <button
                              onClick={() => handleStatusChange('completed')}
                              disabled={updating || loading}
                              className="bg-green-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-green-700"
                            >
                              Khách đã thanh toán
                            </button>
                          )}
                          
                          {/* Huỷ đơn (show input nếu click hoặc chỉ có nút) */}
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Lý do huỷ..."
                              value={cancelReason}
                              onChange={(e) => setCancelReason(e.target.value)}
                              className="border border-gray-300 px-2 py-1 rounded text-sm"
                            />
                            <button
                              onClick={() => handleStatusChange('cancelled')}
                              disabled={updating || loading || !cancelReason.trim()}
                              className="bg-red-500 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-red-600 disabled:opacity-50"
                            >
                              Huỷ đơn
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    {order.orderStatus === 'cancelled' && (
                      <div className="text-red-600 text-sm">
                        <strong>Lý do huỷ:</strong> {order.cancelledReason || 'Không có'}
                      </div>
                    )}
                  </div>
                  
                  <button
                    type="button"
                    onClick={onClose}
                    className="border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50"
                  >
                    Đóng
                  </button>
                </div>
                
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default OrderDetailModal;
