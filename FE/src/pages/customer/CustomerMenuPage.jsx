import { useEffect, useMemo, useState } from 'react';
import MenuItemDetailModal from '../../components/customer/MenuItemDetailModal';
import PlaceOrderModal from '../../components/customer/PlaceOrderModal';
import { useLocation, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import customerApi from '../../services/customerService.js';

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

  // Menu item detail modal
  const [selectedMenuItem, setSelectedMenuItem] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Place order modal + placed order result
  const [placeOrderModalOpen, setPlaceOrderModalOpen] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);

  const restaurantId = bootstrap?.table?.restaurantId;
  const tableId = bootstrap?.table?.id;

  const categories = useMemo(() => bootstrap?.categories || [], [bootstrap]);
  const menuItems = useMemo(() => bootstrap?.menuItems || [], [bootstrap]);

  const filteredMenuItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menuItems.filter((it) => {
      const matchSearch = !q || it.name?.toLowerCase().includes(q) || it.description?.toLowerCase().includes(q);
      const matchCategory = categoryId === 'all' || String(it.categoryId) === String(categoryId);
      return matchSearch && matchCategory;
    });
  }, [menuItems, search, categoryId]);

  const cartTotals = useMemo(() => {
    return {
      subtotal: Number(cart?.subtotal || 0),
      taxAmount: Number(cart?.taxAmount || 0),
      serviceCharge: Number(cart?.serviceCharge || 0),
      totalAmount: Number(cart?.totalAmount || 0)
    };
  }, [cart]);

  const loadAll = async () => {
    try {
      setLoading(true);

      if (!effectiveQrCode) {
        toast.error('Thiếu mã QR. Vui lòng quét lại mã.');
        setBootstrap(null);
        setCart(null);
        return;
      }

      const bootRes = await customerApi.bootstrap(effectiveQrCode);
      // axiosClient returns {success,message,data}; your FE axios wrappers currently use response.data
      // Here assume axiosClient returns response.data directly? In your admin FE, you do response.data.tables.
      // So: bootRes.data is the "data" field from backend.
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
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveQrCode]);

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
      const msg = e.response?.data?.message || 'Add to cart failed';

      if (status === 410) {
        toast.error('Giỏ hàng đã hết hạn (2 giờ không hoạt động). Đang tạo giỏ mới...');
        await loadAll();
        return;
      }

      toast.error(msg);
    }
  };

  const handleQtyChange = async (orderItemId, newQty) => {
    if (!cart) return;
    try {
      const res = await customerApi.updateCartItem(orderItemId, { quantity: newQty });
      setCart(res.data.cart);
    } catch (e) {
      const status = e.response?.status;
      if (status === 410) {
        toast.error('Giỏ hàng đã hết hạn. Đang tạo giỏ mới...');
        await loadAll();
        return;
      }
      toast.error(e.response?.data?.message || 'Update failed');
    }
  };

  const handleRemove = async (orderItemId) => {
    if (!cart) return;
    try {
      const res = await customerApi.removeCartItem(orderItemId);
      setCart(res.data.cart);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Remove failed');
    }
  };

  const handlePlaceOrderSuccess = (order) => {
    setPlacedOrder(order);
    // The cart is now 'pending' — clear local cart state so user can't keep editing
    setCart(null);
  };

  if (loading) return <div className="mx-auto max-w-5xl p-4">Loading...</div>;
  if (!bootstrap) return <div className="mx-auto max-w-5xl p-4">Không load được dữ liệu từ QR.</div>;

  return (
    <div className="mx-auto max-w-5xl p-4">
      {/* ✅ Order placed success banner */}
      {placedOrder && (
        <div className="mb-4 rounded-xl border border-green-300 bg-green-50 px-4 py-3">
          <div className="font-semibold text-green-800">🎉 Đơn hàng đã được gửi thành công!</div>
          <div className="mt-1 text-sm text-green-700">
            Mã đơn: <b>{placedOrder.orderNumber}</b> • Trạng thái:{' '}
            <span className="inline-block rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
              Đang chờ xác nhận
            </span>
          </div>
          <div className="mt-1 text-xs text-green-600">Nhân viên sẽ xử lý đơn của bạn trong giây lát. Cảm ơn!</div>
        </div>
      )}

      <div className="mb-3 flex items-start justify-between gap-3 border-b border-gray-200 pb-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{bootstrap.restaurant?.name || 'Restaurant'}</h1>
          <div className="mt-1.5 text-sm leading-relaxed text-gray-600">
            <span className="inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">Bàn {bootstrap.table?.tableNumber}</span>{' '}
            {cart?.orderNumber ? <span>• Cart: <b>{cart.orderNumber}</b></span> : null}
            <div className="mt-1.5">
              {bootstrap.restaurant?.address ? <div>Địa chỉ: {bootstrap.restaurant.address}</div> : null}
              {bootstrap.restaurant?.phone ? <div>Hotline: {bootstrap.restaurant.phone}</div> : null}
            </div>
          </div>
        </div>

        <button className="cursor-pointer rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200" onClick={loadAll}>Reload</button>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        {/* MENU */}
        <div className="rounded-xl border border-gray-200 bg-white p-3 lg:col-span-2">
          <div className="mb-3 flex gap-2.5">
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm món..."
            />
            <select
              className="w-full max-w-[220px] rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="all">Tất cả danh mục</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {filteredMenuItems.map((it) => (
              <div
                key={it.id}
                className="rounded-xl border border-gray-200 bg-white p-3 cursor-pointer hover:bg-gray-50"
                onClick={() => {
                  setSelectedMenuItem(it);
                  setModalOpen(true);
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-bold text-gray-900">{it.name}</div>
                    {it.description ? <div className="mt-1 text-sm text-gray-600">{it.description}</div> : null}
                    <div className="mt-2 text-sm text-gray-700">
                      Giá: <b>{formatMoney(it.discountPrice ?? it.price)}</b>
                      {it.discountPrice ? <span className="text-gray-500"> (gốc {formatMoney(it.price)})</span> : null}
                    </div>
                  </div>
                  <button
                    className="cursor-pointer rounded-lg border border-blue-700 bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddMenuItem(it.id);
                    }}
                  >
                    Thêm
                  </button>
                </div>
              </div>
            ))}
            {filteredMenuItems.length === 0 ? <div>Không có món phù hợp.</div> : null}
          </div>
        </div>

        {/* CART */}
        <div className="rounded-xl border border-gray-200 bg-white p-3 lg:col-span-1">
          <div className="mb-2.5 text-base font-extrabold text-gray-900">Giỏ hàng</div>

          {!cart ? (
            <div>Chưa có giỏ hàng.</div>
          ) : (
            <>
              <div className="mb-2 text-sm text-gray-600">
                Order: <b>{cart.orderNumber}</b>
              </div>

              <div className="grid gap-2.5">
                {(cart.items || []).map((ci) => (
                  <div key={ci.id} className="rounded-xl border border-gray-200 p-2.5">
                    <div className="font-bold text-gray-900">{ci.itemName}</div>
                    <div className="mt-1 text-sm text-gray-600">
                      Đơn giá: {formatMoney(ci.unitPrice)} • Thành tiền: <b>{formatMoney(ci.totalPrice)}</b>
                    </div>

                    <div className="mt-2.5 flex items-center gap-2">
                      <button
                        className="h-7 w-7 cursor-pointer rounded-md border border-gray-300 bg-white text-sm hover:bg-gray-100"
                        onClick={() => handleQtyChange(ci.id, Math.max(1, (ci.quantity || 1) - 1))}
                      >
                        -
                      </button>
                      <div className="min-w-6 text-center text-sm font-medium">{ci.quantity}</div>
                      <button
                        className="h-7 w-7 cursor-pointer rounded-md border border-gray-300 bg-white text-sm hover:bg-gray-100"
                        onClick={() => handleQtyChange(ci.id, (ci.quantity || 1) + 1)}
                      >
                        +
                      </button>

                      <button className="ml-auto cursor-pointer rounded-md border border-gray-300 bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200" onClick={() => handleRemove(ci.id)}>
                        Xóa
                      </button>
                    </div>
                  </div>
                ))}
                {(cart.items || []).length === 0 ? <div>Giỏ hàng trống.</div> : null}
              </div>

              <div className="mt-3 border-t border-gray-200 pt-3 text-sm">
                <div>Subtotal: <b>{formatMoney(cartTotals.subtotal)}</b></div>
                <div>Tax: <b>{formatMoney(cartTotals.taxAmount)}</b></div>
                <div>Service: <b>{formatMoney(cartTotals.serviceCharge)}</b></div>
                <div className="mt-1.5 text-base">Total: <b>{formatMoney(cartTotals.totalAmount)}</b></div>
              </div>

              {/* ✅ Place order button */}
              <button
                className="mt-3 w-full cursor-pointer rounded-lg border border-blue-700 bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setPlaceOrderModalOpen(true)}
                disabled={(cart.items || []).length === 0}
              >
                Đặt món
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mt-3.5 text-xs text-gray-500">
        QR: <code>{effectiveQrCode}</code> • restaurantId: {String(restaurantId || '')} • tableId: {String(tableId || '')}
      </div>

      {/* Menu item detail modal */}
      <MenuItemDetailModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        menuItem={selectedMenuItem}
      />

      {/* ✅ Place order modal */}
      <PlaceOrderModal
        open={placeOrderModalOpen}
        onClose={() => setPlaceOrderModalOpen(false)}
        cart={cart}
        onSuccess={handlePlaceOrderSuccess}
      />
    </div>
  );
};

export default CustomerMenuPage;