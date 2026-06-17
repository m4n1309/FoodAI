import { useEffect, useMemo, useState, useCallback } from 'react';
import MenuItemDetailModal from '../../components/customer/MenuItemDetailModal';
import ComboDetailModal from '../../components/customer/ComboDetailModal';
import PlaceOrderModal from '../../components/customer/PlaceOrderModal';
import ReviewModal from '../../components/customer/ReviewModal';
import ChatbotWidget from '../../components/customer/ChatbotWidget.jsx';
import ImageWithFallback from '../../components/common/ImageWithFallback';
import { useLocation, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { default as io } from 'socket.io-client';
import customerApi from '../../services/customerService.js';
import { useSocket } from '../../hooks/useSocket.js';
import { PlusIcon, MapPinIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';

const formatMoney = (v) => {
  const n = Number(v || 0);
  return n.toLocaleString('vi-VN') + ' đ';
};

const CustomerMenuPage = () => {
  const { qrCode } = useParams();
  const location = useLocation();
  const socket = useSocket();

  const effectiveQrCode = useMemo(() => {
    if (qrCode) return qrCode;
    const queryQr = new URLSearchParams(location.search).get('qr');
    return queryQr || '';
  }, [qrCode, location.search]);

  const [loading, setLoading] = useState(true);
  const [bootstrap, setBootstrap] = useState(null);
  const [cart, setCart] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('all');

  // Modals state
  const [selectedMenuItem, setSelectedMenuItem] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCombo, setSelectedCombo] = useState(null);
  const [comboModalOpen, setComboModalOpen] = useState(false);
  const [placeOrderModalOpen, setPlaceOrderModalOpen] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [paymentRequested, setPaymentRequested] = useState(false);
  const [pendingAddItem, setPendingAddItem] = useState(null); // { type: 'menu_item'|'combo', id, qty, name }

  const restaurant = bootstrap?.restaurant;
  const table = bootstrap?.table;
  const restaurantId = table?.restaurantId;

  // Fetch full active order details from API
  const fetchActiveOrder = useCallback(async (customRestaurantId, customTableId) => {
    const resId = customRestaurantId || restaurantId;
    const tabId = customTableId || table?.id;
    if (!resId || !tabId) return;
    try {
      const activeRes = await customerApi.getActiveOrder({
        restaurantId: resId,
        tableId: tabId
      });
      setPlacedOrder(activeRes.data.order);
    } catch (e) {
      console.error('Error fetching active order:', e);
    }
  }, [restaurantId, table?.id]);

  const getOrderStatusDisplay = (status) => {
    const displays = {
      pending: { label: 'Chờ duyệt', color: 'text-orange-600 bg-orange-50 border-orange-200', desc: 'Đơn hàng đã gửi tới nhà hàng. Đang chờ nhân viên xác nhận.' },
      confirmed: { label: 'Đã xác nhận', color: 'text-blue-600 bg-blue-50 border-blue-200', desc: 'Nhà hàng đã nhận đơn và bắt đầu xếp lịch chế biến.' },
      preparing: { label: 'Đang chuẩn bị', color: 'text-yellow-600 bg-yellow-50 border-yellow-200', desc: 'Món ăn của bạn đang được các đầu bếp chế biến.' },
      ready: { label: 'Sẵn sàng phục vụ', color: 'text-green-600 bg-green-50 border-green-200', desc: 'Món ăn đã chuẩn bị xong và đang được nhân viên mang lên.' },
      serving: { label: 'Đang phục vụ', color: 'text-indigo-600 bg-indigo-50 border-indigo-200', desc: 'Món ăn đang được phục vụ tại bàn ăn của bạn.' },
    };
    return displays[status] || { label: status, color: 'text-gray-600 bg-gray-50 border-gray-200', desc: '' };
  };

  const getItemStatusBadge = (status) => {
    const badges = {
      pending: 'bg-orange-50 text-orange-700 border-orange-100',
      preparing: 'bg-yellow-50 text-yellow-700 border-yellow-100',
      ready: 'bg-green-50 text-green-700 border-green-100',
      served: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      cancelled: 'bg-red-50 text-red-700 border-red-100'
    };
    const labels = {
      pending: 'Chờ chế biến',
      preparing: 'Đang nấu',
      ready: 'Hoàn thành',
      served: 'Đã phục vụ',
      cancelled: 'Đã hủy'
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badges[status] || 'bg-gray-50 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getStepIndex = (status) => {
    const steps = ['pending', 'confirmed', 'preparing', 'ready', 'serving'];
    return steps.indexOf(status);
  };

  const categories = useMemo(() => bootstrap?.categories || [], [bootstrap]);
  const menuItems = useMemo(() => bootstrap?.menuItems || [], [bootstrap]);
  const combos = useMemo(() => bootstrap?.combos || [], [bootstrap]);

  const categoriesToRender = useMemo(() => {
    const list = [...categories];
    if (combos.length > 0) {
      list.unshift({ id: 'combos', name: 'Combo Ưu đãi', slug: 'combos' });
    }
    return list;
  }, [categories, combos]);

  const combinedItems = useMemo(() => {
    let result = [];
    const q = search.trim().toLowerCase();

    if (categoryId === 'all' || categoryId === 'combos') {
      const filteredCombos = combos.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
      );
      result = [...result, ...filteredCombos.map((c) => ({ ...c, isCombo: true }))];
    }

    if (categoryId !== 'combos') {
      const filteredItems = menuItems.filter((it) => {
        const matchSearch = !q || it.name?.toLowerCase().includes(q) || it.description?.toLowerCase().includes(q);
        const matchCategory = categoryId === 'all' || String(it.categoryId) === String(categoryId);
        return matchSearch && matchCategory;
      });
      result = [...result, ...filteredItems.map((m) => ({ ...m, isCombo: false }))];
    }

    return result;
  }, [categoryId, combos, menuItems, search]);

  const cartTotals = useMemo(() => {
    return {
      subtotal: Number(cart?.subtotal || 0),
      taxAmount: Number(cart?.taxAmount || 0),
      serviceCharge: Number(cart?.serviceCharge || 0),
      totalAmount: Number(cart?.totalAmount || 0)
    };
  }, [cart]);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      if (!effectiveQrCode) {
        toast.error('Thiếu mã QR. Vui lòng quét lại mã.');
        setBootstrap(null);
        setCart(null);
        return;
      }

      const bootRes = await customerApi.bootstrap(effectiveQrCode);
      const bootData = bootRes.data;
      setBootstrap(bootData);

      const cartRes = await customerApi.createOrGetCart({
        restaurantId: bootData.table.restaurantId,
        tableId: bootData.table.id
      });
      const currentCart = cartRes.data.cart;
      setCart(currentCart);
      
      const savedCustomer = sessionStorage.getItem('foodai_customer');
      if (currentCart.customerId && !savedCustomer) {
        sessionStorage.setItem('foodai_customer', JSON.stringify({
          id: currentCart.customerId,
          fullName: currentCart.customerName,
          phone: currentCart.customerPhone
        }));
      }

      // Fetch active order if table has one
      if (bootData.currentOrder) {
        try {
          const activeRes = await customerApi.getActiveOrder({
            restaurantId: bootData.table.restaurantId,
            tableId: bootData.table.id
          });
          setPlacedOrder(activeRes.data.order);
        } catch (e) {
          console.error('Error fetching active order on load:', e);
        }
      }
    } catch (e) {
      toast.error('Failed to load menu');
    } finally {
      setLoading(false);
    }
  }, [effectiveQrCode]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Polling every 2 seconds for active order updates
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (placedOrder && restaurantId && table?.id) {
        fetchActiveOrder(restaurantId, table.id);
      }
    }, 2000);
    return () => clearInterval(intervalId);
  }, [placedOrder, restaurantId, table, fetchActiveOrder]);

  // Realtime Socket updates for the active order & items
  useEffect(() => {
    if (!socket || !placedOrder?.id) return;

    socket.emit('join_order', { orderId: placedOrder.id, sessionId: bootstrap?.sessionId });

    const handleOrderStatus = (data) => {
      if (data.orderId === placedOrder.id) {
        if (data.status === 'completed') {
          toast.success('Hóa đơn đã được thanh toán thành công! Cảm ơn quý khách! 🥰', { duration: 5000 });
          setCompletedOrder(placedOrder);
          setReviewModalOpen(true);
          setPlacedOrder(null);
        } else if (data.status === 'cancelled') {
          toast.error('Đơn hàng của bạn đã bị hủy.');
          setPlacedOrder(null);
        } else {
          fetchActiveOrder();
        }
      }
    };

    const handleItemStatus = (data) => {
      // Refresh order items status when changed in kitchen
      fetchActiveOrder();
    };

    socket.on('order_status_changed', handleOrderStatus);
    socket.on('item_status_changed', handleItemStatus);

    return () => {
      socket.emit('leave_order', { orderId: placedOrder.id });
      socket.off('order_status_changed', handleOrderStatus);
      socket.off('item_status_changed', handleItemStatus);
    };
  }, [socket, placedOrder?.id, fetchActiveOrder, bootstrap?.sessionId]);



  const handleAddMenuItem = async (menuItemId, qty = 1) => {
    // Nếu có đơn active → hiện xác nhận trước khi thêm
    if (placedOrder) {
      const item = menuItems.find(m => String(m.id) === String(menuItemId));
      setPendingAddItem({ type: 'menu_item', id: menuItemId, qty, name: item?.name || 'Món ăn' });
      return;
    }
    if (!cart) return;
    try {
      const res = await customerApi.addCartItem({ orderId: cart.id, itemType: 'menu_item', menuItemId, quantity: qty });
      setCart(res.data.cart);
      toast.success('Đã thêm vào giỏ');
    } catch (e) {
      toast.error('Lỗi thêm món');
    }
  };

  const handleAddCombo = async (comboId, qty = 1) => {
    // Nếu có đơn active → hiện xác nhận trước khi thêm
    if (placedOrder) {
      const combo = combos.find(c => String(c.id) === String(comboId));
      setPendingAddItem({ type: 'combo', id: comboId, qty, name: combo?.name || 'Combo' });
      return;
    }
    if (!cart) return;
    try {
      const res = await customerApi.addCartItem({ orderId: cart.id, itemType: 'combo', comboId, quantity: qty });
      setCart(res.data.cart);
      toast.success('Đã thêm combo vào giỏ');
    } catch (e) {
      toast.error('Lỗi thêm combo');
    }
  };

  const confirmAddToActiveOrder = async () => {
    if (!pendingAddItem || !placedOrder) return;
    const { type, id, qty } = pendingAddItem;
    try {
      const payload = {
        restaurantId,
        tableId: table?.id,
        itemType: type,
        quantity: qty
      };
      if (type === 'menu_item') payload.menuItemId = id;
      else payload.comboId = id;

      const res = await customerApi.addItemToActiveOrder(payload);
      setPlacedOrder(res.data.order);
      toast.success('Đã thêm món vào đơn hàng! Nhà bếp sẽ nhận được thông báo 🎉', { duration: 4000 });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Lỗi thêm món vào đơn');
    } finally {
      setPendingAddItem(null);
    }
  };

  const handleRequestPayment = async () => {
    if (!placedOrder?.id) return;
    try {
      await customerApi.requestPayment(placedOrder.id);
      setPaymentRequested(true);
      toast.success('Đã gửi yêu cầu thanh toán! Nhân viên sẽ đến bàn của bạn. 💳', { duration: 5000 });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gửi yêu cầu thanh toán thất bại');
    }
  };

  const handleQtyChange = async (orderItemId, newQty) => {
    if (!cart) return;
    try {
      const res = await customerApi.updateCartItem(orderItemId, { quantity: newQty });
      setCart(res.data.cart);
    } catch (e) {}
  };

  const handleUpdateItemNote = async (orderItemId, note) => {
    if (!cart) return;
    try {
      const res = await customerApi.updateCartItem(orderItemId, { specialInstructions: note });
      setCart(res.data.cart);
    } catch (e) {}
  };

  const handleRemove = async (orderItemId) => {
    if (!cart) return;
    try {
      const res = await customerApi.removeCartItem(orderItemId);
      setCart(res.data.cart);
    } catch (e) {}
  };

  const handlePlaceOrderSuccess = (order) => {
    setPlacedOrder(order);
    setCart(null);
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!bootstrap) return <div className="flex h-screen items-center justify-center p-6 text-center">Không tải được dữ liệu QR.</div>;

  return (
    <div className="bg-primary-50 min-h-screen font-sans text-gray-900 pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-primary-50/90 backdrop-blur-md border-b border-orange-100 px-4 py-3 sm:px-8">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="text-3xl font-black text-primary-600 tracking-tighter">m4nFood</div>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden sm:flex items-center gap-1 text-gray-600 hover:text-primary-600 cursor-pointer">
                <MapPinIcon className="w-5 h-5" />
                <span className="text-sm font-medium">Bàn {table?.tableNumber}</span>
             </div>
             <button 
               className="relative flex items-center gap-2 bg-primary-700 text-white px-4 py-2 rounded-full hover:bg-primary-800 transition-colors"
               onClick={() => setPlaceOrderModalOpen(true)}
             >
                <ShoppingCartIcon className="w-5 h-5" />
                <span className="text-sm font-bold hidden sm:inline">Cart</span>
                {cart?.items?.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-white text-primary-700 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border border-primary-700">
                    {cart.items.length}
                  </span>
                )}
             </button>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="relative w-full h-[400px] bg-gray-900 overflow-hidden">
         <img src="https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=2070&auto=format&fit=crop" alt="Pizza Hero" className="absolute inset-0 w-full h-full object-cover opacity-60" />
         <div className="absolute inset-0 bg-gradient-to-r from-primary-50 via-primary-50/80 to-transparent"></div>
         <div className="relative h-full mx-auto max-w-7xl px-4 sm:px-8 flex flex-col justify-center">
            <h1 className="text-5xl sm:text-6xl font-black text-gray-900 max-w-lg leading-tight mb-4">
              Gọi món tiện lợi,<br/>
              <span className="text-primary-600">Nhanh chóng tận bàn.</span>
            </h1>
            <p className="text-gray-700 max-w-md text-lg mb-8 font-medium">Khám phá hàng ngàn món ngon từ các nhà hàng địa phương yêu thích của bạn. Đặt ngay!</p>
         </div>
      </section>

      {/* Order Tracking Section */}
      {placedOrder && (
         <section className="mx-auto max-w-7xl px-4 sm:px-8 mt-8">
            <div className="bg-white p-6 rounded-[2rem] border border-orange-100 shadow-lg relative overflow-hidden">
               {/* Header decoration */}
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary-100 rounded-full translate-x-12 -translate-y-12 opacity-20"></div>
               
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 pb-6 mb-6">
                  <div>
                     <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary-50 text-primary-700 border border-primary-100 mb-2">
                        🔔 Đơn hàng của bạn đang được xử lý tại Bàn {table?.tableNumber}
                     </div>
                     <h2 className="text-xl font-black text-gray-900">Mã đơn: {placedOrder.orderNumber}</h2>
                     <p className="text-xs text-gray-400 mt-1">Đặt lúc: {(placedOrder.createdAt || placedOrder.created_at) && !isNaN(new Date(placedOrder.createdAt || placedOrder.created_at).getTime()) ? new Date(placedOrder.createdAt || placedOrder.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                     <span className={`px-4 py-2 rounded-xl text-sm font-black border ${getOrderStatusDisplay(placedOrder.orderStatus).color}`}>
                        {getOrderStatusDisplay(placedOrder.orderStatus).label}
                     </span>
                  </div>
               </div>

               {/* Step progress bar */}
               <div className="mb-8">
                  <div className="flex items-center justify-between relative max-w-3xl mx-auto px-4">
                     {['Gửi đơn', 'Xác nhận', 'Chế biến', 'Hoàn thành', 'Phục vụ'].map((stepName, idx) => {
                       const currentIdx = getStepIndex(placedOrder.orderStatus);
                       const isCompleted = idx <= currentIdx;
                       const isActive = idx === currentIdx;
                       return (
                         <div key={stepName} className="flex flex-col items-center z-10">
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border transition-all ${
                             isActive 
                               ? 'bg-primary-600 text-white border-primary-600 ring-4 ring-primary-100 animate-pulse'
                               : isCompleted
                                 ? 'bg-primary-500 text-white border-primary-500'
                                 : 'bg-white text-gray-400 border-gray-200'
                           }`}>
                             {idx + 1}
                           </div>
                           <span className={`text-[10px] font-bold mt-2 ${isActive ? 'text-primary-600' : isCompleted ? 'text-gray-800' : 'text-gray-400'}`}>
                             {stepName}
                           </span>
                         </div>
                       );
                     })}
                     {/* Stepper background line */}
                     <div className="absolute top-4 left-6 right-6 h-0.5 bg-gray-100 -z-10"></div>
                     {/* Stepper active progress line */}
                     <div 
                       className="absolute top-4 left-6 h-0.5 bg-primary-500 -z-10 transition-all duration-500"
                       style={{ width: `${(Math.max(0, getStepIndex(placedOrder.orderStatus)) / 4) * 92}%` }}
                     ></div>
                  </div>
                  <p className="text-center text-xs text-gray-500 font-semibold mt-4">
                     {getOrderStatusDisplay(placedOrder.orderStatus).desc}
                  </p>
               </div>

               {/* Item list and item-level status */}
                <div>
                   <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3.5 border-b border-gray-50 pb-2">Trạng thái món ăn của bạn:</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {placedOrder.items?.map(it => {
                        const isCancelled = it.itemStatus === 'cancelled';
                        return (
                          <div key={it.id} className={`bg-gray-50/50 p-3 rounded-2xl border border-gray-100 flex justify-between items-center hover:border-primary-100 transition-colors ${isCancelled ? 'opacity-65' : ''}`}>
                             <div>
                                <p className={`text-xs font-bold ${isCancelled ? 'line-through text-gray-400' : 'text-gray-800'}`}>{it.itemName}</p>
                                {it.specialInstructions && (
                                   <p className="text-[10px] text-gray-400 font-bold mt-0.5">💡 Ghi chú: {it.specialInstructions}</p>
                                )}
                                <p className={`text-[10px] font-black mt-1 ${isCancelled ? 'line-through text-gray-400' : 'text-primary-600'}`}>Số lượng: x{it.quantity}</p>
                             </div>
                             <div>
                                {getItemStatusBadge(it.itemStatus)}
                             </div>
                          </div>
                        );
                      })}
                   </div>

                   {/* Order total + Request Payment */}
                   <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                         <span className="text-sm font-bold text-gray-500">Tổng tiền:</span>
                         <span className="text-2xl font-black text-primary-700">{formatMoney(placedOrder.totalAmount || placedOrder.subtotal)}</span>
                      </div>
                      <button
                        onClick={handleRequestPayment}
                        disabled={paymentRequested}
                        className={`flex items-center gap-2 px-6 py-3 rounded-full font-black text-sm transition-all shadow-lg ${
                          paymentRequested
                            ? 'bg-green-100 text-green-700 border border-green-200 cursor-not-allowed shadow-none'
                            : 'bg-primary-700 text-white hover:bg-primary-800 shadow-primary-700/20 hover:shadow-xl'
                        }`}
                      >
                        {paymentRequested ? (
                          <>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            Đã gửi yêu cầu thanh toán
                          </>
                        ) : (
                          <>
                            💳 Yêu cầu thanh toán
                          </>
                        )}
                      </button>
                   </div>
                </div>
             </div>
          </section>
       )}

      <main className="mx-auto max-w-7xl px-4 sm:px-8 mt-12 grid grid-cols-1 lg:grid-cols-4 gap-8">
         {/* Left Sidebar (Filters) */}
         <aside className="hidden lg:block space-y-8">
            {/* Categories */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-50">
               <h3 className="text-lg font-black text-gray-900 mb-4">Danh mục</h3>
               <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                     <input type="radio" name="cat" value="all" checked={categoryId === 'all'} onChange={() => setCategoryId('all')} className="w-5 h-5 text-primary-600 focus:ring-primary-500 border-gray-300" />
                     <span className={`text-sm font-medium ${categoryId === 'all' ? 'text-gray-900 font-bold' : 'text-gray-600 group-hover:text-gray-900'}`}>Tất cả</span>
                  </label>
                  {categoriesToRender.map(c => (
                    <label key={c.id} className="flex items-center gap-3 cursor-pointer group">
                       <input type="radio" name="cat" value={c.id} checked={categoryId === String(c.id)} onChange={() => setCategoryId(String(c.id))} className="w-5 h-5 text-primary-600 focus:ring-primary-500 border-gray-300" />
                       <span className={`text-sm font-medium ${categoryId === String(c.id) ? 'text-gray-900 font-bold' : 'text-gray-600 group-hover:text-gray-900'}`}>{c.name}</span>
                    </label>
                  ))}
               </div>
            </div>
         </aside>

         {/* Main Content */}
         <div className="lg:col-span-3">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
               <div>
                  <h2 className="text-2xl font-black text-gray-900">Khám phá món ngon</h2>
                  <p className="text-sm text-gray-500 mt-1">Tìm thấy {combinedItems.length} kết quả gần bạn</p>
               </div>
            </div>

            {/* Mobile Search/Filter Input */}
            <div className="lg:hidden mb-6 flex gap-2">
               <input
                 className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                 placeholder="Tìm kiếm món ăn..."
                 value={search}
                 onChange={e => setSearch(e.target.value)}
               />
               <select
                 className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold shadow-sm outline-none focus:border-primary-500"
                 value={categoryId}
                 onChange={e => setCategoryId(e.target.value)}
               >
                 <option value="all">Tất cả</option>
                 {categoriesToRender.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
            </div>

            {/* Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
               {combinedItems.map((it) => (
                 <div
                   key={it.isCombo ? `combo-${it.id}` : `item-${it.id}`}
                   className="bg-white rounded-2xl shadow-sm border border-orange-50 overflow-hidden hover:shadow-md transition-shadow cursor-pointer flex flex-col relative"
                   onClick={() => {
                     if (it.isCombo) {
                       setSelectedCombo(it);
                       setComboModalOpen(true);
                     } else {
                       setSelectedMenuItem(it);
                       setModalOpen(true);
                     }
                   }}
                 >
                   {/* Image Container */}
                   <div className="h-48 w-full relative overflow-hidden">
                      <ImageWithFallback src={it.imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop"} alt={it.name} className="w-full h-full object-cover" />
                      {it.isCombo && (
                        <div className="absolute top-3 left-3 bg-primary-600 text-white text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded">Combo Ưu đãi</div>
                      )}
                   </div>

                   {/* Content Container */}
                   <div className="p-4 flex flex-col flex-1">
                      <h3 className="text-lg font-black text-gray-900 line-clamp-1 mb-1">{it.name}</h3>
                      <p className="text-xs text-gray-500 font-medium line-clamp-1 mb-4">{restaurant?.name || 'm4nFood Partner'} • {it.isCombo ? 'Combo' : 'Món lẻ'}</p>
                      
                      <div className="mt-auto flex items-center justify-between">
                         <div className="flex flex-col">
                            {it.discountPrice && <span className="text-[10px] text-gray-400 line-through font-medium leading-none">{formatMoney(it.price)}</span>}
                            <span className="text-lg font-black text-primary-700 leading-none mt-1">{formatMoney(it.discountPrice ?? it.price)}</span>
                         </div>
                         <button
                           className="flex h-10 w-10 items-center justify-center rounded-full border border-primary-200 text-primary-600 bg-primary-50 hover:bg-primary-600 hover:text-white transition-colors"
                           onClick={(e) => {
                             e.stopPropagation();
                             it.isCombo ? handleAddCombo(it.id) : handleAddMenuItem(it.id);
                           }}
                         >
                           <PlusIcon className="w-5 h-5 stroke-2" />
                         </button>
                      </div>
                   </div>
                 </div>
               ))}
            </div>
         </div>
      </main>

      {/* Footer Mockup */}
      <footer className="bg-primary-100 mt-20 py-12 border-t border-orange-200">
         <div className="mx-auto max-w-7xl px-4 sm:px-8">
            <div className="text-center">
               <div className="text-2xl font-black text-primary-700 tracking-tighter mb-4">m4nFood</div>
               <p className="text-sm text-gray-700 font-medium max-w-sm mx-auto">Phục vụ tận tâm, hương vị trọn vẹn. Khám phá hàng ngàn món ngon mỗi ngày.</p>
               <p className="text-xs text-gray-500 font-medium mt-8">© 2026 m4nFood. All rights reserved.</p>
            </div>
         </div>
      </footer>

      {/* Confirm Add to Active Order Modal */}
      {pendingAddItem && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl animate-in">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-2">Thêm món vào đơn hàng?</h3>
              <p className="text-sm text-gray-500 mb-1">
                Bạn muốn thêm <span className="font-bold text-gray-800">"{pendingAddItem.name}"</span> vào đơn hàng <span className="font-bold text-primary-600">#{placedOrder?.orderNumber}</span> đang xử lý?
              </p>
              <p className="text-xs text-gray-400 mb-6">
                Nhà bếp và nhân viên phục vụ sẽ nhận được thông báo ngay lập tức.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setPendingAddItem(null)}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={confirmAddToActiveOrder}
                  className="flex-1 px-4 py-3 rounded-xl bg-primary-700 text-white text-sm font-bold hover:bg-primary-800 transition-colors shadow-lg shadow-primary-700/20"
                >
                  Xác nhận thêm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <MenuItemDetailModal open={modalOpen} onClose={() => setModalOpen(false)} menuItem={selectedMenuItem} onAddToCart={handleAddMenuItem} />
      <ComboDetailModal open={comboModalOpen} onClose={() => setComboModalOpen(false)} combo={selectedCombo} onAdd={(comboId, qty) => handleAddCombo(comboId, qty)} />
      <PlaceOrderModal 
        open={placeOrderModalOpen} 
        onClose={() => setPlaceOrderModalOpen(false)} 
        cart={cart} 
        onSuccess={handlePlaceOrderSuccess} 
        onUpdateQty={handleQtyChange}
        onUpdateNote={handleUpdateItemNote}
        onRemoveItem={handleRemove}
      />
      <ReviewModal 
        isOpen={reviewModalOpen} 
        onClose={() => { setReviewModalOpen(false); setCompletedOrder(null); }} 
        restaurantId={String(restaurantId || '')} 
        order={completedOrder || placedOrder} 
      />
      <ChatbotWidget restaurantId={restaurantId} tableId={table?.id} />
    </div>
  );
};

export default CustomerMenuPage;
