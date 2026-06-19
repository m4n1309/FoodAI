import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './state/AuthContext';
import { SocketProvider } from './state/SocketContext.jsx';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import LoginPage from './pages/admin/LoginPage.jsx';
import ForgotPasswordPage from './pages/admin/ForgotPasswordPage.jsx';
import DashboardPage from './pages/admin/DashboardPage.jsx';
import CategoriesPage from './pages/admin/CategoriesPage.jsx';
import MenuItemsPage from './pages/admin/MenuItemsPage.jsx';
import TablesPage from './pages/admin/TablesPage.jsx';
import OrdersPage from './pages/admin/OrdersPage.jsx';
import KitchenPage from './pages/admin/KitchenPage.jsx';
import PromotionsPage from './pages/admin/PromotionsPage.jsx';
import RevenueReportPage from './pages/admin/RevenueReportPage.jsx';
import PopularItemsReportPage from './pages/admin/PopularItemsReportPage.jsx';
import CombosPage from './pages/admin/CombosPage';
import CustomerMenuPage from './pages/customer/CustomerMenuPage';
import CustomerHomePage from './pages/customer/CustomerHomePage';
import StaffsPage from './pages/admin/StaffsPage.jsx';
import ReviewsPage from './pages/admin/ReviewsPage.jsx';
import { toastOptions } from './config/toastConfig.js';

function ScanRedirectPage() {
  const location = useLocation();
  const qrCode = new URLSearchParams(location.search).get('qr');

  if (!qrCode) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Navigate to={`/customer/${encodeURIComponent(qrCode)}`} replace />;
}

import { useAuth } from './hooks/useAuth.js';

function AdminIndexRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role === 'kitchen') return <Navigate to="/admin/kitchen" replace />;
  if (user.role === 'waiter') return <Navigate to="/admin/orders" replace />;
  return <Navigate to="/admin/dashboard" replace />;
}

import { useEffect } from 'react';
import { useSocket } from './hooks/useSocket.js';
import toast from 'react-hot-toast';
import { playNotificationSound } from './utils/sound.js';

