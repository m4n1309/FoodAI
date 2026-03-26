import { Fragment, useState, useEffect, useRef } from 'react';
import { Dialog, Transition, Tab } from '@headlessui/react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import paymentService from '../../services/paymentService.js';
import toast from 'react-hot-toast';
import InvoicePrintTemplate from './InvoicePrintTemplate.jsx';
import { useReactToPrint } from 'react-to-print';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const OrderDetailModal = ({ isOpen, onClose, order, onUpdateStatus, loading }) => {
  const [updating, setUpdating] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  
  // Payment States
  const [payments, setPayments] = useState([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('');

  const printRef = useRef();

  useEffect(() => {
    if (isOpen && order) {
      setPayMethod('');
      loadPayments();
    }
  }, [isOpen, order]);

  // Sync payAmount with remaining after loading payments
  useEffect(() => {
    if (isOpen && order) {
      const currentTotalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
      const remaining = Math.max(0, Number(order.totalAmount) - currentTotalPaid);
      setPayAmount(remaining);
    }
  }, [isOpen, order, payments]);

  const loadPayments = async () => {
    try {
      setPaymentLoading(true);
      const res = await paymentService.getPaymentHistory(order.id);
      setPayments(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Không thể lấy lịch sử thanh toán');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleCreatePayment = async () => {
    if (!payMethod) return toast.error('Vui lòng chọn hình thức thanh toán');
    if (!payAmount || Number(payAmount) <= 0) return toast.error('Số tiền không hợp lệ');
    if (Number(payAmount) > remainingRemaining) {
      return toast.error('Số tiền thu không được lớn hơn số tiền còn nợ của đơn hàng!');
    }

    try {
      setPaymentLoading(true);
      await paymentService.createPayment(order.id, {
        amount: payAmount,
        paymentMethod: payMethod
      });
      toast.success('Thanh toán thành công!');
      // Refresh list
      await loadPayments();
      // Optional: Auto mark order complete if fully paid 
      // (This updates order state out of bound, next refresh in parent will catch it)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi khi thanh toán');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `HoaDon-${order?.orderNumber}`,
  });

  // Fallback print if react-to-print is not installed
  const legacyPrint = () => {
    const printContent = printRef.current.innerHTML;
    const windowPrint = window.open('', '', 'width=800,height=600');
    windowPrint.document.write(`
      <html>
        <head>
          <title>In Hóa Đơn</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body onload="window.print(); window.close();">
          ${printContent}
        </body>
      </html>
    `);
    windowPrint.document.close();
  };

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
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const remainingRemaining = Math.max(0, Number(order.totalAmount) - totalPaid);

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
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-6 pb-4 border-b flex justify-between items-start">
                  <div>
                    <Dialog.Title className="text-xl font-bold text-gray-900">
                      Đơn hàng #{order.orderNumber}
                    </Dialog.Title>
                    <p className="text-sm text-gray-500 mt-1">
                      {format(new Date(order.createdAt || order.created_at || new Date()), 'dd/MM/yyyy HH:mm', { locale: vi })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusMap[order.orderStatus]?.color}`}>
                      {statusMap[order.orderStatus]?.label || order.orderStatus}
                    </span>
                    {order.paymentStatus === 'paid' && (
                       <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                         Đã Thanh Toán Khách
                       </span>
                    )}
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex-1 overflow-y-auto">
                  <Tab.Group>
                    <Tab.List className="flex space-x-1 border-b px-6 pt-2 bg-gray-50 sticky top-0 z-10">
                      <Tab className={({ selected }) =>
                          classNames(
                            'px-4 py-2.5 text-sm font-medium leading-5 rounded-t-lg focus:outline-none',
                            selected
                              ? 'bg-white text-blue-700 border-t border-l border-r border-gray-200'
                              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                          )
                        }
                      >
                        Chi tiết phục vụ
                      </Tab>
                      <Tab className={({ selected }) =>
                          classNames(
                            'px-4 py-2.5 text-sm font-medium leading-5 rounded-t-lg focus:outline-none flex gap-2 items-center',
                            selected
                              ? 'bg-white text-blue-700 border-t border-l border-r border-gray-200'
                              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                          )
                        }
                      >
                        Thanh toán & Hóa đơn
                        {totalPaid > 0 && <span className="bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">Paid</span>}
                      </Tab>
                    </Tab.List>
                    
                    <Tab.Panels className="p-6">
                      
                      {/* TAB 1: ORDER DETAILS */}
                      <Tab.Panel>
                        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                          <div className="bg-gray-50 p-3 rounded-lg border">
                            <p className="text-gray-500 mb-1">Bàn ăn</p>
                            <p className="font-semibold text-gray-900">Bàn {order.table?.tableNumber || 'N/A'}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg border">
                            <p className="text-gray-500 mb-1">Khách hàng</p>
                            <p className="font-semibold text-gray-900">{order.customerName || 'Khách vãng lai'}</p>
                            {order.customerPhone && <p className="text-gray-600">{order.customerPhone}</p>}
                          </div>
                        </div>

                        {order.customerNote && (
                          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg mb-6 text-sm">
                            <strong>Ghi chú:</strong> {order.customerNote}
                          </div>
                        )}

                        <div className="mb-6">
                          <h3 className="font-bold text-gray-900 mb-3 border-b pb-2">Danh sách món ({items.length})</h3>
                          <div className="space-y-3">
                            {items.map((item) => (
                              <div key={item.id} className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium text-gray-900">
                                    <span className="inline-block w-6 font-bold text-gray-500">{item.quantity}×</span> 
                                    {item.itemName}
                                  </p>
                                  {item.specialInstructions && (
                                    <p className="text-xs text-red-500 mt-0.5 ml-6">Note: {item.specialInstructions}</p>
                                  )}
                                </div>
                                <p className="font-medium text-gray-900">
                                  {formatMoney(item.totalPrice)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="border-t pt-4 border-gray-200">
                          <div className="space-y-2 text-sm max-w-sm ml-auto">
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
                              <span>Tổng thanh toán</span>
                              <span className="text-blue-600">{formatMoney(order.totalAmount)}</span>
                            </div>
                          </div>
                        </div>
                      </Tab.Panel>

                      {/* TAB 2: PAYMENT & INVOICE */}
                      <Tab.Panel>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          {/* Payment Form Column */}
                          <div>
                            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                              <span className="bg-blue-100 text-blue-700 p-1 rounded-md">💳</span>
                              Xác nhận thanh toán
                            </h3>

                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-6">
                              <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-500">Tổng tiền đơn hàng:</span>
                                <span className="font-bold">{formatMoney(order.totalAmount)}</span>
                              </div>
                              <div className="flex justify-between text-sm mb-2 text-green-700">
                                <span>Đã thanh toán:</span>
                                <span className="font-bold">{formatMoney(totalPaid)}</span>
                              </div>
                              <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                                <span className="text-gray-900 font-semibold">Còn lại cần thu:</span>
                                <span className="font-bold text-red-600">{formatMoney(remainingRemaining)}</span>
                              </div>
                            </div>

                            {remainingRemaining > 0 ? (
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">Hình thức thanh toán <span className="text-red-500">*</span></label>
                                  <div className="grid grid-cols-2 gap-2">
                                    {['cash', 'bank_transfer', 'card', 'e_wallet'].map(method => (
                                      <button
                                        key={method}
                                        onClick={() => setPayMethod(method)}
                                        className={`px-3 py-2 text-sm rounded-lg border flex justify-center items-center gap-2 transition-all ${payMethod === method ? 'bg-blue-50 border-blue-600 text-blue-700 ring-1 ring-blue-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                      >
                                        {method === 'cash' ? '💵 Tiền mặt' :
                                         method === 'bank_transfer' ? '🏦 Chuyển khoản' :
                                         method === 'card' ? '💳 Thẻ (POS)' : '📱 Ví điện tử'}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền thu</label>
                                  <div className="bg-gray-100 p-3 rounded-lg border border-gray-300 font-bold text-lg text-blue-700">
                                    {formatMoney(payAmount || 0)}
                                  </div>
                                </div>

                                <button
                                  onClick={handleCreatePayment}
                                  disabled={paymentLoading || !payMethod}
                                  className="w-full btn-primary py-3 flex justify-center transition-all disabled:opacity-50"
                                >
                                  {paymentLoading ? 'Đang xử lý...' : `Xác nhận thu ${formatMoney(payAmount || 0)}`}
                                </button>
                              </div>
                            ) : (
                              <div className="bg-green-50 border border-green-200 p-4 rounded-xl text-center text-green-800">
                                <div className="text-2xl mb-2">🎉</div>
                                <strong className="block mb-1">Đơn hàng đã được thanh toán đủ!</strong>
                                <p className="text-sm">Không cần thu thêm.</p>
                              </div>
                            )}

                          </div>

                          {/* History & Print Column */}
                          <div>
                             <div className="flex justify-between items-center mb-4">
                              <h3 className="font-bold text-gray-900 border-l-4 border-primary-500 pl-2">Lịch sử giao dịch</h3>
                              <button 
                                onClick={() => handlePrint()}
                                className="text-sm bg-gray-800 text-white px-3 py-1.5 rounded hover:bg-gray-700 flex items-center gap-1"
                              >
                                🖨️ In hóa đơn
                              </button>
                             </div>

                             {paymentLoading && payments.length === 0 ? (
                               <div className="text-center text-gray-500 py-4">Đang tải...</div>
                             ) : payments.length === 0 ? (
                               <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                 Chưa có giao dịch nào
                               </div>
                             ) : (
                               <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                                 {payments.map(p => (
                                   <div key={p.id} className="p-3 border rounded-lg flex justify-between items-center bg-white shadow-sm">
                                     <div>
                                       <p className="font-bold text-gray-900">{formatMoney(p.amount)}</p>
                                       <p className="text-xs text-gray-500 mt-1">
                                         {format(new Date(p.created_at || p.createdAt), 'HH:mm (dd/MM)', { locale: vi })} • {p.processor?.fullName}
                                       </p>
                                     </div>
                                     <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-700 uppercase font-medium">
                                       {p.paymentMethod}
                                     </span>
                                   </div>
                                 ))}
                               </div>
                             )}
                          </div>
                        </div>

                      </Tab.Panel>
                    </Tab.Panels>
                  </Tab.Group>
                </div>
                
                {/* Footer Logic (Status Actions) */}
                <div className="p-6 border-t bg-gray-50 flex justify-between items-center mt-auto">
                  <div className="flex gap-2 flex-wrap flex-1 mr-4">
                    {order.orderStatus !== 'cancelled' && order.orderStatus !== 'completed' && (
                      <div className="flex gap-2 w-full items-center">
                        {order.orderStatus === 'pending' && (
                          <button
                            onClick={() => handleStatusChange('confirmed')}
                            disabled={updating || loading}
                            className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700 shadow-sm"
                          >
                            Xác nhận đơn
                          </button>
                        )}
                        {order.orderStatus === 'confirmed' && (
                          <button
                            onClick={() => handleStatusChange('preparing')}
                            disabled={updating || loading}
                            className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-indigo-700 shadow-sm"
                          >
                            Báo bếp nấu
                          </button>
                        )}
                        {order.orderStatus === 'preparing' && (
                          <button
                            onClick={() => handleStatusChange('ready')}
                            disabled={updating || loading}
                            className="bg-orange-500 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-orange-600 shadow-sm"
                          >
                            Bếp Lên món
                          </button>
                        )}
                        {order.orderStatus === 'ready' && (
                          <button
                            onClick={() => handleStatusChange('serving')}
                            disabled={updating || loading}
                            className="bg-teal-500 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-teal-600 shadow-sm"
                          >
                            Mang ra bàn
                          </button>
                        )}
                        {order.orderStatus === 'serving' && (
                          <button
                            onClick={() => {
                              if (remainingRemaining > 0) {
                                toast.error('Lỗi: Cần phải thanh toán đủ trước khi hoàn thành đơn!');
                                return;
                              }
                              handleStatusChange('completed');
                            }}
                            disabled={updating || loading}
                            className="bg-green-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-green-700 shadow-sm"
                          >
                            Hoàn thành đơn 
                          </button>
                        )}
                        
                        <div className="h-6 border-l border-gray-300 mx-1"></div>

                        <input
                          type="text"
                          placeholder="Lý do huỷ..."
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          className="border border-gray-300 px-3 py-1.5 rounded text-sm shadow-sm flex-1 max-w-[200px]"
                        />
                        <button
                          onClick={() => handleStatusChange('cancelled')}
                          disabled={updating || loading || !cancelReason.trim()}
                          className="bg-red-500 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-red-600 disabled:opacity-50 shadow-sm"
                        >
                          Huỷ
                        </button>
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
                    className="border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 shadow-sm whitespace-nowrap"
                  >
                    Đóng lại
                  </button>
                </div>
                
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>

      {/* Hidden print container */}
      <div className="hidden">
        <InvoicePrintTemplate ref={printRef} order={order} payments={payments} />
      </div>
    </Transition>
  );
};

export default OrderDetailModal;
