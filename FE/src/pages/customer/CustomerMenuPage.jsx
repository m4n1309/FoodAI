import { useEffect, useMemo, useState, useCallback } from 'react';
import MenuItemDetailModal from '../../components/customer/MenuItemDetailModal';
import ComboDetailModal from '../../components/customer/ComboDetailModal';
import PlaceOrderModal from '../../components/customer/PlaceOrderModal';
import ReviewModal from '../../components/customer/ReviewModal';
import CheckInModal from '../../components/customer/CheckInModal';
import ChatbotWidget from '../../components/customer/ChatbotWidget.jsx';
import ImageWithFallback from '../../components/common/ImageWithFallback';
import { useLocation, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { default as io } from 'socket.io-client';
import customerApi from '../../services/customerService.js';
import { PlusIcon, MapPinIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';

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
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);

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
      if (!currentCart.customerId && !savedCustomer) {
        setShowCheckIn(true);
      } else if (currentCart.customerId && !savedCustomer) {
        sessionStorage.setItem('foodai_customer', JSON.stringify({
          id: currentCart.customerId,
          fullName: currentCart.customerName,
          phone: currentCart.customerPhone
        }));
      }
    } catch (e) {
      toast.error('Failed to load menu');
    } finally {
      setLoading(false);
    }
  }, [effectiveQrCode]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleCheckIn = async (data) => {
    setCheckInLoading(true);
    try {
      const res = await customerApi.checkIn(data);
      sessionStorage.setItem('foodai_customer', JSON.stringify(res.data));
      toast.success(`Chào mừng ${res.data.fullName}!`);
      setShowCheckIn(false);
    } catch (e) {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleSkipCheckIn = () => {
    sessionStorage.setItem('foodai_customer', JSON.stringify({ isGuest: true }));
    setShowCheckIn(false);
  };

  const handleAddMenuItem = async (menuItemId, qty = 1) => {
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
    if (!cart) return;
    try {
      const res = await customerApi.addCartItem({ orderId: cart.id, itemType: 'combo', comboId, quantity: qty });
      setCart(res.data.cart);
      toast.success('Đã thêm combo vào giỏ');
    } catch (e) {
      toast.error('Lỗi thêm combo');
    }
  };

  const handleQtyChange = async (orderItemId, newQty) => {
    if (!cart) return;
    try {
      const res = await customerApi.updateCartItem(orderItemId, { quantity: newQty });
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
            <div className="text-3xl font-black text-primary-600 tracking-tighter">FreshDash</div>
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
             <button className="hidden sm:block border border-primary-600 text-primary-600 px-5 py-2 rounded-full text-sm font-bold hover:bg-primary-50 transition-colors">
               Login
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
                      <p className="text-xs text-gray-500 font-medium line-clamp-1 mb-4">{restaurant?.name || 'FreshDash Partner'} • {it.isCombo ? 'Combo' : 'Món lẻ'}</p>
                      
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
               <div className="text-2xl font-black text-primary-700 tracking-tighter mb-4">FreshDash</div>
               <p className="text-sm text-gray-700 font-medium max-w-sm mx-auto">Phục vụ tận tâm, hương vị trọn vẹn. Khám phá hàng ngàn món ngon mỗi ngày.</p>
               <p className="text-xs text-gray-500 font-medium mt-8">© 2024 FreshDash Inc. All rights reserved.</p>
            </div>
         </div>
      </footer>

      {/* Modals */}
      <MenuItemDetailModal open={modalOpen} onClose={() => setModalOpen(false)} menuItem={selectedMenuItem} onAddToCart={handleAddMenuItem} />
      <ComboDetailModal open={comboModalOpen} onClose={() => setComboModalOpen(false)} combo={selectedCombo} onAdd={(comboId, qty) => handleAddCombo(comboId, qty)} />
      <PlaceOrderModal 
        open={placeOrderModalOpen} 
        onClose={() => setPlaceOrderModalOpen(false)} 
        cart={cart} 
        onSuccess={handlePlaceOrderSuccess} 
        onUpdateQty={handleQtyChange}
        onRemoveItem={handleRemove}
      />
      <ReviewModal isOpen={reviewModalOpen} onClose={() => setReviewModalOpen(false)} restaurantId={String(restaurantId || '')} order={placedOrder} />
      <CheckInModal open={showCheckIn} loading={checkInLoading} onSubmit={handleCheckIn} onSkip={handleSkipCheckIn} />
      <ChatbotWidget restaurantId={restaurantId} tableId={table?.id} />
    </div>
  );
};

export default CustomerMenuPage;
