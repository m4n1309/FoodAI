import { useState, useEffect } from 'react';
import customerApi from '../../services/customerService.js';
import toast from 'react-hot-toast';

const formatMoney = (v) => Number(v || 0).toLocaleString('vi-VN') + ' đ';

/**
 * Modal "Đặt món" — select vouchers, add name/note, and place order.
 */
const PlaceOrderModal = ({ open, onClose, cart, onSuccess }) => {
  const [customerName, setCustomerName] = useState('');
  const [customerNote, setCustomerNote]   = useState('');
  const [promotionCode, setPromotionCode] = useState('');
  const [tentativeDiscount, setTentativeDiscount] = useState(0);
  const [promoError, setPromoError] = useState('');
  const [submitting, setSubmitting]       = useState(false);
  
  const [availablePromotions, setAvailablePromotions] = useState([]);
  const [loadingPromos, setLoadingPromos] = useState(false);

  useEffect(() => {
    // Fetch available promotions when modal opens
    if (open && cart?.restaurantId) {
      setLoadingPromos(true);
      customerApi.getAvailablePromotions(cart.restaurantId)
        .then(res => {
          // If using httpClient, res is the body { success, message, data }
          // The array is in res.data
          const promos = Array.isArray(res.data) ? res.data : (res.data?.data || []);
          setAvailablePromotions(promos);
        })
        .catch(err => console.error('Failed to fetch promotions', err))
        .finally(() => setLoadingPromos(false));
    }
    
    if (!open) {
      setPromotionCode('');
      setTentativeDiscount(0);
      setPromoError('');
    }
  }, [open, cart?.restaurantId]);

  if (!open || !cart) return null;

  const itemCount  = (cart.items || []).length;
  const totalPrice = Number(cart.totalAmount || 0);
  const finalPrice = Math.max(0, totalPrice - tentativeDiscount);

  const checkPromotion = async (codeToApply) => {
    const code = typeof codeToApply === 'string' ? codeToApply : promotionCode;
    if (!code.trim()) {
      setTentativeDiscount(0);
      setPromoError('');
      return;
    }
    
    // Automatically apply loading locally for UX
    try {
      const res = await customerApi.validatePromotion({
        code: code.trim(),
        restaurantId: cart.restaurantId,
        orderAmount: totalPrice
      });
      setTentativeDiscount(res.data.tentativeDiscountAmount || 0);
      setPromoError('');
      toast.success('Áp dụng Voucher thành công!');
    } catch (err) {
      setTentativeDiscount(0);
      setPromotionCode('');
      setPromoError(err.response?.data?.message || 'Mã không hợp lệ hoặc không đủ điều kiện');
      toast.error('Voucher không đủ điều kiện cho đơn này');
    }
  };

  const handleSelectPromo = (p) => {
    if (promotionCode === p.code) {
      // Unselect
      setPromotionCode('');
      setTentativeDiscount(0);
      setPromoError('');
    } else {
      setPromotionCode(p.code);
      checkPromotion(p.code);
    }
  };

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
        customerNote: customerNote.trim() || undefined,
        promotionCode: (promotionCode.trim() && tentativeDiscount > 0) ? promotionCode.trim() : undefined
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
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl relative flex flex-col max-h-[90vh]">
        {/* Header */}
        <button
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 text-xl leading-none"
          onClick={onClose}
          disabled={submitting}
        >
          ×
        </button>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Xác nhận đặt món</h2>
        <p className="text-sm text-gray-500 mb-3 border-b pb-2">
          {itemCount} món •{' '}
          <span className="font-semibold text-gray-700">{formatMoney(totalPrice)}</span>
        </p>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-1 min-h-[50vh]">
          {/* Vouchers Selection */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-800 mb-2">Ưu đãi dành cho bạn 🎁</label>
            {loadingPromos ? (
               <div className="text-xs text-gray-400 animate-pulse">Đang tìm voucher...</div>
            ) : availablePromotions.length > 0 ? (
               <div className="space-y-2">
                 {availablePromotions.map(p => {
                    const isSelected = promotionCode === p.code;
                    return (
                      <div 
                        key={p.code}
                        onClick={() => handleSelectPromo(p)}
                        className={`relative overflow-hidden cursor-pointer border rounded-xl p-3 flex justify-between items-center transition-all ${isSelected ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500' : 'border-gray-200 hover:border-primary-300'}`}
                      >
                         <div className="flex flex-col">
                            <span className="font-bold text-gray-900 text-sm">Giảm {p.discountType === 'percentage' ? p.discountValue + '%' : formatMoney(p.discountValue)}</span>
                            <span className="text-xs text-gray-500 truncate max-w-[220px]">{p.name} {p.minOrderAmount ? `(Cho đơn từ ${formatMoney(p.minOrderAmount)})` : ''}</span>
                         </div>
                         <div className="flex-shrink-0">
                           <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-primary-600 bg-primary-600' : 'border-gray-300'}`}>
                             {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                           </div>
                         </div>
                         {/* Zigzag edge decoration */}
                         <div className="absolute top-0 bottom-0 -left-1 w-2 border-r border-dashed border-gray-300 bg-white"></div>
                      </div>
                    )
                 })}
               </div>
            ) : (
               <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100 italic">Không có voucher khả dụng lúc này.</div>
            )}
            {promoError && <p className="mt-1 text-xs text-red-500">{promoError}</p>}
          </div>

          <form id="place-order-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên khách <span className="text-gray-400 font-normal">(tuỳ chọn)</span>
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                placeholder="Ít cay, không hành, dị ứng..."
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                disabled={submitting}
                maxLength={500}
              />
            </div>
          </form>
        </div>

        {/* Footer calculation */}
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="flex justify-between items-center text-sm text-gray-600 mb-1">
            <span>Tạm tính:</span>
            <span>{formatMoney(totalPrice)}</span>
          </div>
          {tentativeDiscount > 0 && (
            <div className="flex justify-between items-center text-sm text-green-600 font-medium mb-1">
              <span>Được giảm Voucher:</span>
              <span>- {formatMoney(tentativeDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-base font-bold text-gray-900 my-2">
            <span>Tổng thanh toán:</span>
            <span className="text-primary-700 text-lg">{formatMoney(finalPrice)}</span>
          </div>

          <div className="flex gap-2 pt-2 pb-1">
            <button
              type="button"
              className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
              onClick={onClose}
              disabled={submitting}
            >
              Huỷ
            </button>
            <button
              type="submit"
              form="place-order-form"
              className="flex-1 rounded-xl border border-transparent bg-primary-600 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-primary-700 disabled:opacity-50"
              disabled={submitting || itemCount === 0}
            >
              {submitting ? 'Đang duyệt...' : 'Xác nhận đặt'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaceOrderModal;
