import { useState } from 'react';
import toast from 'react-hot-toast';

const CheckInModal = ({ open, onSkip, onSubmit, loading }) => {
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!phone) {
      toast.error('Vui lòng nhập số điện thoại để tích điểm!');
      return;
    }
    onSubmit({ phone, fullName });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[2rem] bg-white p-8 shadow-2xl relative animate-fade-in-up">
        {/* Decorative top icon */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white rounded-full p-2 shadow-xl border border-gray-100">
           <div className="bg-indigo-100 rounded-full p-3 text-indigo-600">
             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
           </div>
        </div>

        <div className="mt-6 text-center mb-6">
          <h2 className="text-2xl font-black text-gray-900">Chào mừng bạn! 👋</h2>
          <p className="text-sm text-gray-500 mt-2">Vui lòng để lại thông tin để chúng mình có thể phục vụ bạn tốt hơn và tích điểm thành viên nhé.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Số điện thoại <span className="text-red-500">*</span></label>
            <input
              type="tel"
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 transition-all hover:bg-white"
              placeholder="Nhập số điện thoại..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
              maxLength={15}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Tên của bạn <span className="text-gray-400 font-normal">(không bắt buộc)</span></label>
            <input
              type="text"
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 transition-all hover:bg-white"
              placeholder="Để nhân viên dễ gọi tên..."
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
              maxLength={100}
            />
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <button
              type="submit"
              className="w-full rounded-2xl bg-indigo-600 px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-xl active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2"
              disabled={loading}
            >
              {loading ? 'Đang lưu...' : 'Nhận Điểm Khách Hàng'}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
            <button
              type="button"
              className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-bold text-gray-400 transition-all hover:text-gray-600 hover:bg-gray-50 active:scale-95"
              onClick={onSkip}
              disabled={loading}
            >
              Bỏ qua, tôi muốn gọi món luôn
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CheckInModal;
