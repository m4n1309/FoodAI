import { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { StarIcon, HeartIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/solid';
import { XMarkIcon } from '@heroicons/react/24/outline';
import ImageWithFallback from '../common/ImageWithFallback';
import customerApi from '../../services/customerService.js';
import toast from 'react-hot-toast';
import PropTypes from 'prop-types';

const formatMoney = (v) => {
  const n = Number(v || 0);
  return n.toLocaleString('vi-VN') + 'đ';
};

const MenuItemDetailModal = ({ open, onClose, menuItem, onAddToCart, customer, onReviewSubmit }) => {
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [selectedRating, setSelectedRating] = useState('all');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
    if (open && menuItem?.id) {
      fetchReviews();
      setQuantity(1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, menuItem?.id, selectedRating]);

  const fetchReviews = async () => {
    try {
      setLoadingReviews(true);
      const params = {};
      if (selectedRating !== 'all') {
        params.rating = selectedRating;
      }
      const res = await customerApi.getMenuItemReviews(menuItem.id, params);
      setReviews(res.data.reviews || []);
    } catch (err) {
      console.error('Failed to fetch item reviews:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewRating) return toast.error('Vui lòng chọn số sao');

    setSubmitting(true);
    try {
      await customerApi.submitMenuItemReview({
        menuItemId: menuItem.id,
        customerId: customer?.id,
        customerPhone: customer?.phone || phoneInput.trim() || undefined,
        customerName: customer?.fullName || nameInput.trim() || undefined,
        rating: reviewRating,
        comment: reviewComment
      });
      toast.success('Gửi đánh giá món ăn thành công! 🎉 (+10 điểm thành viên)');
      setReviewComment('');
      setReviewRating(5);
      fetchReviews();
      if (onReviewSubmit) onReviewSubmit();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể gửi đánh giá');
    } finally {
      setSubmitting(false);
    }
  };

  if (!menuItem) return null;

  const basePrice = Number(menuItem.discountPrice ?? menuItem.price);
  const total = basePrice * quantity;

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
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-0 sm:p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full sm:max-w-4xl transform overflow-hidden bg-white text-left align-middle shadow-2xl transition-all sm:rounded-[2rem] flex flex-col md:flex-row max-h-[100dvh] sm:max-h-[90vh]">
                
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 z-10 bg-white/80 backdrop-blur-md rounded-full p-2 text-gray-500 hover:text-gray-900 shadow-sm transition-all"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>

                {/* Left Side: Image */}
                <div className="md:w-1/2 relative bg-gray-100 h-64 md:h-auto shrink-0">
                   <ImageWithFallback 
                     src={menuItem.imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop"} 
                     alt={menuItem.name} 
                     className="w-full h-full object-cover"
                   />
                </div>

                {/* Right Side: Content */}
                <div className="md:w-1/2 flex flex-col h-full bg-[#fffcfb] overflow-hidden">
                   {/* Scrollable area */}
                   <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                      <div className="flex justify-between items-start mb-2">
                        <Dialog.Title as="h3" className="text-3xl font-black text-gray-900 leading-tight">
                          {menuItem.name}
                        </Dialog.Title>
                        <button className="text-gray-300 hover:text-red-500 transition-colors p-2 bg-white rounded-full shadow-sm ml-4">
                          <HeartIcon className="w-6 h-6" />
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-2xl font-black text-primary-600">{formatMoney(basePrice)}</span>
                        {menuItem.discountPrice && <span className="text-sm text-gray-400 line-through font-medium">{formatMoney(menuItem.price)}</span>}
                      </div>

                      {/* Display average rating */}
                      <div className="flex items-center gap-1.5 mb-6 pb-6 border-b border-orange-100">
                        {menuItem.rating && menuItem.rating.reviewCount > 0 ? (
                          <>
                            <span className="flex items-center gap-0.5 text-sm text-amber-500 font-bold bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                              <StarIcon className="w-4 h-4 fill-current" />
                              {menuItem.rating.avgRating}
                            </span>
                            <span className="text-xs text-gray-400 font-bold">({menuItem.rating.reviewCount} đánh giá)</span>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium italic">Chưa có đánh giá</span>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mb-8 font-medium leading-relaxed">
                        {menuItem.description || "Hương vị trọn vẹn, được chế biến từ những nguyên liệu tươi ngon nhất."}
                      </p>

                      {/* --- REVIEWS SECTION --- */}
                      <div className="border-t border-orange-100 pt-6">
                        <h4 className="text-sm font-black text-gray-900 mb-4 uppercase tracking-wider">Đánh giá từ khách hàng</h4>

                        {/* Star Filter Tabs */}
                        <div className="flex gap-1.5 overflow-x-auto pb-4 mb-4 border-b border-orange-50 no-scrollbar">
                          {['all', '5', '4', '3', '2', '1'].map((val) => (
                            <button
                              key={val}
                              onClick={() => setSelectedRating(val)}
                              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 active:scale-95 ${
                                selectedRating === val
                                  ? 'bg-primary-600 text-white shadow-sm'
                                  : 'bg-white border border-orange-100 text-gray-600 hover:bg-orange-50/50'
                              }`}
                            >
                              {val === 'all' ? 'Tất cả' : `${val} ★`}
                            </button>
                          ))}
                        </div>

                        {/* Reviews list */}
                        {loadingReviews ? (
                          <div className="flex justify-center py-6">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600"></div>
                          </div>
                        ) : reviews.length === 0 ? (
                          <p className="text-xs text-gray-400 italic py-4">Không có đánh giá nào phù hợp.</p>
                        ) : (
                          <div className="space-y-4 mb-8">
                            {reviews.map((rev) => (
                              <div key={rev.id} className="bg-white p-3.5 rounded-2xl border border-orange-100/50 shadow-sm text-xs">
                                <div className="flex justify-between items-start mb-1.5">
                                  <span className="font-bold text-gray-800">{rev.customer?.fullName || 'Thành viên'}</span>
                                  <div className="flex text-amber-400">
                                    {Array.from({ length: rev.rating }).map((_, i) => (
                                      <StarIcon key={i} className="w-3 h-3 fill-current" />
                                    ))}
                                  </div>
                                </div>
                                <p className="text-gray-600 font-medium">{rev.comment}</p>
                                <span className="text-[10px] text-gray-400 block mt-1.5">
                                  {new Date(rev.createdAt || rev.created_at).toLocaleDateString('vi-VN')}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Write a review form */}
                        <div className="bg-orange-50/40 border border-orange-100 rounded-3xl p-5 mt-6">
                          <h5 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-3">Đánh giá món này</h5>
                          <form onSubmit={handleSubmitReview} className="space-y-3">
                            {/* Stars rating picker */}
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className="text-xs font-semibold text-gray-500 mr-2">Chọn số sao:</span>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setReviewRating(star)}
                                  className="focus:outline-none transition-transform active:scale-125"
                                >
                                  <StarIcon className={`w-6 h-6 ${star <= reviewRating ? 'text-yellow-400' : 'text-gray-200'}`} />
                                </button>
                              ))}
                            </div>

                            {/* Guest inputs if not logged in */}
                            {!customer && (
                              <div className="grid grid-cols-2 gap-3 mb-2">
                                <div>
                                  <input
                                    type="tel"
                                    required
                                    placeholder="SĐT tích điểm..."
                                    value={phoneInput}
                                    onChange={(e) => setPhoneInput(e.target.value)}
                                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                                  />
                                </div>
                                <div>
                                  <input
                                    type="text"
                                    required
                                    placeholder="Tên của bạn..."
                                    value={nameInput}
                                    onChange={(e) => setNameInput(e.target.value)}
                                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                                  />
                                </div>
                              </div>
                            )}

                            <div>
                              <textarea
                                required
                                rows={2}
                                placeholder="Viết bình luận cảm nhận món ăn của bạn tại đây..."
                                value={reviewComment}
                                onChange={(e) => setReviewComment(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary-500 resize-none bg-white"
                                maxLength={500}
                              />
                            </div>

                            <button
                              type="submit"
                              disabled={submitting}
                              className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition-all shadow-md shadow-indigo-100"
                            >
                              {submitting ? 'Đang gửi...' : 'Gửi đánh giá món ăn'}
                            </button>
                          </form>
                        </div>
                      </div>
                   </div>

                   {/* Bottom Action Bar */}
                   <div className="bg-white border-t border-orange-100 p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] shrink-0">
                      <div className="flex items-center justify-between w-full sm:w-auto">
                        <div className="flex flex-col sm:hidden">
                           <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Tổng cộng</span>
                           <span className="text-2xl font-black text-primary-600">{formatMoney(total)}</span>
                        </div>
                        <div className="flex items-center gap-4 bg-orange-50 rounded-full p-1 border border-orange-100">
                           <button 
                             className="w-10 h-10 rounded-full bg-white text-gray-600 shadow-sm hover:text-primary-600 flex items-center justify-center disabled:opacity-50"
                             onClick={() => setQuantity(Math.max(1, quantity - 1))}
                             disabled={quantity <= 1}
                           >
                             <MinusIcon className="w-4 h-4" />
                           </button>
                           <span className="w-4 text-center font-black text-gray-900">{quantity}</span>
                           <button 
                             className="w-10 h-10 rounded-full bg-white text-gray-600 shadow-sm hover:text-primary-600 flex items-center justify-center"
                             onClick={() => setQuantity(quantity + 1)}
                           >
                             <PlusIcon className="w-4 h-4" />
                           </button>
                        </div>
                      </div>
                      <button 
                        className="w-full sm:flex-1 bg-primary-700 text-white rounded-full py-4 font-black uppercase tracking-widest hover:bg-primary-800 transition-colors shadow-xl shadow-primary-700/20 flex items-center justify-center gap-2"
                        onClick={() => {
                          onClose();
                          if (onAddToCart) onAddToCart(menuItem.id, quantity);
                        }}
                      >
                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                         Thêm vào giỏ • {formatMoney(total)}
                      </button>
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

MenuItemDetailModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  menuItem: PropTypes.object,
  onAddToCart: PropTypes.func,
  customer: PropTypes.object,
  onReviewSubmit: PropTypes.func
};

export default MenuItemDetailModal;
