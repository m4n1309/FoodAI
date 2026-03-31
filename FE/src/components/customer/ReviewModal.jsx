import { useState } from 'react';
import customerApi from '../../services/customerService.js';
import toast from 'react-hot-toast';

const ReviewModal = ({ open, onClose, order }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open || !order) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await customerApi.submitReview({
        restaurantId: order.restaurantId,
        orderId: order.id,
        customerName: order.customerName,
        customerPhone: phone.trim() || undefined,
        rating,
        comment
      });
      toast.success('Cảm ơn bạn đã đánh giá! 🎉');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể gửi đánh giá');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl relative">
        <button
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 text-xl leading-none"
          onClick={onClose}
          disabled={submitting}
        >
          ×
        </button>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Đánh giá bữa ăn</h2>
        <p className="text-sm text-gray-500 mb-4">Mã đơn: <span className="font-semibold text-gray-700">{order.orderNumber}</span></p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center">
            <span className="text-sm font-medium text-gray-700 mb-2">Mức độ hài lòng của bạn</span>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`text-4xl focus:outline-none transition-colors ${star <= rating ? 'text-yellow-400 drop-shadow-sm' : 'text-gray-200 hover:text-yellow-200'}`}
                  onClick={() => setRating(star)}
                >
                  ★
                </button>
              ))}
            </div>
            <span className="text-sm text-yellow-600 mt-2 font-bold">{rating} Sao tuyệt vời</span>
          </div>

          <div className="pt-2">
            <label className="block text-sm font-medium text-primary-700 mb-1 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v1m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Số điện thoại tích điểm (+100 điểm)
            </label>
            <input
              type="tel"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-primary-50 placeholder-primary-300"
              placeholder="09xx..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={submitting}
              maxLength={15}
            />
            <p className="text-xs text-gray-500 mt-1 italic">Nhập SĐT để nhận 100 điểm khách hàng thân thiết!</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Góp ý thêm (tuỳ chọn)
            </label>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Chia sẻ trải nghiệm của bạn..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={submitting}
              maxLength={500}
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl border border-transparent bg-primary-600 px-4 py-3 text-sm font-bold text-white shadow hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? 'Đang gửi...' : 'Gửi đánh giá & Nhận điểm'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal;
