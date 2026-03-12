import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  ShoppingBagIcon,
  TableCellsIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';

const DashboardPage = () => {
  const { user } = useAuth();

  // Mock data - sẽ thay bằng API call sau
  const stats = [
    {
      name: 'Tổng doanh thu',
      value: '45,678,000 đ',
      change: '+12.5%',
      trend: 'up',
      icon: CurrencyDollarIcon,
      color: 'bg-green-500',
    },
    {
      name: 'Đơn hàng hôm nay',
      value: '42',
      change: '+8.2%',
      trend: 'up',
      icon: ShoppingCartIcon,
      color: 'bg-blue-500',
    },
    {
      name: 'Món ăn',
      value: '156',
      change: '+2',
      trend: 'up',
      icon: ShoppingBagIcon,
      color: 'bg-purple-500',
    },
    {
      name: 'Bàn đang sử dụng',
      value: '8/20',
      change: '-3',
      trend: 'down',
      icon: TableCellsIcon,
      color: 'bg-orange-500',
    },
  ];

  const recentOrders = [
    {
      id: 1,
      orderNumber: 'ORD20260311-0001',
      table: 'Bàn 5',
      items: 3,
      total: 450000,
      status: 'preparing',
      time: '10 phút trước',
    },
    {
      id: 2,
      orderNumber: 'ORD20260311-0002',
      table: 'Bàn 12',
      items: 5,
      total: 780000,
      status: 'ready',
      time: '15 phút trước',
    },
    {
      id: 3,
      orderNumber: 'ORD20260311-0003',
      table: 'Bàn 3',
      items: 2,
      total: 320000,
      status: 'confirmed',
      time: '20 phút trước',
    },
  ];

  const getStatusBadge = (status) => {
    const badges = {
      preparing: 'bg-yellow-100 text-yellow-800',
      ready: 'bg-green-100 text-green-800',
      confirmed: 'bg-blue-100 text-blue-800',
      completed: 'bg-gray-100 text-gray-800',
    };
    const labels = {
      preparing: 'Đang chuẩn bị',
      ready: 'Sẵn sàng',
      confirmed: 'Đã xác nhận',
      completed: 'Hoàn thành',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <AdminLayout title="Dashboard">
      {/* Welcome section */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Chào mừng, {user?.fullName || 'Admin'}! 👋
        </h2>
        <p className="text-gray-600 mt-1">
          Đây là tổng quan hoạt động của nhà hàng hôm nay
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {stats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">
                  {stat.name}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {stat.value}
                </p>
                <div className="flex items-center mt-2">
                  {stat.trend === 'up' ? (
                    <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowTrendingDownIcon className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {stat.change}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">vs hôm qua</span>
                </div>
              </div>
              <div className={`h-12 w-12 rounded-lg ${stat.color} flex items-center justify-center`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent orders */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Đơn hàng gần đây
            </h3>
            <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              Xem tất cả
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Mã đơn
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Bàn
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Món
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tổng tiền
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Thời gian
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {order.orderNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {order.table}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {order.items} món
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {order.total.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {order.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick actions */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Thao tác nhanh
          </h3>
          <div className="space-y-3">
            <button className="w-full btn-primary justify-center">
              + Tạo đơn hàng mới
            </button>
            <button className="w-full btn-secondary justify-center">
              + Thêm món ăn
            </button>
            <button className="w-full btn-secondary justify-center">
              + Thêm bàn mới
            </button>
            <button className="w-full btn-secondary justify-center">
              📊 Xem báo cáo
            </button>
          </div>

          {/* Restaurant info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              Thông tin nhà hàng
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Tên:</span>
                <span className="font-medium text-gray-900">
                  {user?.restaurant?.name || 'Nhà Hàng Hương Việt'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tổng bàn:</span>
                <span className="font-medium text-gray-900">20</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tổng món:</span>
                <span className="font-medium text-gray-900">156</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Nhân viên:</span>
                <span className="font-medium text-gray-900">12</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default DashboardPage;