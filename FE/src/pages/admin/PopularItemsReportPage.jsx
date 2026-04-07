import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { 
  CalendarIcon, 
  FireIcon,
  TagIcon,
  StarIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import httpClient from '../../services/httpClient';
import categoryService from '../../services/categoryService.js';
import AdminLayout from '../../components/admin/AdminLayout';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#06b6d4'];

const PopularItemsReportPage = () => {
  const [dateRange, setDateRange] = useState({
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [categoryId, setCategoryId] = useState('');
  const [limit, setLimit] = useState(10);

  // Fetch categories for filter
  const { data: categoriesData } = useQuery({
    queryKey: ['categories', { limit: 100 }],
    queryFn: () => categoryService.getAll({ limit: 100 })
  });
  const categories = categoriesData?.data?.categories || [];

  // Fetch popular items
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['popularItems', dateRange, categoryId, limit],
    queryFn: () => httpClient.get('/reports/popular-items', { 
      params: { ...dateRange, category_id: categoryId, limit } 
    }),
    enabled: !!dateRange.from && !!dateRange.to
  });

  const items = useMemo(() => reportData?.data || [], [reportData]);

  const chartData = useMemo(() => {
    return items.map(item => ({
      name: item.menuItem.name,
      quantity: item.totalQuantity,
      revenue: item.totalRevenue
    }));
  }, [items]);

  const topItem = items[0];

  if (isLoading) {
    return (
      <AdminLayout title="Món ăn bán chạy">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Món ăn bán chạy">
      <div className="space-y-6">
        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5 text-gray-400" />
              <input 
                type="date" 
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
              <span className="text-gray-500">đến</span>
              <input 
                type="date" 
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
            </div>
            
            <div className="flex items-center space-x-2 border-l pl-4">
              <TagIcon className="h-5 w-5 text-gray-400" />
              <select 
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="">Tất cả danh mục</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2 border-l pl-4">
              <span className="text-sm text-gray-500">Hiển thị:</span>
              <select 
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
                <option value={20}>Top 20</option>
                <option value={50}>Top 50</option>
              </select>
            </div>
          </div>

          <div className="flex space-x-2">
            <button 
              onClick={() => {
                const today = new Date();
                setDateRange({ from: format(subDays(today, 30), 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') });
              }}
              className="px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 rounded-md hover:bg-primary-100"
            >
              30 ngày qua
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <FireIcon className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Bán chạy nhất</p>
              <p className="text-lg font-bold text-gray-900 truncate max-w-[200px]">
                {topItem?.menuItem?.name || 'N/A'}
              </p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <ShoppingBagIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Tổng lượng bán (Top {limit})</p>
              <p className="text-lg font-bold text-gray-900">
                {items.reduce((sum, i) => sum + i.totalQuantity, 0).toLocaleString()} món
              </p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Tổng doanh thu (Top {limit})</p>
              <p className="text-lg font-bold text-gray-900">
                {items.reduce((sum, i) => sum + i.totalRevenue, 0).toLocaleString()} đ
              </p>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quantity Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Số lượng bán ra</h3>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" fontSize={12} />
                  <YAxis dataKey="name" type="category" width={100} fontSize={10} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="quantity" name="Số lượng" fill="#0ea5e9" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue Distribution (Pie) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Tỷ trọng doanh thu</h3>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.slice(0, 7)}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="revenue"
                    nameKey="name"
                  >
                    {chartData.slice(0, 7).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => value.toLocaleString() + ' đ'} />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Chi tiết xếp hạng</h3>
            <button className="flex items-center text-sm text-primary-600 font-medium hover:text-primary-700">
              <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
              Xuất Excel
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900 uppercase tracking-wider">Hạng</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900 uppercase tracking-wider">Món ăn</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900 uppercase tracking-wider">Danh mục</th>
                  <th className="px-6 py-3 text-right font-semibold text-gray-900 uppercase tracking-wider">Giá hiện tại</th>
                  <th className="px-6 py-3 text-right font-semibold text-gray-900 uppercase tracking-wider">Số lần đặt</th>
                  <th className="px-6 py-3 text-right font-semibold text-gray-900 uppercase tracking-wider">Số lượng bán</th>
                  <th className="px-6 py-3 text-right font-semibold text-gray-900 uppercase tracking-wider">Tổng doanh thu</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-900 uppercase tracking-wider">Đánh giá TB</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item, index) => (
                  <tr key={item.menuItemId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full font-bold
                        ${index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                          index === 1 ? 'bg-gray-100 text-gray-700' : 
                          index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-transparent text-gray-500'}`}
                      >
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {item.menuItem.imageUrl && (
                          <img src={item.menuItem.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover mr-3" />
                        )}
                        <div className="font-medium text-gray-900">{item.menuItem.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {item.menuItem.category?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {item.menuItem.price.toLocaleString()} đ
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {item.orderCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-primary-600">
                      {item.totalQuantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-900">
                      {item.totalRevenue.toLocaleString()} đ
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <StarIcon className={`h-4 w-4 ${Number(item.rating.avgRating) > 0 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                        <span className="font-medium">{item.rating.avgRating}</span>
                        <span className="text-xs text-gray-400">({item.rating.reviewCount})</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PopularItemsReportPage;