function GlobalSocketListener() {
  const socket = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    if (user && ['admin', 'waiter', 'kitchen'].includes(user.role)) {
      toast('Nhấp vào màn hình bất kỳ lúc nào để kích hoạt âm thanh thông báo!', {
        icon: '🔊',
        duration: 8000
      });
    }
  }, [user]);

  useEffect(() => {
    if (!socket) return;
    
    // Nghe sự kiện từ Server
    const handleOrderPlaced = (data) => {
      if (!user || !['admin', 'waiter'].includes(user.role)) return;
      playNotificationSound();
      const tableText = data.tableNumber || 'mang về';
      toast('Bàn ' + tableText + ' có đơn hàng mới', { icon: '🔔' });
    };

    const handleOrderConfirmed = (data) => {
      if (!user || !['admin', 'kitchen'].includes(user.role)) return;
      playNotificationSound();
      const tableText = data.tableNumber || 'mang về';
      toast(`Bàn ${tableText} đã xác nhận đơn`, { icon: '🔥' });
    };

    const handleItemReady = (data) => {
      if (!user || !['admin', 'waiter'].includes(user.role)) return;
      playNotificationSound();
      const tableText = data.tableNumber || 'mang về';
      toast.success(`Bàn ${tableText} món ${data.itemName} đã xong`, { icon: '🏃' });
    };

    const handleWaiterCall = (data) => {
      if (!user || !['admin', 'waiter'].includes(user.role)) return;
      playNotificationSound();
      toast(`Bàn ${data.tableNumber} gọi phục vụ`, { 
        icon: '🔔',
        duration: 8000,
        style: {
          border: '2px solid #ef4444',
          padding: '16px',
          color: '#7f1d1d',
          fontWeight: 'bold',
          background: '#fee2e2'
        }
      });
    };

    const handleOrderUpdated = (data) => {
      if (data.reason === 'item_added') {
        if (!user) return;
        const isWaiter = ['admin', 'waiter'].includes(user.role);
        const isKitchen = ['admin', 'kitchen'].includes(user.role);
        if (!isWaiter && !isKitchen) return;

        playNotificationSound();
        const tableText = data.tableNumber || 'mang về';
        if (isWaiter) {
          toast(`Bàn ${tableText} gọi thêm món: ${data.itemName || 'món mới'}`, {
            icon: '📝',
            duration: 6000,
            style: {
              border: '2px solid #3b82f6',
              padding: '16px',
              color: '#1e3a8a',
              fontWeight: 'bold',
              background: '#dbeafe'
            }
          });
        } else if (isKitchen) {
          toast(`Bàn ${tableText} thêm món mới: ${data.itemName || 'món mới'}`, {
            icon: '🔥',
            duration: 6000,
            style: {
              border: '2px solid #f97316',
              padding: '16px',
              color: '#7c2d12',
              fontWeight: 'bold',
              background: '#ffedd5'
            }
          });
        }
      }
    };

    const handlePaymentRequested = (data) => {
      if (!user || !['admin', 'waiter'].includes(user.role)) return;
      playNotificationSound();
      const tableText = data.tableNumber || 'N/A';
      toast(`Bàn ${tableText} yêu cầu thanh toán`, {
        icon: '💰',
        duration: 8000,
        style: {
          border: '2px solid #10b981',
          padding: '16px',
          color: '#064e3b',
          fontWeight: 'bold',
          background: '#d1fae5'
        }
      });
    };

    const handleOrderPaymentUpdated = (data) => {
      if (data.paymentStatus === 'paid') {
        if (!user || !['admin', 'waiter'].includes(user.role)) return;
        playNotificationSound();
        const tableText = data.tableNumber || 'mang về';
        toast.success(`Bàn ${tableText} đã thanh toán`, {
          icon: '💰',
          duration: 8000
        });
      }
    };

    socket.on('order_placed', handleOrderPlaced);
    socket.on('order_confirmed', handleOrderConfirmed);
    socket.on('item_ready', handleItemReady);
    socket.on('waiter_call', handleWaiterCall);
    socket.on('order_updated', handleOrderUpdated);
    socket.on('payment_requested', handlePaymentRequested);
    socket.on('order_payment_updated', handleOrderPaymentUpdated);

    return () => {
      socket.off('order_placed', handleOrderPlaced);
      socket.off('order_confirmed', handleOrderConfirmed);
      socket.off('item_ready', handleItemReady);
      socket.off('waiter_call', handleWaiterCall);
      socket.off('order_updated', handleOrderUpdated);
      socket.off('payment_requested', handlePaymentRequested);
      socket.off('order_payment_updated', handleOrderPaymentUpdated);
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
            <Route path="/admin/forgot-password" element={<ForgotPasswordPage />} />

            <Route path="/customer/menu/:qrCode" element={<CustomerMenuPage />} />
            <Route path="/customer/menu" element={<CustomerMenuPage />} />
            <Route path="/menu/:qrCode" element={<CustomerMenuPage />} />
            <Route path="/customer/:qrCode" element={<CustomerHomePage />} />
            <Route path="/scan" element={<ScanRedirectPage />} />

            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin', 'waiter']}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/categories"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <CategoriesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/menu-items"
              element={
                <ProtectedRoute allowedRoles={['admin', 'waiter']}>
                  <MenuItemsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/tables"
              element={
                <ProtectedRoute allowedRoles={['admin', 'waiter']}>
                  <TablesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/staffs"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <StaffsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/orders"
              element={
                <ProtectedRoute allowedRoles={['admin', 'waiter']}>
                  <OrdersPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/kitchen"
              element={
                <ProtectedRoute allowedRoles={['admin', 'kitchen']}>
                  <KitchenPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/promotions"
              element={
                <ProtectedRoute allowedRoles={['admin', 'waiter']}>
                  <PromotionsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/combos"
              element={
                <ProtectedRoute allowedRoles={['admin', 'waiter']}>
                  <CombosPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/reviews"
              element={
                <ProtectedRoute allowedRoles={['admin', 'waiter']}>
                  <ReviewsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <RevenueReportPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/reports/popular"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
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