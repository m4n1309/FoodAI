import { useEffect, useMemo, useState, useCallback } from 'react';
import MenuItemDetailModal from '../../components/customer/MenuItemDetailModal';
import ComboDetailModal from '../../components/customer/ComboDetailModal';
import PlaceOrderModal from '../../components/customer/PlaceOrderModal';
import ReviewModal from '../../components/customer/ReviewModal';
import ImageWithFallback from '../../components/common/ImageWithFallback';
import { useLocation, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { default as io } from 'socket.io-client';
import customerApi from '../../services/customerService.js';
import { PlusIcon } from '@heroicons/react/24/outline';

const formatMoney = (v) => {
  const n = Number(v || 0);
  return n.toLocaleString('vi-VN') + ' đ';
};

const CustomerMenuPage = () => {
  const { qrCode } = useParams();
  const location = useLocation();
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

  const restaurant = bootstrap?.restaurant;
  const table = bootstrap?.table;
  const restaurantId = table?.restaurantId;

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

    // Add combos
    if (categoryId === 'all' || categoryId === 'combos') {
      const filteredCombos = combos.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
      );
      result = [...result, ...filteredCombos.map((c) => ({ ...c, isCombo: true }))];
    }

    // Add menu items
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
      setCart(cartRes.data.cart);
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Failed to load menu';
      toast.error(msg);
      setBootstrap(null);
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [effectiveQrCode]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleAddMenuItem = async (menuItemId) => {
    if (!cart) return;
    try {
      const res = await customerApi.addCartItem({
        orderId: cart.id,
        itemType: 'menu_item',
        menuItemId,
        quantity: 1
      });
      setCart(res.data.cart);
      toast.success('Đã thêm vào giỏ');
    } catch (e) {
      const status = e.response?.status;
      if (status === 410) {
        toast.error('Giỏ hàng hết hạn. Đang làm mới...');
        await loadAll();
        return;
      }
      toast.error(e.response?.data?.message || 'Lỗi thêm món');
    }
  };

  const handleAddCombo = async (comboId) => {
    if (!cart) return;
    try {
      const res = await customerApi.addCartItem({
        orderId: cart.id,
        itemType: 'combo',
        comboId,
        quantity: 1
      });
      setCart(res.data.cart);
      toast.success('Đã thêm combo vào giỏ');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Lỗi thêm combo');
    }
  };

  const handleQtyChange = async (orderItemId, newQty) => {
    if (!cart) return;
    try {
      const res = await customerApi.updateCartItem(orderItemId, { quantity: newQty });
      setCart(res.data.cart);
    } catch (e) {
      toast.error('Cập nhật thất bại');
    }
  };

  const handleRemove = async (orderItemId) => {
    if (!cart) return;
    try {
      const res = await customerApi.removeCartItem(orderItemId);
      setCart(res.data.cart);
    } catch (e) {
      toast.error('Xóa món thất bại');
    }
  };

  const handlePlaceOrderSuccess = (order) => {
    setPlacedOrder(order);
    setCart(null);
  };

  // Socket.IO Logic
  useEffect(() => {
    if (!placedOrder?.id || !placedOrder?.sessionId) return;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const socket = io(apiUrl, { withCredentials: true });

    socket.on('connect', () => {
      socket.emit('join_order', { orderId: placedOrder.id, sessionId: placedOrder.sessionId });
    });

    socket.on('order_status_changed', (data) => {
      setPlacedOrder(prev => {
        if (!prev) return null;
        if (data.status === 'completed') setReviewModalOpen(true);
        return { ...prev, orderStatus: data.status };
      });
    });

    socket.on('payment_confirmed', () => {
      setPlacedOrder(prev => prev ? { ...prev, paymentStatus: 'paid' } : null);
      toast.success('Thanh toán thành công!');
    });

    return () => {
      socket.emit('leave_order', { orderId: placedOrder.id });
      socket.disconnect();
    };
  }, [placedOrder?.id, placedOrder?.sessionId]);

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!bootstrap) return <div className="flex h-screen items-center justify-center p-6 text-center">Không tải được dữ liệu QR.</div>;

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 bg-gray-50 min-h-screen">
      {/* Tracking Banner */}
      {placedOrder && (
        <div className="mb-6 rounded-3xl border border-green-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 animate-ping rounded-full bg-green-500"></div>
            <h3 className="font-bold text-gray-900">Đơn hàng đang theo dõi: #{placedOrder.orderNumber}</h3>
          </div>
          <div className="mt-2 text-sm text-gray-500">Trạng thái: <span className="font-bold text-indigo-600 uppercase italic">{placedOrder.orderStatus}</span></div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-2xl shadow-md">
             <ImageWithFallback src={restaurant?.logoUrl} alt={restaurant?.name} className="h-full w-full object-cover" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">{restaurant?.name}</h1>
            <p className="text-sm font-medium text-gray-500">Bàn số <span className="text-indigo-600 font-bold">{table?.tableNumber}</span></p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setReviewModalOpen(true)} 
            className="flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-bold text-yellow-900 shadow-sm transition-all hover:bg-yellow-500 active:scale-95"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
            Đánh giá
          </button>
          <button onClick={loadAll} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-50 active:scale-95">Lấy lại thực đơn</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Menu Section */}
        <div className="lg:col-span-2">
          {/* Filters */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
            <input
              className="flex-1 rounded-2xl border-none bg-white px-5 py-3.5 text-sm shadow-sm outline-none ring-1 ring-gray-100 focus:ring-2 focus:ring-indigo-500"
              placeholder="Bạn muốn ăn món gì hôm nay?"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              className="rounded-2xl border-none bg-white px-5 py-3.5 text-sm font-bold shadow-sm outline-none ring-1 ring-gray-100 focus:ring-2 focus:ring-indigo-500"
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
            >
              <option value="all">Tất cả danh mục</option>
              {categoriesToRender.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {combinedItems.map((it) => (
              <div
                key={it.isCombo ? `combo-${it.id}` : `item-${it.id}`}
                className="group relative flex flex-col overflow-hidden rounded-[2rem] border border-transparent bg-white shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]"
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
                <div className="h-44 w-full overflow-hidden">
                  <ImageWithFallback src={it.imageUrl} alt={it.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  {it.isCombo && (
                    <div className="absolute top-4 left-4 rounded-full bg-gradient-to-r from-orange-500 to-red-600 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-lg">Combo Đặc biệt</div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-lg font-black text-gray-900 line-clamp-1">{it.name}</h3>
                  <p className="mt-1 text-xs text-gray-400 line-clamp-2 min-h-[32px]">{it.description || 'Tuyệt tác ẩm thực hoàn hảo cho bạn.'}</p>
                  
                  <div className="mt-5 flex items-end justify-between">
                    <div className="flex flex-col">
                      <span className="text-xl font-black text-indigo-600">{formatMoney(it.discountPrice ?? it.price)}</span>
                      {it.discountPrice && <span className="text-[10px] text-gray-400 line-through">{formatMoney(it.price)}</span>}
                    </div>
                    <button
                      className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100 transition-all hover:bg-black hover:shadow-xl"
                      onClick={(e) => {
                        e.stopPropagation();
                        it.isCombo ? handleAddCombo(it.id) : handleAddMenuItem(it.id);
                      }}
                    >
                      <PlusIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cart Section */}
        <div className="lg:sticky lg:top-8">
           <div className="rounded-[2.5rem] border border-gray-100 bg-white p-6 shadow-xl">
              <h2 className="text-xl font-black text-gray-900 border-b border-gray-50 pb-4 mb-4">Giỏ hàng</h2>
              
              {(!cart || (cart.items || []).length === 0) ? (
                <div className="py-12 text-center text-gray-300 italic text-sm">Chưa có món nào. <br/>Hãy chọn món bạn thích!</div>
              ) : (
                <>
                  <div className="space-y-5 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {cart.items.map(ci => (
                      <div key={ci.id} className="group relative flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                           <div className="flex-1">
                              <div className="text-sm font-bold text-gray-800 leading-tight">{ci.itemName}</div>
                              <div className="text-[10px] text-gray-400 font-medium">{formatMoney(ci.unitPrice)}/món</div>
                           </div>
                           <div className="text-sm font-black text-indigo-600">{formatMoney(ci.totalPrice)}</div>
                        </div>
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-4 bg-gray-50 rounded-xl px-2 py-1">
                              <button className="h-6 w-6 text-gray-400 hover:text-indigo-600 disabled:opacity-30" onClick={() => handleQtyChange(ci.id, ci.quantity - 1)} disabled={ci.quantity <= 1}>-</button>
                              <span className="text-sm font-black w-4 text-center">{ci.quantity}</span>
                              <button className="h-6 w-6 text-gray-400 hover:text-indigo-600" onClick={() => handleQtyChange(ci.id, ci.quantity + 1)}>+</button>
                           </div>
                           <button className="text-[10px] font-bold text-gray-300 hover:text-red-500 uppercase tracking-widest" onClick={() => handleRemove(ci.id)}>Xóa món</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 space-y-3 border-t border-gray-50 pt-6">
                    <div className="flex justify-between text-xs text-gray-500 font-medium"><span>Tạm tính</span><span>{formatMoney(cartTotals.subtotal)}</span></div>
                    <div className="flex justify-between text-xs text-gray-500 font-medium"><span>Thuế & Phí</span><span>{formatMoney(cartTotals.taxAmount + cartTotals.serviceCharge)}</span></div>
                    <div className="flex justify-between pt-2">
                       <span className="text-lg font-black text-gray-900 uppercase tracking-tighter">Tổng cộng</span>
                       <span className="text-2xl font-black text-indigo-600">{formatMoney(cartTotals.totalAmount)}</span>
                    </div>
                  </div>

                  <button
                    className="mt-8 w-full rounded-2xl bg-black py-4 text-sm font-black uppercase tracking-widest text-white shadow-2xl transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-30"
                    disabled={!cart?.items?.length}
                    onClick={() => setPlaceOrderModalOpen(true)}
                  >
                    Xác nhận đặt hàng
                  </button>
                </>
              )}
           </div>
        </div>
      </div>

      {/* Modals */}
      <MenuItemDetailModal open={modalOpen} onClose={() => setModalOpen(false)} menuItem={selectedMenuItem} />
      <ComboDetailModal open={comboModalOpen} onClose={() => setComboModalOpen(false)} combo={selectedCombo} onAdd={handleAddCombo} />
      <PlaceOrderModal open={placeOrderModalOpen} onClose={() => setPlaceOrderModalOpen(false)} cart={cart} onSuccess={handlePlaceOrderSuccess} />
      <ReviewModal 
        isOpen={reviewModalOpen} 
        onClose={() => setReviewModalOpen(false)} 
        restaurantId={restaurantId}
        order={placedOrder} 
      />
    </div>
  );
};

export default CustomerMenuPage;