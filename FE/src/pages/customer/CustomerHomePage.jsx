import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import customerApi from '../../services/customerService.js';
import { useSocket } from '../../hooks/useSocket.js';
import toast from 'react-hot-toast';
import { 
  BookOpenIcon, 
  BellIcon, 
  CreditCardIcon, 
  ChatBubbleLeftRightIcon, 
  UserPlusIcon, 
  SparklesIcon 
} from '@heroicons/react/24/outline';

const CustomerHomePage = () => {
  const { qrCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const socket = useSocket();

  const [loading, setLoading] = useState(true);
  const [bootstrap, setBootstrap] = useState(null);
  const [callingWaiter, setCallingWaiter] = useState(false);

  const effectiveQrCode = useMemo(() => {
    if (qrCode) return qrCode;
    const queryQr = new URLSearchParams(location.search).get('qr');
    return queryQr || '';
  }, [qrCode, location.search]);

  const restaurant = bootstrap?.restaurant;
  const table = bootstrap?.table;

  const loadBootstrap = useCallback(async () => {
    try {
      setLoading(true);
      if (!effectiveQrCode) {
        toast.error('Thiếu mã QR. Vui lòng quét lại.');
        return;
      }
      const res = await customerApi.bootstrap(effectiveQrCode);
      setBootstrap(res.data);
    } catch (err) {
      toast.error('Không thể tải thông tin bàn ăn.');
    } finally {
      setLoading(false);
    }
  }, [effectiveQrCode]);

  useEffect(() => {
    loadBootstrap();
  }, [loadBootstrap]);

  // Handle calling waiter
  const handleCallWaiter = () => {
    if (!socket) {
      toast.error('Chưa kết nối máy chủ. Vui lòng thử lại.');
      return;
    }
    if (!restaurant?.id || !table?.id) {
      toast.error('Thông tin bàn không hợp lệ.');
      return;
    }

    setCallingWaiter(true);
    // Emit call waiter event via Socket.io
    socket.emit('call_waiter', {
      restaurantId: restaurant.id,
      tableId: table.id,
      tableNumber: table.tableNumber
    });

    // Simulate network delay for a nice interactive feel
    setTimeout(() => {
      setCallingWaiter(false);
      toast.success(`Đã gọi phục vụ tới bàn ${table.tableNumber}! 🔔`, {
        duration: 4000,
        icon: '🔔',
        style: {
          border: '1px solid #10B981',
          padding: '16px',
          color: '#065F46',
          fontWeight: 'bold',
        }
      });
    }, 1200);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-orange-50/50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600"></div>
        <p className="mt-4 text-sm font-semibold text-gray-500">Đang tải thông tin bàn ăn...</p>
      </div>
    );
  }

  if (!bootstrap || !table) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center p-6 text-center bg-orange-50/50">
        <div className="rounded-full bg-red-100 p-4 text-red-600 mb-4">
          <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Không tìm thấy thông tin bàn ăn</h2>
        <p className="mt-2 text-sm text-gray-600">Vui lòng quét lại mã QR tại bàn của nhà hàng để tiếp tục.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen bg-gradient-to-b from-orange-50 via-white to-orange-50/30 text-gray-900 font-sans pb-12">
      {/* Hero Header Card */}
      <div className="relative overflow-hidden bg-primary-950 text-white rounded-b-[3rem] shadow-xl pb-16 pt-8 px-6 md:px-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-800/60 via-transparent to-transparent"></div>
        <div className="relative max-w-lg mx-auto flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-primary-300 uppercase tracking-widest mb-6">
            <SparklesIcon className="w-4 h-4 animate-pulse" /> {restaurant?.name || 'm4nFood Partner'}
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2">
            Xin chào! 👋
          </h1>
          <p className="text-primary-100/80 text-sm font-medium mb-6">
            Chào mừng bạn đến với bàn của chúng tôi. Hãy lựa chọn dịch vụ bạn cần nhé!
          </p>

          {/* Table Badge */}
          <div className="bg-gradient-to-r from-primary-500 to-amber-500 rounded-2xl px-8 py-4 shadow-lg border border-white/10 transform transition-transform hover:scale-105 duration-300">
            <span className="block text-[10px] font-black uppercase tracking-widest text-primary-100 opacity-90 leading-none">BÀN ĂN CỦA BẠN</span>
            <span className="block text-3xl font-black text-white mt-1 leading-none">BÀN {table?.tableNumber}</span>
          </div>
        </div>
      </div>

      {/* Main Options Menu */}
      <div className="max-w-md mx-auto px-6 -mt-8 space-y-6">
        {/* Core Actions Grid */}
        <div className="grid grid-cols-1 gap-4">
          {/* Action 1: Digital Menu */}
          <button
            onClick={() => navigate(`/customer/menu/${effectiveQrCode}`)}
            className="flex items-center gap-6 bg-white p-6 rounded-[2rem] border border-orange-100 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-left w-full group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary-100 rounded-full translate-x-8 -translate-y-8 opacity-20 transition-all group-hover:scale-125"></div>
            <div className="p-4 rounded-2xl bg-primary-600 text-white shrink-0 group-hover:rotate-6 transition-transform">
              <BookOpenIcon className="w-8 h-8 stroke-2" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-black text-gray-900 group-hover:text-primary-700 transition-colors">Xem Thực Đơn</h3>
              <p className="text-xs text-gray-500 font-medium mt-1">Khám phá danh sách các món ăn, uống ngon miệng và đặt món trực tiếp</p>
            </div>
          </button>

          {/* Action 2: Call Waiter */}
          <button
            onClick={handleCallWaiter}
            disabled={callingWaiter}
            className={`flex items-center gap-6 bg-white p-6 rounded-[2rem] border border-orange-100 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-left w-full group relative overflow-hidden ${callingWaiter ? 'opacity-80' : ''}`}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-100 rounded-full translate-x-8 -translate-y-8 opacity-20 transition-all group-hover:scale-125"></div>
            <div className={`p-4 rounded-2xl shrink-0 group-hover:animate-bounce transition-all ${callingWaiter ? 'bg-amber-500 text-white animate-pulse' : 'bg-blue-600 text-white'}`}>
              <BellIcon className={`w-8 h-8 stroke-2 ${callingWaiter ? 'animate-spin' : ''}`} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-black text-gray-900 group-hover:text-blue-700 transition-colors">
                {callingWaiter ? 'Đang gửi yêu cầu...' : 'Gọi Nhân Viên'}
              </h3>
              <p className="text-xs text-gray-500 font-medium mt-1">Yêu cầu nhân viên phục vụ hỗ trợ bạn trực tiếp tại bàn</p>
            </div>
          </button>
        </div>

        {/* Future Expansion Divider */}
        <div className="pt-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="h-px bg-gray-200 flex-1"></span>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Dịch vụ sắp ra mắt</span>
            <span className="h-px bg-gray-200 flex-1"></span>
          </div>

          {/* Placeholder Grid */}
          <div className="grid grid-cols-3 gap-3">
            {/* Future Card 1: Payment */}
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/60 border border-gray-100 shadow-sm opacity-50 relative group">
              <div className="p-2.5 rounded-xl bg-gray-100 text-gray-500 mb-2">
                <CreditCardIcon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black text-gray-800 text-center leading-tight">Thanh Toán</span>
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gray-700 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full leading-none">Sắp có</span>
            </div>

            {/* Future Card 2: Feedback */}
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/60 border border-gray-100 shadow-sm opacity-50 relative group">
              <div className="p-2.5 rounded-xl bg-gray-100 text-gray-500 mb-2">
                <ChatBubbleLeftRightIcon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black text-gray-800 text-center leading-tight">Đóng Góp</span>
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gray-700 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full leading-none">Sắp có</span>
            </div>

            {/* Future Card 3: Membership */}
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/60 border border-gray-100 shadow-sm opacity-50 relative group">
              <div className="p-2.5 rounded-xl bg-gray-100 text-gray-500 mb-2">
                <UserPlusIcon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black text-gray-800 text-center leading-tight">Thành Viên</span>
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gray-700 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full leading-none">Sắp có</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerHomePage;
