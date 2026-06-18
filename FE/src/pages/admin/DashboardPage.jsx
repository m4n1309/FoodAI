import { useState, useMemo, Fragment, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth.js';
import AdminLayout from '../../components/admin/AdminLayout';
import httpClient from '../../services/httpClient.js';
import tableService from '../../services/tableService.js';
import menuItemService from '../../services/menuItemService.js';
import orderService from '../../services/orderService.js';
import toast from 'react-hot-toast';
import { Dialog, Transition } from '@headlessui/react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ShoppingBagIcon,
  TableCellsIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PlusIcon,
  XMarkIcon,
  MinusIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  ClipboardDocumentListIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  console.log('--- DASHBOARD RENDER ---');

  // 1. Fetch real dashboard stats
  const { data: statsResponse, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => httpClient.get('/reports/dashboard-stats'),
    refetchInterval: 15000, // Refetch every 15 seconds
  });

  const dashboardData = statsResponse?.data || {};
  const statsInfo = dashboardData.stats || {
    totalRevenue: 0,
    revenueChange: '0%',
    revenueTrend: 'up',
    todayOrdersCount: 0,
    ordersChange: '0%',
    ordersTrend: 'up',
    totalMenuItems: 0,
    occupiedTables: 0,
    totalTables: 0
  };
  const recentOrdersList = dashboardData.recentOrders || [];

  // Order Placement Modal States
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    tableId: '',
    customerName: 'Khách dùng tại bàn',
    customerPhone: '',
  });
  const [selectedItems, setSelectedItems] = useState([]);

  // 2. Fetch active tables for ordering
  const { data: tablesResponse } = useQuery({
    queryKey: ['activeTables'],
    queryFn: () => tableService.getAll({ limit: 100 }),
    enabled: isOrderModalOpen
  });
  const tables = tablesResponse?.data?.tables || [];

  // 3. Fetch available menu items
  const { data: menuItemsResponse } = useQuery({
    queryKey: ['availableMenuItems'],
    queryFn: () => menuItemService.getAll({ limit: 100, isAvailable: true }),
    enabled: isOrderModalOpen
  });
  const menuItems = menuItemsResponse?.data?.menuItems || [];

  // Filter menu items by search term
  const filteredMenuItems = useMemo(() => {
    if (!searchTerm.trim()) return menuItems;
    return menuItems.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase().trim())
    );
  }, [menuItems, searchTerm]);

  // Modal Handlers
  const handleOpenOrderModal = () => {
    setFormData({
      tableId: '',
      customerName: 'Khách dùng tại bàn',
      customerPhone: '',
    });
    setSelectedItems([]);
    setSearchTerm('');
    setIsOrderModalOpen(true);
  };

  const handleCloseOrderModal = () => {
    setIsOrderModalOpen(false);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('openPOS') === 'true') {
      handleOpenOrderModal();
      navigate('/admin/dashboard', { replace: true });
    }
  }, [location.search, navigate]);

  const handleAddItemToCart = (item) => {
    setSelectedItems(prev => {
      const existing = prev.find(i => i.menuItemId === item.id);
      if (existing) {
        return prev.map(i => i.menuItemId === item.id 
          ? { ...i, quantity: i.quantity + 1 } 
          : i
        );
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          price: item.discountPrice ?? item.price,
          quantity: 1,
          specialInstructions: ''
        }
      ];
    });
    toast.success(`Đã thêm: ${item.name}`);
  };

  const handleUpdateCartQty = (menuItemId, change) => {
    setSelectedItems(prev => prev.map(item => {
      if (item.menuItemId === menuItemId) {
        const newQty = Math.max(1, item.quantity + change);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleRemoveFromCart = (menuItemId) => {
    setSelectedItems(prev => prev.filter(item => item.menuItemId !== menuItemId));
  };

  const handleUpdateItemNote = (menuItemId, note) => {
    setSelectedItems(prev => prev.map(item => 
      item.menuItemId === menuItemId 
        ? { ...item, specialInstructions: note } 
        : item
    ));
  };

  // Cart math
  const cartSubtotal = useMemo(() => {
    return selectedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }, [selectedItems]);

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!formData.tableId) {
      toast.error('Vui lòng chọn bàn ăn');
      return;
    }
    if (!formData.customerName.trim() || !formData.customerPhone.trim()) {
      toast.error('Vui lòng điền đầy đủ tên và số điện thoại khách hàng');
      return;
    }
    if (!/^[0-9+ ]{9,15}$/.test(formData.customerPhone.trim())) {
      toast.error('Số điện thoại không hợp lệ');
      return;
    }
    if (selectedItems.length === 0) {
      toast.error('Đơn hàng trống! Vui lòng chọn món ăn');
      return;
    }

    try {
      setModalLoading(true);
      const payload = {
        tableId: parseInt(formData.tableId, 10),
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        items: selectedItems.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions.trim() || null
        }))
      };

      await orderService.create(payload);
      toast.success('Đặt món cho khách thành công!');
      handleCloseOrderModal();
      refetchStats();
    } catch (error) {
      console.error('Staff place order error:', error);
      const msg = error.response?.data?.error || error.response?.data?.message || 'Không thể tạo đơn hàng';
      toast.error(msg);
    } finally {
      setModalLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-orange-100 text-orange-800 border-orange-200',
      confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
      preparing: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      ready: 'bg-green-100 text-green-800 border-green-200',
      serving: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      completed: 'bg-gray-100 text-gray-800 border-gray-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
    };
    const labels = {
      pending: 'Chờ duyệt',
      confirmed: 'Đã xác nhận',
      preparing: 'Đang chuẩn bị',
      ready: 'Sẵn sàng phục vụ',
      serving: 'Đang phục vụ',
      completed: 'Đã hoàn thành',
      cancelled: 'Đã hủy',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badges[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const stats = [
    ...(user?.role !== 'waiter' ? [{
      name: 'Doanh thu hôm nay',
      value: `${statsInfo.totalRevenue.toLocaleString('vi-VN')} đ`,
      change: statsInfo.revenueChange,
      trend: statsInfo.revenueTrend,
      icon: CurrencyDollarIcon,
      color: 'from-emerald-500 to-green-400 text-emerald-600',
    }] : []),
    {
      name: 'Đơn hàng mới hôm nay',
      value: statsInfo.todayOrdersCount.toString(),
      change: statsInfo.ordersChange,
      trend: statsInfo.ordersTrend,
      icon: ShoppingCartIcon,
      color: 'from-sky-500 to-blue-400 text-sky-600',
    },
    {
      name: 'Món ăn khả dụng',
      value: statsInfo.totalMenuItems.toString(),
      change: 'Hoạt động',
      trend: 'up',
      icon: ShoppingBagIcon,
      color: 'from-violet-500 to-purple-400 text-violet-600',
    },
    {
      name: 'Số bàn đang dùng',
      value: `${statsInfo.occupiedTables}/${statsInfo.totalTables}`,
      change: 'Bàn ăn',
      trend: 'down',
      icon: TableCellsIcon,
      color: 'from-orange-500 to-amber-400 text-orange-600',
    },
  ];

  return (
    <AdminLayout title="Tổng quan (Dashboard)">
      {/* Welcome banner */}
      <div className="mb-8 p-6 rounded-3xl bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 border border-slate-700 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="relative z-10">
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            Chào mừng trở lại, {user?.fullName || 'Nhân viên'}!
            <SparklesIcon className="w-6 h-6 text-yellow-400 animate-pulse" />
          </h2>
          <p className="text-slate-300 text-sm mt-1">
            Hôm nay là {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. Dưới đây là trạng thái hoạt động trực tiếp của nhà hàng.
          </p>
        </div>
        <button
          onClick={handleOpenOrderModal}
          className="btn-primary py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 font-bold whitespace-nowrap shadow-lg shadow-primary-600/30 hover:translate-y-[-2px] active:translate-y-0 transition-all z-10"
        >
          <UserPlusIcon className="w-5 h-5" />
          Đặt món cho khách
        </button>
        {/* Background glow decorator */}
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-primary-500/10 blur-3xl" />
      </div>

      {statsLoading ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat) => (
              <div key={stat.name} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{stat.name}</p>
                  <p className="text-2xl font-black text-gray-900 mt-2">{stat.value}</p>
                  <div className="flex items-center mt-2.5">
                    {stat.trend === 'up' ? (
                      <ArrowTrendingUpIcon className="h-4.5 w-4.5 text-green-500 mr-1" />
                    ) : (
                      <ArrowTrendingDownIcon className="h-4.5 w-4.5 text-red-500 mr-1" />
                    )}
                    <span className={`text-xs font-semibold ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.change}
                    </span>
                    <span className="text-[10px] text-gray-400 ml-1.5 font-medium">so với hôm qua</span>
                  </div>
                </div>
                <div className={`h-12 w-12 rounded-2xl bg-gradient-to-tr ${stat.color.split(' ')[0]} ${stat.color.split(' ')[1]} p-3 flex items-center justify-center shadow-inner`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent orders */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <ClipboardDocumentListIcon className="w-6 h-6 text-primary-600" />
                  <h3 className="text-lg font-black text-gray-900">Đơn hàng mới nhất</h3>
                </div>
                <button
                  onClick={() => navigate('/admin/orders')}
                  className="text-xs font-bold text-primary-600 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Xem tất cả
                </button>
              </div>

              {recentOrdersList.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mb-3">
                    <ShoppingCartIcon className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm">Chưa có đơn hàng nào hôm nay</h4>
                  <p className="text-xs text-gray-400 mt-1">Các đơn hàng mới của nhà hàng sẽ hiển thị tại đây.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="pb-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Mã đơn</th>
                        <th className="pb-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Bàn</th>
                        <th className="pb-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Món</th>
                        <th className="pb-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Tổng tiền</th>
                        <th className="pb-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Trạng thái</th>
                        <th className="pb-3 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Đặt lúc</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {recentOrdersList.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 text-xs font-bold text-gray-800">{order.orderNumber}</td>
                          <td className="py-4 text-xs font-semibold text-gray-600">Bàn {order.tableNumber}</td>
                          <td className="py-4 text-xs text-gray-500">{order.itemCount} món</td>
                          <td className="py-4 text-xs font-bold text-gray-900">{order.totalAmount.toLocaleString('vi-VN')} đ</td>
                          <td className="py-4">{getStatusBadge(order.orderStatus)}</td>
                          <td className="py-4 text-right text-xs text-gray-400 font-semibold">
                            {order.createdAt && !isNaN(new Date(order.createdAt).getTime())
                              ? new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Quick Actions & Restaurant info */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-black text-gray-900 mb-5 flex items-center gap-2">
                  Thao tác nhanh
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={handleOpenOrderModal}
                    className="w-full btn-primary justify-center py-3.5 rounded-xl font-bold shadow-md shadow-primary-500/10"
                  >
                    + Đặt món tại bàn
                  </button>
                  <button 
                    onClick={() => navigate('/admin/menu-items')}
                    className="w-full btn-secondary justify-center py-3.5 rounded-xl font-semibold"
                  >
                    {user?.role === 'waiter' ? 'Xem thực đơn' : '+ Quản lý thực đơn'}
                  </button>
                  <button
                    onClick={() => navigate('/admin/tables')}
                    className="w-full btn-secondary justify-center py-3.5 rounded-xl font-semibold"
                  >
                    {user?.role === 'waiter' ? 'Sơ đồ bàn ăn' : '+ Sơ đồ bàn ăn'}
                  </button>
                  {user?.role !== 'waiter' && (
                    <button
                      onClick={() => navigate('/admin/reports')}
                      className="w-full btn-secondary justify-center py-3.5 rounded-xl font-semibold"
                    >
                      📊 Báo cáo doanh số
                    </button>
                  )}
                </div>
              </div>

              {/* Restaurant info card */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Nhà hàng của bạn</h4>
                <div className="space-y-3.5 text-xs font-semibold">
                  <div className="flex justify-between border-b border-gray-50 pb-2">
                    <span className="text-gray-400">Tên cơ sở:</span>
                    <span className="text-gray-800">{user?.restaurant?.name || 'm4nfood'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-2">
                    <span className="text-gray-400">Tổng số bàn:</span>
                    <span className="text-gray-800">{statsInfo.totalTables} bàn</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-2">
                    <span className="text-gray-400">Món khả dụng:</span>
                    <span className="text-gray-800">{statsInfo.totalMenuItems} món</span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="text-gray-400">Địa chỉ:</span>
                    <span className="text-gray-700 text-right max-w-[180px] truncate">{user?.restaurant?.address || '123 Nguyễn Huệ, Q1'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* POS Order Creation Dialog Modal */}
      <Transition appear show={isOrderModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={handleCloseOrderModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95 translate-y-4"
                enterTo="opacity-100 scale-100 translate-y-0"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100 translate-y-0"
                leaveTo="opacity-0 scale-95 translate-y-4"
              >
                <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-[2rem] bg-white p-8 shadow-2xl transition-all border border-gray-50 flex flex-col md:flex-row gap-8">
                  {/* Left Column: Form & Menu Select */}
                  <div className="flex-1 space-y-4">
                    <Dialog.Title className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                      <SparklesIcon className="w-6 h-6 text-primary-600" />
                      Tạo đơn đặt món cho khách
                    </Dialog.Title>

                    {/* Table Select */}
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Chọn Bàn Ăn <span className="text-red-500">*</span></label>
                      <select
                        value={formData.tableId}
                        onChange={(e) => setFormData(prev => ({ ...prev, tableId: e.target.value }))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                        required
                        disabled={modalLoading}
                      >
                        <option value="">-- Click chọn bàn trống --</option>
                        {tables.map(t => (
                          <option key={t.id} value={t.id}>
                            Bàn {t.tableNumber} - {t.location} ({t.status === 'occupied' ? 'Có khách' : 'Trống'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Customer Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Tên Khách Hàng <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={formData.customerName}
                          onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                          placeholder="Ví dụ: Khách tại bàn"
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                          required
                          disabled={modalLoading}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Số Điện Thoại <span className="text-red-500">*</span></label>
                        <input
                          type="tel"
                          value={formData.customerPhone}
                          onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                          placeholder="Ví dụ: 0987654321"
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                          required
                          disabled={modalLoading}
                        />
                      </div>
                    </div>

                    {/* Search & Add Menu Items */}
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Tìm kiếm món ăn</label>
                      <div className="relative mb-3">
                        <input
                          type="text"
                          placeholder="Nhập tên món ăn cần thêm..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
                        />
                        <MagnifyingGlassIcon className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                      </div>

                      {/* Menu Items Grid */}
                      <div className="max-h-[220px] overflow-y-auto border border-gray-100 rounded-2xl p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50/50">
                        {filteredMenuItems.map(item => (
                          <div 
                            key={item.id} 
                            onClick={() => handleAddItemToCart(item)}
                            className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-primary-500 hover:shadow transition-all group"
                          >
                            <div className="flex items-center gap-2">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
                              ) : (
                                <div className="w-10 h-10 bg-gray-100 text-gray-400 flex items-center justify-center rounded-lg font-bold text-xs">Menu</div>
                              )}
                              <div>
                                <h5 className="text-xs font-bold text-gray-800 line-clamp-1 group-hover:text-primary-600">{item.name}</h5>
                                <p className="text-[10px] text-gray-500 font-bold mt-0.5">{(item.discountPrice ?? item.price).toLocaleString()} đ</p>
                              </div>
                            </div>
                            <span className="p-1 bg-primary-50 rounded-lg text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                              <PlusIcon className="w-4.5 h-4.5" />
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Cart items & Checkout */}
                  <div className="w-full md:w-[320px] border-t md:border-t-0 md:border-l border-gray-100 pt-6 md:pt-0 md:pl-8 flex flex-col justify-between">
                    <div className="space-y-4">
                      <h4 className="text-sm font-black text-gray-800 border-b border-gray-50 pb-2">Danh sách đã chọn ({selectedItems.length})</h4>
                      
                      {/* Cart Items List */}
                      <div className="max-h-[260px] overflow-y-auto space-y-3.5 pr-1">
                        {selectedItems.length === 0 ? (
                          <div className="py-8 text-center text-gray-400 text-xs font-semibold">Chưa chọn món ăn nào. Click món bên trái để thêm.</div>
                        ) : (
                          selectedItems.map(item => (
                            <div key={item.menuItemId} className="border-b border-gray-50 pb-3 space-y-1.5">
                              <div className="flex justify-between items-start gap-1">
                                <span className="text-xs font-bold text-gray-800 line-clamp-1">{item.name}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFromCart(item.menuItemId)}
                                  className="text-red-500 hover:text-red-600 font-bold text-[10px]"
                                >
                                  Xóa
                                </button>
                              </div>
                              <div className="flex justify-between items-center">
                                <p className="text-[10px] text-gray-400 font-bold">{(item.price * item.quantity).toLocaleString()} đ</p>
                                <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateCartQty(item.menuItemId, -1)}
                                    className="p-1 hover:bg-gray-100"
                                  >
                                    <MinusIcon className="w-3.5 h-3.5 text-gray-500" />
                                  </button>
                                  <span className="px-2 text-xs font-bold text-gray-700">{item.quantity}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateCartQty(item.menuItemId, 1)}
                                    className="p-1 hover:bg-gray-100"
                                  >
                                    <PlusIcon className="w-3.5 h-3.5 text-gray-500" />
                                  </button>
                                </div>
                              </div>
                              {/* Instructions Input */}
                              <input
                                type="text"
                                placeholder="Ghi chú món ăn (ví dụ: Không cay)"
                                value={item.specialInstructions}
                                onChange={(e) => handleUpdateItemNote(item.menuItemId, e.target.value)}
                                className="w-full bg-gray-50/50 border border-gray-200 rounded-lg px-2 py-1 text-[10px] font-semibold outline-none focus:ring-1 focus:ring-primary-500 focus:bg-white"
                              />
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
                      {/* Price summary */}
                      <div className="flex justify-between font-black text-sm text-gray-900">
                        <span>Tổng tiền:</span>
                        <span>{cartSubtotal.toLocaleString()} đ</span>
                      </div>

                      {/* Modal Actions */}
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={handleCloseOrderModal}
                          className="flex-1 btn-secondary py-3 text-xs font-bold"
                          disabled={modalLoading}
                        >
                          Hủy
                        </button>
                        <button
                          onClick={handlePlaceOrder}
                          className="flex-1 btn-primary py-3 text-xs font-bold shadow-md shadow-primary-500/10"
                          disabled={modalLoading || selectedItems.length === 0}
                        >
                          {modalLoading ? 'Đang tạo...' : 'Xác nhận đặt'}
                        </button>
                      </div>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </AdminLayout>
  );
};

export default DashboardPage;