import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useQuery } from '@tanstack/react-query';
import { 
  Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, ComposedChart 
} from 'recharts';
import { 
  CalendarIcon, 
  BanknotesIcon, 
  ShoppingCartIcon, 
  ChartBarIcon, 
  ArrowTrendingUpIcon,
  FunnelIcon,
  CreditCardIcon,
  WalletIcon
} from '@heroicons/react/24/outline';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import httpClient from '../../services/httpClient';
import AdminLayout from '../../components/admin/AdminLayout';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
const PAYMENT_METHODS = {
  cash: { label: 'Tiền mặt', icon: BanknotesIcon, color: '#10b981' },
  bank_transfer: { label: 'Chuyển khoản', icon: ArrowTrendingUpIcon, color: '#0ea5e9' },
  card: { label: 'Thẻ ATM/Visa', icon: CreditCardIcon, color: '#8b5cf6' },
  e_wallet: { label: 'Ví điện tử', icon: WalletIcon, color: '#f59e0b' },
};

const StatCard = ({ title, value, icon: Icon, color, suffix = '' }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="mt-2 text-2xl font-bold text-gray-900">
          {typeof value === 'number' ? value.toLocaleString() : value}
          <span className="text-sm ml-1 font-normal text-gray-500">{suffix}</span>
        </p>
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
    </div>
  </div>
);

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  icon: PropTypes.elementType.isRequired,
  color: PropTypes.string.isRequired,
  suffix: PropTypes.string
};

const RevenueReportPage = () => {
  const [dateRange, setDateRange] = useState({
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [groupBy, setGroupBy] = useState('day');

  const { data, isLoading } = useQuery({
    queryKey: ['revenueReport', dateRange, groupBy],
    queryFn: () => httpClient.get('/reports/revenue', { params: { ...dateRange, group_by: groupBy } }),
    enabled: !!dateRange.from && !!dateRange.to
  });

  const reportData = data?.data || {};
  const { summary = {}, paymentBreakdown = [], chartData = [] } = reportData;

  const pieData = useMemo(() => {
    return paymentBreakdown.map(p => ({
      name: PAYMENT_METHODS[p.paymentMethod]?.label || p.paymentMethod,
      value: p.revenue
    }));
  }, [paymentBreakdown]);

  const maxRevenue = useMemo(() => {
    if (!chartData || chartData.length === 0) return 0;
    return Math.max(0, ...chartData.map(d => d.totalRevenue || 0));
  }, [chartData]);

  if (isLoading) {
    return (
      <AdminLayout title="Báo cáo doanh thu">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Báo cáo doanh thu">
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
              <ChartBarIcon className="h-5 w-5 text-gray-400" />
              <select 
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="day">Theo ngày</option>
                <option value="week">Theo tuần</option>
                <option value="month">Theo tháng</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button 
              onClick={() => {
                const today = new Date();
                setDateRange({ from: format(subDays(today, 7), 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') });
                setGroupBy('day');
              }}
              className="px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 rounded-md hover:bg-primary-100"
            >
              7 ngày qua
            </button>
            <button 
              onClick={() => {
                const today = new Date();
                setDateRange({ from: format(startOfMonth(today), 'yyyy-MM-dd'), to: format(endOfMonth(today), 'yyyy-MM-dd') });
                setGroupBy('day');
              }}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 rounded-md hover:bg-gray-100"
            >
              Tháng này
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Tổng doanh thu" value={summary.totalRevenue} icon={BanknotesIcon} color="bg-green-500" suffix="đ" />
          <StatCard title="Tổng đơn hàng" value={summary.totalOrders} icon={ShoppingCartIcon} color="bg-blue-500" />
          <StatCard title="Giá trị TB đơn" value={Math.round(summary.averageOrderValue)} icon={ArrowTrendingUpIcon} color="bg-purple-500" suffix="đ" />
          <StatCard title="Tổng giảm giá" value={summary.totalDiscount} icon={FunnelIcon} color="bg-orange-500" suffix="đ" />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Biểu đồ doanh thu & đơn hàng</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="time_bucket" fontSize={12} tickMargin={10} />
                  <YAxis yAxisId="left" orientation="left" stroke="#10b981" fontSize={12} />
                  <YAxis yAxisId="right" orientation="right" stroke="#0ea5e9" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value, name) => [value.toLocaleString(), name === 'totalRevenue' ? 'Doanh thu (đ)' : 'Số đơn']}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="totalRevenue" name="Doanh thu" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="totalOrders" name="Số đơn" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Payment Method Pie Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Cơ cấu phương thức thanh toán</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
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
            <h3 className="text-lg font-semibold text-gray-900">Chi tiết theo {groupBy === 'day' ? 'ngày' : groupBy === 'week' ? 'tuần' : 'tháng'}</h3>
            <div className="flex items-center text-sm text-gray-500">
              <span className="inline-block w-3 h-3 bg-green-100 border border-green-500 rounded-sm mr-2"></span>
              Đạt doanh thu cao nhất trong kỳ
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900 uppercase tracking-wider">Thời gian</th>
                  <th className="px-6 py-3 text-right font-semibold text-gray-900 uppercase tracking-wider">Tổng đơn</th>
                  <th className="px-6 py-3 text-right font-semibold text-gray-900 uppercase tracking-wider">Doanh thu (đ)</th>
                  <th className="px-6 py-3 text-right font-semibold text-gray-900 uppercase tracking-wider">Đơn lớn nhất (đ)</th>
                  <th className="px-6 py-3 text-right font-semibold text-gray-900 uppercase tracking-wider">Doanh thu TB (đ)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {chartData.map((item, index) => (
                  <tr 
                    key={index} 
                    className={`hover:bg-gray-50 transition-colors ${item.totalRevenue === maxRevenue ? 'bg-green-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{item.time_bucket}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">{item.totalOrders}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-semibold">{item.totalRevenue.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">{item.maxOrderValue.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {item.totalOrders > 0 ? Math.round(item.totalRevenue / item.totalOrders).toLocaleString() : 0}
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

export default RevenueReportPage;
