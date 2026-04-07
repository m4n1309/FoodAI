import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './state/AuthContext';
import { SocketProvider } from './state/SocketContext.jsx';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import LoginPage from './pages/admin/LoginPage.jsx';
import DashboardPage from './pages/admin/DashboardPage.jsx';
import CategoriesPage from './pages/admin/CategoriesPage.jsx';
import MenuItemsPage from './pages/admin/MenuItemsPage.jsx';
import TablesPage from './pages/admin/TablesPage.jsx';
import OrdersPage from './pages/admin/OrdersPage.jsx';
import KitchenPage from './pages/admin/KitchenPage.jsx';
import PromotionsPage from './pages/admin/PromotionsPage.jsx';
import RevenueReportPage from './pages/admin/RevenueReportPage.jsx';
import PopularItemsReportPage from './pages/admin/PopularItemsReportPage.jsx';
import CustomerMenuPage from './pages/customer/CustomerMenuPage';
import { toastOptions } from './config/toastConfig.js';

function ScanRedirectPage() {
  const location = useLocation();
  const qrCode = new URLSearchParams(location.search).get('qr');

  if (!qrCode) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Navigate to={`/customer/menu/${encodeURIComponent(qrCode)}`} replace />;
}

import { useAuth } from './hooks/useAuth.js';

function AdminIndexRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role === 'kitchen') return <Navigate to="/admin/kitchen" replace />;
  if (['waiter', 'cashier'].includes(user.role)) return <Navigate to="/admin/orders" replace />;
  return <Navigate to="/admin/dashboard" replace />;
}

import { useEffect } from 'react';
import { useSocket } from './hooks/useSocket.js';
import toast from 'react-hot-toast';

function GlobalSocketListener() {
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;
    
    // Nghe sự kiện từ Server
    const handleOrderPlaced = (data) => {
      toast('Đơn hàng mới: #' + data.orderNumber, { icon: '🔔' });
    };

    const handleNewOrder = (data) => {
      toast('Bếp nhận đơn mới: #' + data.orderNumber, { icon: '🔥' });
    };

    const handleItemReady = (data) => {
      toast.success(`Món ${data.itemName} ĐÃ XONG! Mời phục vụ!`, { icon: '🏃' });
    };

    const handleItemStatusChanged = (data) => {
      if (data.status === 'ready') {
        toast.success(`Món ${data.itemName} đã sẵn sàng!`);
      }
    };

    socket.on('order_placed', handleOrderPlaced);
    socket.on('new_order', handleNewOrder);
    socket.on('item_ready', handleItemReady);
    socket.on('item_status_changed', handleItemStatusChanged);

    return () => {
      socket.off('order_placed', handleOrderPlaced);
      socket.off('new_order', handleNewOrder);
      socket.off('item_ready', handleItemReady);
      socket.off('item_status_changed', handleItemStatusChanged);
    };
  }, [socket]);

  return null;
}

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <GlobalSocketListener />
          <Routes>
            <Route path="/admin/login" element={<LoginPage />} />

            <Route path="/customer/menu/:qrCode" element={<CustomerMenuPage />} />
            <Route path="/customer/menu" element={<CustomerMenuPage />} />
            <Route path="/menu/:qrCode" element={<CustomerMenuPage />} />
            <Route path="/customer/:qrCode" element={<CustomerMenuPage />} />
            <Route path="/scan" element={<ScanRedirectPage />} />

            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/categories"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <CategoriesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/menu-items"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <MenuItemsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/tables"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <TablesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/orders"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'waiter']}>
                  <OrdersPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/kitchen"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'kitchen']}>
                  <KitchenPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/promotions"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <PromotionsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <RevenueReportPage />
                </ProtectedRoute>
              }
            />

            <Route
            path="/admin/reports/popular"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <PopularItemsReportPage />
              </ProtectedRoute>
            }
          />

          <Route path="/admin" element={<AdminIndexRedirect />} />
            <Route path="/" element={<Navigate to="/admin/login" replace />} />
            <Route path="*" element={<Navigate to="/admin/login" replace />} />
          </Routes>

          <Toaster
            position="top-right"
            toastOptions={toastOptions}
          />
        </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;