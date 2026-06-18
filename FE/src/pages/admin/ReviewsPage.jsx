import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import AdminLayout from '../../components/admin/AdminLayout';
import ImageWithFallback from '../../components/common/ImageWithFallback';
import customerApi from '../../services/customerService.js';
import menuItemApi from '../../services/menuItemService.js';
import toast from 'react-hot-toast';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { StarIcon as StarIconOutline, ChatBubbleLeftRightIcon, EyeIcon, EyeSlashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const formatMoney = (v) => Number(v || 0).toLocaleString('vi-VN') + 'đ';

const ReviewsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'menuItems'

  // Tab 1: Order Reviews state
  const [orderReviews, setOrderReviews] = useState([]);
  const [orderReviewsLoading, setOrderReviewsLoading] = useState(true);
  const [totalOrderReviews, setTotalOrderReviews] = useState(0);
  const [avgOrderRating, setAvgOrderRating] = useState(0);
  const [replyText, setReplyText] = useState({});
  const [replyingId, setReplyingId] = useState(null);
  const [orderStarFilter, setOrderStarFilter] = useState('all');

  // Tab 2: Menu Item Reviews state
  const [menuItems, setMenuItems] = useState([]);
  const [menuItemsLoading, setMenuItemsLoading] = useState(true);
  const [selectedMenuItem, setSelectedMenuItem] = useState(null);
  const [dishReviews, setDishReviews] = useState([]);
  const [dishReviewsLoading, setDishReviewsLoading] = useState(false);
  const [dishStarFilter, setDishStarFilter] = useState('all');
  const [menuItemSearch, setMenuItemSearch] = useState('');

  // Fetch all order reviews
  const fetchOrderReviews = useCallback(async () => {
    if (!user?.restaurantId) return;
    try {
      setOrderReviewsLoading(true);
      const res = await customerApi.getAllReviewsAdmin();
      const reviews = res.data?.reviews || [];
      setOrderReviews(reviews);
      setTotalOrderReviews(reviews.length);
      
      if (reviews.length > 0) {
        const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
        setAvgOrderRating(parseFloat((sum / reviews.length).toFixed(1)));
      } else {
        setAvgOrderRating(0);
      }
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải danh sách đánh giá đơn hàng');
    } finally {
      setOrderReviewsLoading(false);
    }
  }, [user?.restaurantId]);

  // Fetch all menu items
  const fetchMenuItems = useCallback(async () => {
    if (!user?.restaurantId) return;
    try {
      setMenuItemsLoading(true);
      const res = await menuItemApi.getAll({ restaurantId: user.restaurantId, limit: 100 });
      const items = res.data?.menuItems || res.data || [];
      setMenuItems(items);
      // Auto select first menu item if none selected
      if (items.length > 0 && !selectedMenuItem) {
        setSelectedMenuItem(items[0]);
      }
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải danh sách món ăn');
    } finally {
      setMenuItemsLoading(false);
    }
  }, [user?.restaurantId, selectedMenuItem]);

  // Fetch reviews for selected menu item
  const fetchDishReviews = useCallback(async (menuItemId, starFilter) => {
    if (!menuItemId) return;
    try {
      setDishReviewsLoading(true);
      const params = {};
      if (starFilter !== 'all') {
        params.rating = starFilter;
      }
      const res = await customerApi.getMenuItemReviews(menuItemId, params);
      setDishReviews(res.data?.reviews || []);
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải bình luận món ăn');
    } finally {
      setDishReviewsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrderReviews();
    } else {
      fetchMenuItems();
    }
  }, [activeTab, fetchOrderReviews, fetchMenuItems]);

  useEffect(() => {
    if (selectedMenuItem) {
      fetchDishReviews(selectedMenuItem.id, dishStarFilter);
    }
  }, [selectedMenuItem, dishStarFilter, fetchDishReviews]);

  // Toggle review publish status
  const handleTogglePublish = async (reviewId, currentStatus) => {
    try {
      await customerApi.updateReviewStatus(reviewId, { isPublished: !currentStatus });
      toast.success('Cập nhật trạng thái hiển thị thành công');
      fetchOrderReviews();
    } catch (err) {
      console.error(err);
      toast.error('Không thể cập nhật trạng thái hiển thị');
    }
  };

  // Submit response to menu item review
  const handleSendMenuItemResponse = async (reviewId) => {
    const text = replyText[reviewId];
    if (!text || !text.trim()) {
      toast.error('Vui lòng nhập nội dung phản hồi');
      return;
    }
    try {
      await customerApi.respondToMenuItemReview(reviewId, { response: text });
      toast.success('Gửi phản hồi thành công');
      setReplyingId(null);
      setReplyText(prev => ({ ...prev, [reviewId]: '' }));
      if (selectedMenuItem) {
        fetchDishReviews(selectedMenuItem.id, dishStarFilter);
      }
    } catch (err) {
      console.error(err);
      toast.error('Không thể gửi phản hồi');
    }
  };

  // Star drawing helper
  const renderStars = (rating) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          if (star <= rating) {
            return <StarIconSolid key={star} className="w-4 h-4 text-amber-500" />;
          } else {
            return <StarIconOutline key={star} className="w-4 h-4 text-gray-300" />;
          }
        })}
      </div>
    );
  };

  // Filtered order reviews based on star rating
  const filteredOrderReviews = orderReviews.filter(rev => {
    if (orderStarFilter === 'all') return true;
    return rev.rating === parseInt(orderStarFilter, 10);
  });

  // Filtered menu items based on search
  const filteredMenuItems = menuItems.filter(item => {
    return item.name.toLowerCase().includes(menuItemSearch.toLowerCase());
  });

  return (
    <AdminLayout title="Quản lý Đánh giá">
      {/* Tab Header Bar */}
      <div className="flex border-b border-gray-200 mb-6 bg-white rounded-2xl p-1.5 shadow-sm">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'orders'
              ? 'bg-gradient-to-r from-primary-700 to-primary-800 text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Đánh giá Đơn hàng
        </button>
        <button
          onClick={() => setActiveTab('menuItems')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'menuItems'
              ? 'bg-gradient-to-r from-primary-700 to-primary-800 text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Đánh giá Món ăn
        </button>
      </div>

      {activeTab === 'orders' ? (
        <div className="space-y-6">
          {/* Order reviews dashboard stats card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-6 bg-gradient-to-br from-white to-orange-50/20 border border-orange-100 flex flex-col justify-between">
              <div>
                <span className="text-xs font-black text-gray-400 uppercase tracking-wider block">Tổng lượt đánh giá</span>
                <span className="text-3xl font-black text-gray-900 mt-2 block">{totalOrderReviews} lượt</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-2">Tổng số lượt đánh giá dịch vụ và đơn hàng</p>
            </div>
            
            <div className="card p-6 bg-gradient-to-br from-white to-amber-50/20 border border-amber-100 flex flex-col justify-between">
              <div>
                <span className="text-xs font-black text-gray-400 uppercase tracking-wider block">Điểm hài lòng trung bình</span>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-3xl font-black text-gray-950">{avgOrderRating}</span>
                  <div className="flex flex-col">
                    {renderStars(Math.round(avgOrderRating))}
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Trải nghiệm dịch vụ</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-gray-500 mt-2">Điểm trung bình dựa trên đánh giá của thực khách</p>
            </div>

            <div className="card p-6 bg-gradient-to-br from-white to-green-50/20 border border-green-100 flex flex-col justify-between">
              <div>
                <span className="text-xs font-black text-gray-400 uppercase tracking-wider block">Bộ lọc đánh giá</span>
                <select
                  value={orderStarFilter}
                  onChange={(e) => setOrderStarFilter(e.target.value)}
                  className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs outline-none font-bold text-gray-700 bg-white focus:ring-1 focus:ring-primary-500"
                >
                  <option value="all">Tất cả số sao</option>
                  <option value="5">5 Sao ⭐⭐⭐⭐⭐</option>
                  <option value="4">4 Sao ⭐⭐⭐⭐</option>
                  <option value="3">3 Sao ⭐⭐⭐</option>
                  <option value="2">2 Sao ⭐⭐</option>
                  <option value="1">1 Sao ⭐</option>
                </select>
              </div>
              <p className="text-[11px] text-gray-500 mt-2">Lọc các ý kiến theo số sao cụ thể</p>
            </div>
          </div>

          {/* List of Order Reviews */}
          {orderReviewsLoading ? (
            <div className="flex items-center justify-center py-20 bg-white rounded-3xl border border-gray-100">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
            </div>
          ) : filteredOrderReviews.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-100">
              <p className="text-sm font-semibold text-gray-400">Không tìm thấy đánh giá đơn hàng nào phù hợp.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrderReviews.map((rev) => (
                <div key={rev.id} className="card p-5 bg-white border border-gray-100 hover:shadow-md transition-shadow relative">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary-50 text-primary-700 font-bold flex items-center justify-center">
                        {rev.customerName?.charAt(0).toUpperCase() || 'K'}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                          {rev.customerName || 'Khách hàng'}
                          {rev.customer?.phone && (
                            <span className="text-[10px] text-gray-400 font-medium">({rev.customer.phone})</span>
                          )}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          {renderStars(rev.rating)}
                          <span className="text-[10px] text-gray-400 font-semibold">
                            {new Date(rev.createdAt || rev.created_at).toLocaleDateString('vi-VN')} {new Date(rev.createdAt || rev.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {rev.orderId && (
                        <span className="text-[10px] font-bold px-2 py-1 rounded bg-gray-100 text-gray-600">
                          Đơn #{rev.orderId}
                        </span>
                      )}

                      {/* Display toggle */}
                      <button
                        onClick={() => handleTogglePublish(rev.id, rev.isPublished)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${
                          rev.isPublished 
                            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                            : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                        }`}
                      >
                        {rev.isPublished ? (
                          <>
                            <EyeIcon className="w-3.5 h-3.5" />
                            Đang hiển thị
                          </>
                        ) : (
                          <>
                            <EyeSlashIcon className="w-3.5 h-3.5" />
                            Đã ẩn
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="py-3">
                    <p className="text-xs text-gray-700 leading-relaxed font-medium">{rev.comment || 'Không có bình luận.'}</p>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Tab 2: Menu Item reviews */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Panel: Menu Items List */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl border border-gray-100 p-4 shadow-sm">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm kiếm món ăn..."
                  value={menuItemSearch}
                  onChange={(e) => setMenuItemSearch(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 pl-10 pr-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-primary-500"
                />
                <MagnifyingGlassIcon className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">Danh sách món ăn</h3>
              </div>

              {menuItemsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : filteredMenuItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400 italic">Không tìm thấy món ăn nào.</div>
              ) : (
                <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  {filteredMenuItems.map((item) => {
                    const isSelected = selectedMenuItem?.id === item.id;
                    const rating = item.rating || { avgRating: 0.0, reviewCount: 0 };
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setSelectedMenuItem(item);
                          setDishStarFilter('all');
                        }}
                        className={`w-full text-left p-4 transition-all flex items-center gap-3 ${
                          isSelected ? 'bg-orange-50/50 border-r-4 border-primary-600' : 'hover:bg-gray-50/50'
                        }`}
                      >
                        <div className="h-10 w-10 rounded-lg overflow-hidden shrink-0 border border-gray-100">
                          <ImageWithFallback
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            fallbackText="Ảnh"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-gray-900 truncate leading-snug">{item.name}</h4>
                          <span className="text-[10px] text-gray-400 mt-0.5 block">{item.category?.name || 'Món ăn'}</span>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end">
                          {rating.reviewCount > 0 ? (
                            <>
                              <span className="flex items-center gap-0.5 text-xs text-amber-500 font-bold">
                                <StarIconSolid className="w-3.5 h-3.5 fill-current" />
                                {rating.avgRating}
                              </span>
                              <span className="text-[9px] text-gray-400 font-semibold">{rating.reviewCount} đánh giá</span>
                            </>
                          ) : (
                            <span className="text-[9px] text-gray-400 italic">Chưa đánh giá</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Selected Item Reviews list */}
          <div className="lg:col-span-7">
            {selectedMenuItem ? (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
                
                {/* Header dish info card */}
                <div className="flex items-start gap-4 pb-4 border-b border-gray-50">
                  <div className="h-16 w-16 rounded-xl overflow-hidden shrink-0 border border-gray-100">
                    <ImageWithFallback
                      src={selectedMenuItem.imageUrl}
                      alt={selectedMenuItem.name}
                      className="w-full h-full object-cover"
                      fallbackText="Ảnh"
                    />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-gray-900">{selectedMenuItem.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{selectedMenuItem.category?.name || 'Danh mục món ăn'}</p>
                    
                    <div className="flex items-center gap-2 mt-1.5">
                      {selectedMenuItem.rating?.reviewCount > 0 ? (
                        <>
                          {renderStars(Math.round(selectedMenuItem.rating.avgRating))}
                          <span className="text-xs text-amber-600 font-bold">{selectedMenuItem.rating.avgRating} / 5</span>
                          <span className="text-xs text-gray-400 font-semibold">({selectedMenuItem.rating.reviewCount} bình luận)</span>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Chưa có bình luận đánh giá cho món này.</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rating filter bar for dish comments */}
                {selectedMenuItem.rating?.reviewCount > 0 && (
                  <div className="flex flex-wrap gap-1.5 pb-2">
                    {[
                      { val: 'all', label: 'Tất cả' },
                      { val: '5', label: '5 ★' },
                      { val: '4', label: '4 ★' },
                      { val: '3', label: '3 ★' },
                      { val: '2', label: '2 ★' },
                      { val: '1', label: '1 ★' }
                    ].map((f) => (
                      <button
                        key={f.val}
                        onClick={() => setDishStarFilter(f.val)}
                        className={`px-3 py-1 rounded-xl text-[10px] font-bold transition-all border ${
                          dishStarFilter === f.val
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Comments List */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider">Ý kiến bình luận từ khách hàng</h4>

                  {dishReviewsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                  ) : dishReviews.length === 0 ? (
                    <div className="text-center py-10 bg-gray-50/50 rounded-2xl border border-dashed border-gray-100">
                      <p className="text-xs text-gray-400 italic font-semibold">Không có bình luận nào phù hợp với bộ lọc.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1.5 custom-scrollbar">
                      {dishReviews.map((rev) => (
                        <div key={rev.id} className="bg-gray-50/50 border border-gray-100 rounded-2xl p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="text-xs font-bold text-gray-800">
                                {rev.customer?.fullName || 'Khách vãng lai'}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                {renderStars(rev.rating)}
                                <span className="text-[9px] text-gray-400">
                                  {new Date(rev.createdAt || rev.created_at).toLocaleDateString('vi-VN')}
                                </span>
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 font-medium leading-relaxed mb-2">
                            {rev.comment || 'Khách hàng không để lại bình luận.'}
                          </p>

                          {/* Reply Section for Dish Reviews */}
                          {rev.response ? (
                            <div className="bg-white border border-gray-100 rounded-xl p-3 mt-2 shadow-sm">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[9px] font-bold text-primary-700 uppercase tracking-wider">Phản hồi của nhà hàng:</span>
                                <span className="text-[8px] text-gray-400">
                                  {rev.respondedAt ? new Date(rev.respondedAt).toLocaleDateString('vi-VN') : ''}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 italic font-medium">"{rev.response}"</p>
                            </div>
                          ) : (
                            <div className="mt-2">
                              {replyingId === rev.id ? (
                                <div className="flex flex-col gap-2 mt-1">
                                  <textarea
                                    rows={2}
                                    placeholder="Nhập nội dung phản hồi món ăn..."
                                    value={replyText[rev.id] || ''}
                                    onChange={(e) => setReplyText(prev => ({ ...prev, [rev.id]: e.target.value }))}
                                    className="w-full rounded-xl border border-gray-200 p-2 text-xs outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                                  />
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => setReplyingId(null)}
                                      className="px-2.5 py-1 rounded-lg text-[9px] font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                                    >
                                      Hủy
                                    </button>
                                    <button
                                      onClick={() => handleSendMenuItemResponse(rev.id)}
                                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-bold shadow-sm transition-colors"
                                    >
                                      Gửi phản hồi
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setReplyingId(rev.id)}
                                  className="flex items-center gap-1 text-[9px] text-indigo-600 hover:text-indigo-800 font-bold transition-all"
                                >
                                  <ChatBubbleLeftRightIcon className="w-3.5 h-3.5" />
                                  Gửi phản hồi
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center">
                <p className="text-sm text-gray-400 font-semibold">Vui lòng chọn món ăn ở danh sách bên trái để xem đánh giá chi tiết.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default ReviewsPage;
