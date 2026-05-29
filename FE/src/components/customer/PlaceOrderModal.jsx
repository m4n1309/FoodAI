import { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import customerApi from '../../services/customerService.js';
import toast from 'react-hot-toast';
import { MapPinIcon, CreditCardIcon, BanknotesIcon, XMarkIcon } from '@heroicons/react/24/outline';
import ImageWithFallback from '../common/ImageWithFallback';

const formatMoney = (v) => Number(v || 0).toLocaleString('vi-VN') + 'đ';

const PlaceOrderModal = ({ open, onClose, cart, onSuccess, onUpdateQty, onRemoveItem }) => {
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState(null);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [promotionCode, setPromotionCode] = useState('');
  const [tentativeDiscount, setTentativeDiscount] = useState(0);
  const [promoError, setPromoError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  
  const [availablePromotions, setAvailablePromotions] = useState([]);

  useEffect(() => {
    if (open && cart?.restaurantId) {
      customerApi.getAvailablePromotions(cart.restaurantId)
        .then(res => setAvailablePromotions(Array.isArray(res.data) ? res.data : (res.data?.data || [])))
        .catch(() => {});
    }
    
    if (!open) {
      setPromotionCode('');
      setTentativeDiscount(0);
      setPromoError('');
    } else {
      try {
        const savedData = sessionStorage.getItem('foodai_customer');
        if (savedData) {
          const parsed = JSON.parse(savedData);
          if (parsed.id) setCustomerId(parsed.id);
          if (parsed.fullName) setCustomerName(parsed.fullName);
          if (parsed.phone) setCustomerPhone(parsed.phone);
        }
      } catch (e) {}
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
      setPromoError(err.response?.data?.message || 'Mã không hợp lệ');
      toast.error('Voucher không đủ điều kiện cho đơn này');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (itemCount === 0) {
      toast.error('Giỏ hàng trống!');
      return;
    }
    setSubmitting(true);
    try {
      const res = await customerApi.placeOrder({
        orderId: cart.id,
        customerId: customerId || undefined,
        customerName: customerName.trim() || undefined,
        customerNote: customerNote.trim() || undefined,
        promotionCode: (promotionCode.trim() && tentativeDiscount > 0) ? promotionCode.trim() : undefined
      });
      toast.success('Đặt món thành công! 🎉');
      onSuccess(res.data.order);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đặt món thất bại');
    } finally {
      setSubmitting(false);
    }
  };

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
          <div className="fixed inset-0 bg-primary-50/90 backdrop-blur-md" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-0 md:p-8">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="w-full max-w-6xl transform bg-transparent transition-all min-h-screen md:min-h-0 flex flex-col">
                
                {/* Header (Mobile & Desktop) */}
                <div className="flex justify-between items-center bg-white p-4 md:p-0 md:bg-transparent border-b md:border-none md:mb-6 sticky top-0 z-10 md:static">
                   <button onClick={onClose} className="text-gray-500 hover:text-gray-900 md:hidden"><XMarkIcon className="w-6 h-6"/></button>
                   <div className="text-2xl font-black text-primary-600 tracking-tighter md:hidden">FreshDash</div>
                   <div className="w-6 md:hidden"></div>
                   
                   <button onClick={onClose} className="hidden md:flex items-center gap-2 text-gray-500 font-bold hover:text-primary-600 transition-colors">
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                     Quay lại thực đơn
                   </button>
                   <div className="hidden md:block text-3xl font-black text-primary-600 tracking-tighter mx-auto">FreshDash</div>
                   <div className="hidden md:block w-[140px]"></div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 md:gap-8 flex-1 p-4 md:p-0">
                   
                   {/* LEFT COLUMN: Shipping & Payment */}
                   <div className="lg:w-3/5 space-y-6 md:space-y-8 flex flex-col">
                      <h1 className="text-3xl font-black text-gray-900 hidden md:block">Thanh toán an toàn</h1>
                      
                      {/* Customer Info */}
                      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-orange-50">
                         <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                           <MapPinIcon className="w-6 h-6 text-primary-600" /> Thông tin cá nhân
                         </h3>
                         
                         <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                               <div>
                                  <label className="block text-xs font-bold text-gray-500 mb-1">Tên của bạn</label>
                                  <input 
                                    type="text" 
                                    placeholder="Ví dụ: Nguyễn Văn A" 
                                    value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                    className="w-full bg-orange-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500 p-4" 
                                  />
                               </div>
                               <div>
                                  <label className="block text-xs font-bold text-gray-500 mb-1">Số điện thoại</label>
                                  <input 
                                    type="text" 
                                    placeholder="090 123 4567" 
                                    value={customerPhone}
                                    onChange={e => setCustomerPhone(e.target.value)}
                                    className="w-full bg-orange-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500 p-4" 
                                  />
                               </div>
                            </div>
                            <div>
                               <label className="block text-xs font-bold text-gray-500 mb-1">Ghi chú cho nhà bếp (Tùy chọn)</label>
                               <input 
                                 type="text" 
                                 placeholder="Không hành, ít cay..." 
                                 value={customerNote}
                                 onChange={e => setCustomerNote(e.target.value)}
                                 className="w-full bg-orange-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500 p-4" 
                               />
                            </div>
                         </div>
                      </div>

                   </div>

                   {/* RIGHT COLUMN: Order Summary */}
                   <div className="lg:w-2/5 mt-6 lg:mt-0 lg:pt-14 relative pb-24 md:pb-0">
                      <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-gray-100 lg:sticky lg:top-8">
                         <h3 className="text-xl font-black text-gray-900 mb-6">Tóm tắt đơn hàng</h3>
                         
                         {/* Items List */}
                         <div className="space-y-4 mb-6 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
                            {cart.items.map(ci => (
                               <div key={ci.id} className="flex gap-4 items-center">
                                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                                     <ImageWithFallback src={ci.imageUrl || "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=200&auto=format&fit=crop"} alt={ci.itemName} className="w-full h-full object-cover" />
                                  </div>
                                  <div className="flex-1 flex flex-col justify-between">
                                     <div>
                                        <div className="text-sm font-bold text-gray-900 line-clamp-1 pr-6 relative">
                                          {ci.itemName}
                                          <button 
                                            onClick={() => onRemoveItem && onRemoveItem(ci.id)}
                                            className="absolute right-0 top-0 text-gray-300 hover:text-red-500 transition-colors p-1"
                                            title="Xóa món"
                                          >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                          </button>
                                        </div>
                                     </div>
                                     <div className="flex justify-between items-center mt-2">
                                        <div className="flex items-center gap-3 bg-orange-50 rounded-full px-2 py-1 border border-orange-100">
                                           <button 
                                             className="w-6 h-6 rounded-full bg-white text-gray-600 shadow-sm hover:text-primary-600 flex items-center justify-center disabled:opacity-50"
                                             onClick={() => onUpdateQty && onUpdateQty(ci.id, ci.quantity - 1)}
                                             disabled={ci.quantity <= 1}
                                           >
                                             <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" /></svg>
                                           </button>
                                           <span className="w-3 text-center font-black text-xs text-gray-900">{ci.quantity}</span>
                                           <button 
                                             className="w-6 h-6 rounded-full bg-white text-gray-600 shadow-sm hover:text-primary-600 flex items-center justify-center"
                                             onClick={() => onUpdateQty && onUpdateQty(ci.id, ci.quantity + 1)}
                                           >
                                             <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                                           </button>
                                        </div>
                                        <span className="text-sm font-bold text-gray-900">{formatMoney(ci.totalPrice)}</span>
                                     </div>
                                  </div>
                               </div>
                            ))}
                         </div>

                         {/* Voucher */}
                         <div className="mb-6">
                            <div className="flex gap-2">
                               <input 
                                 type="text" 
                                 placeholder="Nhập mã giảm giá..." 
                                 value={promotionCode}
                                 onChange={e => setPromotionCode(e.target.value)}
                                 className="flex-1 bg-orange-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500" 
                               />
                               <button 
                                 onClick={() => checkPromotion(promotionCode)}
                                 className="bg-primary-100 text-primary-800 font-bold px-4 rounded-xl text-sm hover:bg-primary-200 transition-colors"
                               >
                                  Áp dụng
                               </button>
                            </div>
                            
                            {/* Eligible Promotions */}
                            {availablePromotions.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {availablePromotions.map(promo => {
                                  const isEligible = !promo.minOrderAmount || totalPrice >= Number(promo.minOrderAmount);
                                  if (!isEligible) return null;
                                  
                                  const isSelected = promotionCode === promo.code;
                                  return (
                                    <button
                                      key={promo.id}
                                      onClick={() => {
                                        setPromotionCode(promo.code);
                                        checkPromotion(promo.code);
                                      }}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                        isSelected 
                                          ? 'bg-primary-600 text-white border-primary-600' 
                                          : 'bg-white text-primary-600 border-primary-200 hover:bg-primary-50'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1">
                                        <span className="uppercase">{promo.code}</span>
                                        <span className="font-medium opacity-80">
                                          (-{promo.discountType === 'percentage' ? `${promo.discountValue}%` : formatMoney(promo.discountValue)})
                                        </span>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                         </div>
                         {promoError && <p className="text-xs text-red-500 -mt-4 mb-4 font-bold">{promoError}</p>}
                         {tentativeDiscount > 0 && (
                           <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-2 -mt-2 mb-4">
                              <span className="text-xs text-green-700 font-bold">Đã áp dụng mã: <span className="uppercase">{promotionCode}</span></span>
                              <button 
                                onClick={() => {
                                  setPromotionCode('');
                                  setTentativeDiscount(0);
                                  setPromoError('');
                                }}
                                className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 px-2 py-1 rounded"
                              >
                                Bỏ mã
                              </button>
                           </div>
                         )}

                         <div className="space-y-3 pt-6 border-t border-gray-100">
                            <div className="flex justify-between text-sm font-medium text-gray-600">
                               <span>Tạm tính ({itemCount} món)</span>
                               <span>{formatMoney(totalPrice)}</span>
                            </div>
                            {tentativeDiscount > 0 && (
                               <div className="flex justify-between text-sm font-bold text-primary-600">
                                  <span>🏷 Giảm giá</span>
                                  <span>-{formatMoney(tentativeDiscount)}</span>
                               </div>
                            )}
                         </div>

                         <div className="flex justify-between items-end mt-6 pt-6 border-t border-gray-100 mb-6">
                            <span className="text-lg font-black text-gray-900">Tổng cộng</span>
                            <span className="text-3xl font-black text-primary-700">{formatMoney(finalPrice)}</span>
                         </div>

                         <button 
                           onClick={handleSubmit} 
                           disabled={submitting}
                           className="w-full bg-primary-700 text-white rounded-full py-4 font-black text-lg shadow-xl shadow-primary-700/20 hover:bg-primary-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                         >
                           {submitting ? 'Đang xử lý...' : 'Đặt hàng ngay'} 
                           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                         </button>
                         <p className="text-center text-[10px] text-gray-400 font-medium mt-4">
                           Bằng việc đặt hàng, bạn đồng ý với <a href="#" className="text-primary-600 underline">Điều khoản dịch vụ</a> của chúng tôi.
                         </p>
                      </div>
                   </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default PlaceOrderModal;
