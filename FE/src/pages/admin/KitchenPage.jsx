import { useState, useEffect, useCallback, useMemo } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { useAuth } from '../../hooks/useAuth.js';
import { useSocket } from '../../hooks/useSocket.js';
import kitchenService from '../../services/kitchenService.js';
import categoryService from '../../services/categoryService.js';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const KitchenPage = () => {
  const { user } = useAuth();
  const socket = useSocket();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);

  // Filters and Sorting state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedUrgency, setSelectedUrgency] = useState('all');
  const [selectedDish, setSelectedDish] = useState('all');
  const [sortBy, setSortBy] = useState('urgency');

  const fetchCategories = useCallback(async () => {
    try {
      const response = await categoryService.getAll({
        restaurantId: user?.restaurantId,
        isActive: true,
        page: 1,
        limit: 100,
      });
      setCategories(response.data?.categories || response.data || []);
    } catch (error) {
      console.error('Fetch categories for kitchen failed:', error);
    }
  }, [user?.restaurantId]);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await kitchenService.getActiveOrders();
      setOrders(response.data || []);
    } catch (error) {
      console.error('Fetch kitchen orders error:', error);
      toast.error('Không thể tải danh sách món chờ nấu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.restaurantId) {
      fetchOrders();
      fetchCategories();
    }
  }, [user?.restaurantId, fetchOrders, fetchCategories]);

  // Polling every 2 seconds for new kitchen updates
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (user?.restaurantId) {
        kitchenService.getActiveOrders().then(res => {
          setOrders(res.data || []);
        }).catch(err => console.error('Kitchen silent fetch failed:', err));
      }
    }, 2000);
    return () => clearInterval(intervalId);
  }, [user?.restaurantId]);

  useEffect(() => {
    if (!socket) return;
    
    const handleRefresh = () => {
      fetchOrders();
    };

    // Listen to events that affect kitchen
    socket.on('order_placed', handleRefresh);
    socket.on('order_updated', handleRefresh); // When waiter confirms an order
    socket.on('item_status_changed', handleRefresh); // Just in case another kitchen staff updates it

    return () => {
      socket.off('order_placed', handleRefresh);
      socket.off('order_updated', handleRefresh);
      socket.off('item_status_changed', handleRefresh);
    };
  }, [socket, fetchOrders]);

  const handleUpdateItem = async (itemId, status) => {
    try {
      await kitchenService.updateItemStatus(itemId, status);
      // Let socket event trigger the refresh or do it optimistically
      fetchOrders();
    } catch (error) {
      toast.error('Không thể cập nhật món');
    }
  };

  const handleCancelItem = (itemId, itemName) => {
    if (window.confirm(`Bạn có chắc chắn muốn hủy hoặc báo hết món "${itemName}"? Món này sẽ không tính tiền vào hóa đơn.`)) {
      handleUpdateItem(itemId, 'cancelled');
    }
  };

  const handleUpdateGroup = async (instances, status) => {
    const validInstances = instances.filter(inst => {
      // Logic: only update backward or forward logic appropriately, or just update all that can be updated.
      if (status === 'preparing') return inst.item.itemStatus === 'pending';
      if (status === 'ready') return inst.item.itemStatus === 'pending' || inst.item.itemStatus === 'preparing';
      return false;
    });

    if (validInstances.length === 0) return;

    try {
      await Promise.all(validInstances.map(inst => kitchenService.updateItemStatus(inst.item.id, status)));
      fetchOrders();
      toast.success(`Đã cập nhật ${validInstances.length} món`);
    } catch (error) {
      toast.error('Có lỗi khi cập nhật nhóm món');
    }
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    preparing: 'bg-blue-100 text-blue-800',
    ready: 'bg-green-100 text-green-800',
  };

  const statusLabels = {
    pending: 'Chờ nấu',
    preparing: 'Đang nấu',
    ready: 'Đã xong'
  };

  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewMode, setViewMode] = useState('order'); // 'order' or 'item'

  // Clock to update time naturally
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Synchronize sorting when viewMode changes to avoid invalid sortBy option
  useEffect(() => {
    if (viewMode === 'order') {
      if (sortBy === 'quantity' || sortBy === 'name') {
        setSortBy('urgency');
      }
    } else {
      if (sortBy === 'table') {
        setSortBy('urgency');
      }
    }
  }, [viewMode, sortBy]);

  // Options for sorting
  const sortOptions = viewMode === 'order'
    ? [
        { value: 'urgency', label: '🚨 Khẩn cấp nhất' },
        { value: 'waitingTime', label: '⏱ Chờ lâu nhất' },
        { value: 'table', label: '🔢 Số bàn' }
      ]
    : [
        { value: 'urgency', label: '🚨 Khẩn cấp nhất' },
        { value: 'waitingTime', label: '⏱ Chờ lâu nhất' },
        { value: 'quantity', label: '📦 Số lượng nhiều nhất' },
        { value: 'name', label: '🔤 Tên món (A-Z)' }
      ];

  const ordersWithUrgency = useMemo(() => {
    if (!orders) return [];
    return orders.map(order => {
      let maxUrgencyScore = -100;
      
      const itemsWithUrgency = order.items.map(item => {
        const timeRef = new Date(item.createdAt || item.created_at || order.createdAt || order.created_at || new Date());
        const elapsedMs = currentTime.getTime() - timeRef.getTime();
        
        let prepTimeMn = 15; // default 15m
        if (item.menuItem?.preparationTime) prepTimeMn = item.menuItem.preparationTime;
        else if (item.combo?.preparationTime) prepTimeMn = item.combo.preparationTime;
        
        const prepTimeMs = prepTimeMn * 60 * 1000;
        const remainingMs = prepTimeMs - elapsedMs;
        
        let urgencyLevel = 'normal';
        let urgencyScore = elapsedMs / prepTimeMs; // Higher = more urgent
        
        if (item.itemStatus !== 'ready') {
          if (remainingMs < 0) {
            urgencyLevel = 'danger'; // Quá hạn
          } else if (remainingMs <= 3 * 60 * 1000 || remainingMs < prepTimeMs * 0.3) {
            urgencyLevel = 'warning'; // Gần đến hạn (< 3 phút hoặc < 30%)
          }
          if (urgencyScore > maxUrgencyScore) {
            maxUrgencyScore = urgencyScore;
          }
        } else {
          urgencyScore = -1; // lowest priority for ready items
        }

        const elapsedMinutes = Math.floor(elapsedMs / 1000 / 60);
        const elapsedSeconds = Math.floor((elapsedMs / 1000) % 60);
        const timeString = `${elapsedMinutes}'${elapsedSeconds.toString().padStart(2, '0')}s`;

        return { ...item, urgencyLevel, urgencyScore, timeString, prepTimeMn };
      });

      // Sort items within order: urgency
      itemsWithUrgency.sort((a, b) => b.urgencyScore - a.urgencyScore);

      const hasDanger = itemsWithUrgency.some(i => i.urgencyLevel === 'danger' && i.itemStatus !== 'ready');
      const hasWarning = itemsWithUrgency.some(i => i.urgencyLevel === 'warning' && i.itemStatus !== 'ready');
      
      let borderClass = 'border-t-primary-500';
      if (hasDanger) borderClass = 'border-t-red-500 shadow-[0_4px_12px_rgba(239,68,68,0.3)] ring-1 ring-red-200';
      else if (hasWarning) borderClass = 'border-t-orange-400 shadow-[0_4px_12px_rgba(249,115,22,0.2)] ring-1 ring-orange-200';

      return {
        ...order,
        items: itemsWithUrgency,
        maxUrgencyScore,
        borderClass
      };
    }).sort((a, b) => b.maxUrgencyScore - a.maxUrgencyScore);
  }, [orders, currentTime]);

  // Extract unique dish names from current active orders for filtering
  const activeDishNames = useMemo(() => {
    const set = new Set();
    ordersWithUrgency.forEach(order => {
      order.items.forEach(item => {
        if (item.itemStatus === 'pending' || item.itemStatus === 'preparing') {
          set.add(item.itemName);
        }
      });
    });
    return Array.from(set).sort();
  }, [ordersWithUrgency]);

  // Count identical active items in other orders for cross-referencing
  const ordersWithUrgencyAndDuplicates = useMemo(() => {
    if (!ordersWithUrgency) return [];

    // Calculate active quantities by dish name
    const activeCountsByDish = {};
    ordersWithUrgency.forEach(order => {
      order.items.forEach(item => {
        if (item.itemStatus === 'pending' || item.itemStatus === 'preparing') {
          const name = item.itemName;
          activeCountsByDish[name] = (activeCountsByDish[name] || 0) + item.quantity;
        }
      });
    });

    // Add duplicate count to each item
    return ordersWithUrgency.map(order => {
      const items = order.items.map(item => {
        let duplicatePendingCount = 0;
        if (item.itemStatus === 'pending' || item.itemStatus === 'preparing') {
          const totalActive = activeCountsByDish[item.itemName] || 0;
          duplicatePendingCount = totalActive - item.quantity;
        }
        return { ...item, duplicatePendingCount };
      });
      return { ...order, items };
    });
  }, [ordersWithUrgency]);

  // Filter orders by search term, category, status, urgency, and specific dish
  const filteredOrders = useMemo(() => {
    return ordersWithUrgencyAndDuplicates.map(order => {
      const filteredItems = order.items.filter(item => {
        // 1. Search term
        if (searchTerm.trim() && !item.itemName.toLowerCase().includes(searchTerm.toLowerCase().trim())) {
          return false;
        }
        // 2. Category
        if (selectedCategory !== 'all') {
          if (selectedCategory === 'combos') {
            if (!item.combo) return false;
          } else {
            if (!item.menuItem || String(item.menuItem.categoryId) !== String(selectedCategory)) return false;
          }
        }
        // 3. Status
        if (selectedStatus !== 'all' && item.itemStatus !== selectedStatus) {
          return false;
        }
        // 4. Urgency
        if (selectedUrgency !== 'all' && item.urgencyLevel !== selectedUrgency) {
          return false;
        }
        // 5. Selected Dish
        if (selectedDish !== 'all' && item.itemName !== selectedDish) {
          return false;
        }
        return true;
      });
      return { ...order, items: filteredItems };
    }).filter(order => order.items.length > 0);
  }, [ordersWithUrgencyAndDuplicates, searchTerm, selectedCategory, selectedStatus, selectedUrgency, selectedDish]);

  // Sort orders based on selection
  const sortedOrders = useMemo(() => {
    const list = [...filteredOrders];
    if (sortBy === 'urgency') {
      list.sort((a, b) => b.maxUrgencyScore - a.maxUrgencyScore);
    } else if (sortBy === 'waitingTime') {
      list.sort((a, b) => {
        const timeA = new Date(a.createdAt || a.created_at || new Date()).getTime();
        const timeB = new Date(b.createdAt || b.created_at || new Date()).getTime();
        return timeA - timeB; // Oldest first
      });
    } else if (sortBy === 'table') {
      list.sort((a, b) => {
        const numA = String(a.table?.tableNumber || '');
        const numB = String(b.table?.tableNumber || '');
        return numA.localeCompare(numB, undefined, { numeric: true });
      });
    }
    return list;
  }, [filteredOrders, sortBy]);

  // Aggregate and filter items view (Nấu chung)
  const aggregatedItems = useMemo(() => {
    if (!ordersWithUrgency) return [];
    
    const map = new Map();
    ordersWithUrgency.forEach(order => {
      order.items.forEach(item => {
        if (item.itemStatus === 'ready' || item.itemStatus === 'cancelled' || item.itemStatus === 'served') return;

        // 1. Search term
        if (searchTerm.trim() && !item.itemName.toLowerCase().includes(searchTerm.toLowerCase().trim())) {
          return;
        }
        // 2. Category
        if (selectedCategory !== 'all') {
          if (selectedCategory === 'combos') {
            if (!item.combo) return;
          } else {
            if (!item.menuItem || String(item.menuItem.categoryId) !== String(selectedCategory)) return;
          }
        }
        // 3. Status
        if (selectedStatus !== 'all' && item.itemStatus !== selectedStatus) {
          return;
        }
        // 4. Urgency
        if (selectedUrgency !== 'all' && item.urgencyLevel !== selectedUrgency) {
          return;
        }
        // 5. Selected Dish
        if (selectedDish !== 'all' && item.itemName !== selectedDish) {
          return;
        }

        const key = item.itemName; 
        
        if (!map.has(key)) {
          map.set(key, {
            itemName: item.itemName,
            totalQuantity: 0,
            instances: [],
            maxUrgencyScore: -100,
            hasDanger: false,
            hasWarning: false,
            earliestCreatedAt: new Date(),
          });
        }
        
        const group = map.get(key);
        group.totalQuantity += item.quantity;
        group.instances.push({ item, order });
        if (item.urgencyScore > group.maxUrgencyScore) group.maxUrgencyScore = item.urgencyScore;
        if (item.urgencyLevel === 'danger') group.hasDanger = true;
        if (item.urgencyLevel === 'warning') group.hasWarning = true;

        const itemTime = new Date(item.createdAt || item.created_at || order.createdAt || order.created_at || new Date());
        if (itemTime < group.earliestCreatedAt) {
          group.earliestCreatedAt = itemTime;
        }
      });
    });

    const result = Array.from(map.values());
    
    // Sort aggregated groups
    if (sortBy === 'urgency') {
      result.sort((a, b) => b.maxUrgencyScore - a.maxUrgencyScore);
    } else if (sortBy === 'waitingTime') {
      result.sort((a, b) => a.earliestCreatedAt.getTime() - b.earliestCreatedAt.getTime()); // Longest waiting first
    } else if (sortBy === 'quantity') {
      result.sort((a, b) => b.totalQuantity - a.totalQuantity); // Highest quantity first
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.itemName.localeCompare(b.itemName));
    }
    
    return result;
  }, [ordersWithUrgency, searchTerm, selectedCategory, selectedStatus, selectedUrgency, selectedDish, sortBy]);

  return (
    <AdminLayout title="Bảng Điều Khiển Bếp (KDS)">
      {/* Premium Filter and Switcher Console */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              Màn Hình Chế Biến KDS
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Thời gian thực • Tự động đồng bộ và cảnh báo trùng lặp</p>
          </div>
          
          {/* View Mode Switcher */}
          <div className="flex bg-gray-100 p-1 rounded-xl w-fit self-end lg:self-auto">
            <button
              onClick={() => setViewMode('order')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                viewMode === 'order' 
                  ? 'bg-white shadow-sm text-primary-700' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Theo Đơn / Bàn
            </button>
            <button
              onClick={() => setViewMode('item')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all relative ${
                viewMode === 'item' 
                  ? 'bg-white shadow-sm text-primary-700' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Gộp Món (Nấu chung)
              {ordersWithUrgencyAndDuplicates.some(order => order.items.some(item => item.duplicatePendingCount > 0)) && (
                <span className="absolute -top-1.5 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
          {/* Search Term */}
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm món ăn..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-8 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none text-gray-700"
            />
            <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none text-gray-700 cursor-pointer"
            >
              <option value="all">Tất cả danh mục</option>
              <option value="combos">Các gói Combo</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dish Filter */}
          <div>
            <select
              value={selectedDish}
              onChange={(e) => setSelectedDish(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none text-gray-700 cursor-pointer"
            >
              <option value="all">Tất cả món ăn</option>
              {activeDishNames.map((dishName) => (
                <option key={dishName} value={dishName}>
                  {dishName}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none text-gray-700 cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chờ nấu</option>
              <option value="preparing">Đang nấu</option>
            </select>
          </div>

          {/* Urgency Filter */}
          <div>
            <select
              value={selectedUrgency}
              onChange={(e) => setSelectedUrgency(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none text-gray-700 cursor-pointer"
            >
              <option value="all">Tất cả độ trễ</option>
              <option value="danger">🚨 Quá hạn (Trễ)</option>
              <option value="warning">⚠️ Sắp trễ</option>
              <option value="normal">✅ Bình thường</option>
            </select>
          </div>

          {/* Sorting */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none text-gray-700 cursor-pointer"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Quick info about filtered counts */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <span>Hiển thị: <strong>{viewMode === 'order' ? sortedOrders.length : aggregatedItems.length}</strong> {viewMode === 'order' ? 'đơn/bàn' : 'món gộp'}</span>
            {(searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all' || selectedUrgency !== 'all' || selectedDish !== 'all') && (
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                  setSelectedStatus('all');
                  setSelectedUrgency('all');
                  setSelectedDish('all');
                  setSortBy('urgency');
                }}
                className="text-primary-600 hover:text-primary-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                Đặt lại bộ lọc
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-400"></span> Chờ nấu</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500"></span> Đang nấu</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500"></span> Hoàn thành</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 text-lg">Tuyệt vời! Hiện không có đơn hàng nào cần nấu.</p>
        </div>
      ) : (viewMode === 'order' ? sortedOrders.length === 0 : aggregatedItems.length === 0) ? (
        <div className="card text-center py-12 bg-gray-50 border border-dashed border-gray-200">
          <p className="text-gray-500 text-base">Không có đơn hàng hoặc món ăn nào khớp với bộ lọc đang chọn.</p>
          <button 
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
              setSelectedStatus('all');
              setSelectedUrgency('all');
              setSelectedDish('all');
              setSortBy('urgency');
            }}
            className="mt-3 inline-flex items-center bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all cursor-pointer"
          >
            Xóa bộ lọc
          </button>
        </div>
      ) : viewMode === 'order' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
          {sortedOrders.map((order) => (
            <div key={order.id} className={`card bg-white shadow-md border-t-4 flex flex-col h-full transition-all duration-300 ${order.borderClass}`}>
              <div className="border-b pb-3 mb-3">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-lg text-gray-900 border-b-2 border-primary-200 pb-1">Bàn {order.table?.tableNumber || 'N/A'}</h3>
                  <span className="text-sm font-medium text-gray-500">
                    {format(new Date(order.createdAt || order.created_at || new Date()), 'HH:mm', { locale: vi })}
                  </span>
                </div>
                <p className="text-sm text-gray-600">Đơn: #{order.orderNumber.slice(-6)}</p>
                {order.customerNote && (
                  <p className="mt-2 text-sm bg-yellow-50 text-yellow-800 p-2 rounded">
                    <strong>Ghi chú đơn:</strong> {order.customerNote}
                  </p>
                )}
              </div>

              <div className="flex-1 space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className={`p-3 rounded-lg border transition-colors ${
                      item.urgencyLevel === 'danger' && item.itemStatus !== 'ready' ? 'bg-red-50 border-red-200' :
                      item.urgencyLevel === 'warning' && item.itemStatus !== 'ready' ? 'bg-orange-50 border-orange-200' :
                      'bg-gray-50 border-gray-100'
                    }`}>
                    <div className="flex justify-between items-start mb-2">
                       <div className="font-semibold text-gray-900 flex-1">
                        <span className="bg-white rounded px-2 py-0.5 border mr-2 text-primary-700">{item.quantity}x</span>
                        {item.itemName}
                        {item.itemStatus !== 'ready' && (
                          <div className="text-[11px] font-mono text-gray-500 mt-1 flex items-center gap-1">
                            <span>⏱ {item.timeString} / {item.prepTimeMn}'</span>
                            {item.urgencyLevel === 'danger' && <span className="text-red-600 font-bold ml-1 animate-pulse">QUÁ HẠN</span>}
                            {item.urgencyLevel === 'warning' && <span className="text-orange-600 font-bold ml-1">SẮP TRỄ</span>}
                          </div>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ml-2 ${statusColors[item.itemStatus]}`}>
                        {statusLabels[item.itemStatus] || item.itemStatus}
                      </span>
                    </div>

                    {item.specialInstructions && (
                      <p className="text-xs text-red-600 mb-2 italic">⚠️ {item.specialInstructions}</p>
                    )}

                    {/* Cross-reference Duplicate Alert Badge */}
                    {item.duplicatePendingCount > 0 && (
                      <button
                        onClick={() => {
                          setSearchTerm(item.itemName);
                          setViewMode('item');
                        }}
                        className="mt-1 mb-2 w-full flex items-center justify-center gap-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-1 px-2 rounded text-[11px] shadow-sm animate-pulse transition-all cursor-pointer"
                        title="Xem gộp món này để nấu chung cùng các bàn khác"
                      >
                        <span>🔥 Nấu chung: {item.duplicatePendingCount} phần khác đang chờ</span>
                      </button>
                    )}

                    <div className="flex gap-2 mt-2 pt-2 border-t border-gray-200 flex-wrap">
                      {item.itemStatus === 'pending' && (
                        <button
                          onClick={() => handleUpdateItem(item.id, 'preparing')}
                          className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1.5 rounded text-sm font-medium transition-colors border border-blue-200 cursor-pointer"
                        >
                          Nấu món này
                        </button>
                      )}
                      {(item.itemStatus === 'pending' || item.itemStatus === 'preparing') && (
                        <>
                          <button
                            onClick={() => handleUpdateItem(item.id, 'ready')}
                            className="flex-1 bg-green-500 text-white hover:bg-green-600 px-2 py-1.5 rounded text-sm font-medium transition-colors shadow-sm cursor-pointer"
                          >
                            Hoàn thành
                          </button>
                          <button
                            onClick={() => handleCancelItem(item.id, item.itemName)}
                            className="bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1.5 rounded text-sm font-medium transition-colors border border-red-200 cursor-pointer"
                            title="Hủy món / Hết món"
                          >
                            Hủy
                          </button>
                        </>
                      )}
                      {item.itemStatus === 'ready' && (
                        <span className="flex-1 text-center text-sm text-gray-400 py-1.5 line-through">
                          Đã chuyển lên
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
          {aggregatedItems.map((group, idx) => {
             let borderClass = 'border-t-primary-500';
             if (group.hasDanger) borderClass = 'border-t-red-500 shadow-[0_4px_12px_rgba(239,68,68,0.3)] ring-1 ring-red-200';
             else if (group.hasWarning) borderClass = 'border-t-orange-400 shadow-[0_4px_12px_rgba(249,115,22,0.2)] ring-1 ring-orange-200';

             const pendingCount = group.instances.reduce((acc, inst) => inst.item.itemStatus === 'pending' ? acc + inst.item.quantity : acc, 0);
             const preparingCount = group.instances.reduce((acc, inst) => inst.item.itemStatus === 'preparing' ? acc + inst.item.quantity : acc, 0);

             return (
               <div key={idx} className={`card bg-white shadow-md border-t-4 flex flex-col transition-all duration-300 ${borderClass}`}>
                 <div className="p-4">
                   <h3 className="font-bold text-xl text-gray-900 pb-1 flex justify-between items-start">
                     <span className="flex-1 pr-2">{group.itemName}</span>
                   </h3>
                   
                   {/* Detailed Portion Counts Breakdown */}
                   <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                     <span className="text-[11px] font-semibold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">Tổng: {group.totalQuantity} phần</span>
                     {pendingCount > 0 && <span className="text-[11px] font-semibold bg-yellow-50 text-yellow-800 border border-yellow-100 px-2.5 py-1 rounded-full">Chờ nấu: {pendingCount}</span>}
                     {preparingCount > 0 && <span className="text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-100 px-2.5 py-1 rounded-full">Đang nấu: {preparingCount}</span>}
                   </div>
                   
                   {/* Batch updates with exact counts */}
                   <div className="flex gap-2.5 mt-4 flex-wrap">
                    {pendingCount > 0 && (
                      <button 
                        onClick={() => handleUpdateGroup(group.instances, 'preparing')}
                        className="flex-1 bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors cursor-pointer text-center"
                      >
                        Nấu {pendingCount} phần
                      </button>
                    )}
                    {preparingCount > 0 && (
                      <button 
                        onClick={() => handleUpdateGroup(group.instances, 'ready')}
                        className="flex-1 bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors cursor-pointer text-center"
                      >
                        Xong {preparingCount} phần
                      </button>
                    )}
                    {pendingCount > 0 && preparingCount === 0 && (
                      <button 
                        onClick={() => handleUpdateGroup(group.instances, 'ready')}
                        className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors cursor-pointer text-center"
                      >
                        Xong tất cả
                      </button>
                    )}
                  </div>
                 </div>
               </div>
             );
          })}
        </div>
      )}
    </AdminLayout>
  );
};

export default KitchenPage;
