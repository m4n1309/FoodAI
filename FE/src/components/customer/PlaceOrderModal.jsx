import { useState } from 'react';
import customerApi from '../../services/customerService.js';
import toast from 'react-hot-toast';

/**
 * Modal "Đặt món" — cho phép khách điền tên & ghi chú, sau đó gửi đơn.
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - cart: Order object (status === 'cart')
 *  - onSuccess: (placedOrder) => void   — gọi sau khi đặt thành công
 */
const PlaceOrderModal = ({ open, onClose, cart, onSuccess }) => {
  const [customerName, setCustomerName] = useState('');
  const [customerNote, setCustomerNote]   = useState('');
  const [submitting, setSubmitting]       = useState(false);

  if (!open || !cart) return null;

  const itemCount  = (cart.items || []).length;
  const totalPrice = Number(cart.totalAmount || 0);

  const formatMoney = (v) => Number(v || 0).toLocaleString('vi-VN') + ' đ';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (itemCount === 0) {
      toast.error('Giỏ hàng đang trống. Vui lòng thêm món trước khi đặt.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await customerApi.placeOrder({
        orderId:      cart.id,
        customerName: customerName.trim() || undefined,
        customerNote: customerNote.trim() || undefined
      });
      toast.success('Đặt món thành công! 🎉');
      onSuccess(res.data.order);
      onClose();
    } catch (err) {
      const status = err.response?.status;
      const msg    = err.response?.data?.message || 'Đặt món thất bại, vui lòng thử lại.';
      if (status === 410) {
        toast.error('Giỏ hàng đã hết hạn. Vui lòng bắt đầu lại.');
        onClose();
        return;
      }
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl relative">
        {/* Header */}
        <button
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 text-xl leading-none"
          onClick={onClose}
          disabled={submitting}
        >
          ×
        </button>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Xác nhận đặt món</h2>
        <p className="text-sm text-gray-500 mb-4">
          {itemCount} món •{' '}
          <span className="font-semibold text-gray-700">{formatMoney(totalPrice)}</span>
        </p>

        {/* Item summary */}
        <div className="mb-4 max-h-36 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 space-y-1">
          {(cart.items || []).map((ci) => (
            <div key={ci.id} className="flex justify-between text-sm text-gray-700">
              <span>{ci.itemName} × {ci.quantity}</span>
              <span className="font-medium">{formatMoney(ci.totalPrice)}</span>
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên khách <span className="text-gray-400 font-normal">(tuỳ chọn)</span>
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập tên để nhân viên gọi..."
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              disabled={submitting}
              maxLength={100}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ghi chú <span className="text-gray-400 font-normal">(tuỳ chọn)</span>
            </label>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Ít cay, không hành, dị ứng..."
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              disabled={submitting}
              maxLength={500}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              onClick={onClose}
              disabled={submitting}
            >
              Huỷ
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg border border-blue-700 bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={submitting || itemCount === 0}
            >
              {submitting ? 'Đang gửi...' : 'Đặt món ngay'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlaceOrderModal;
