import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  RectangleStackIcon,
  ShoppingBagIcon,
  TableCellsIcon,
  ShoppingCartIcon,
  FireIcon,
  ChartBarIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  TicketIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../hooks/useAuth.js';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/admin/dashboard',
      icon: HomeIcon,
      roles: ['admin', 'manager'],
    },
    {
      name: 'Danh mục',
      href: '/admin/categories',
      icon: RectangleStackIcon,
      roles: ['admin', 'manager'],
    },
    {
      name: 'Món ăn',
      href: '/admin/menu-items',
      icon: ShoppingBagIcon,
      roles: ['admin', 'manager'],
    },
    {
      name: 'Bàn ăn',
      href: '/admin/tables',
      icon: TableCellsIcon,
      roles: ['admin', 'manager'],
    },
    {
      name: 'Đơn hàng',
      href: '/admin/orders',
      icon: ShoppingCartIcon,
      roles: ['admin', 'manager', 'waiter'],
    },
    {
      name: 'Bếp KDS',
      href: '/admin/kitchen',
      icon: FireIcon,
      roles: ['admin', 'manager', 'kitchen'],
    },
    {
      name: 'Báo cáo',
      href: '/admin/reports',
      icon: ChartBarIcon,
      roles: ['admin', 'manager'],
    },
    {
      name: 'Khuyến mãi',
      href: '/admin/promotions',
      icon: TicketIcon,
      roles: ['admin', 'manager'],
    },
    {
      name: 'Cài đặt',
      href: '/admin/settings',
      icon: CogIcon,
      roles: ['admin'],
    },
  ];

  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(user?.role)
  );

  const handleLogout = async () => {
    await logout();
    window.location.href = '/admin/login';
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar - ✅ FIXED với height full và overflow auto */}
      <div
        className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-gray-900 
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 
          flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo - Fixed top */}
        <div className="flex-shrink-0 flex items-center justify-center h-16 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <span className="text-white font-bold text-lg">Admin</span>
          </div>
        </div>

        {/* User info - Fixed */}
        <div className="flex-shrink-0 p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-primary-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {user?.fullName?.charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.fullName || 'Admin'}
              </p>
              <p className="text-xs text-gray-400 truncate capitalize">
                {user?.role || 'Administrator'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation - ✅ SCROLLABLE */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredNavigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* Logout button - Fixed bottom */}
        <div className="flex-shrink-0 p-3 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
          >
            <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 flex-shrink-0" />
            Đăng xuất
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;