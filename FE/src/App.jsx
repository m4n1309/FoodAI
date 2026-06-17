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
import { playNotificationSound, speakNotification } from './utils/sound.js';

function GlobalSocketListener() {
  const socket = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    if (!socket) return;
    
    // Nghe sự kiện từ Server
    const handleOrderPlaced = (data) => {
      if (!user || !['admin', 'waiter'].includes(user.role)) return;
      playNotificationSound();
      const tableText = data.tableNumber ? `bàn ${data.tableNumber}` : 'mang về';
      speakNotification(`Bạn có đơn hàng mới từ ${tableText}.`);
      toast('Đơn hàng mới: #' + data.orderNumber, { icon: '🔔' });
    };

    const handleNewOrder = (data) => {
      if (!user || !['admin', 'kitchen'].includes(user.role)) return;
      playNotificationSound();
      const tableText = data.tableNumber ? `bàn ${data.tableNumber}` : 'mang về';
      speakNotification(`Bếp nhận đơn mới từ ${tableText}.`);
      toast('Bếp nhận đơn mới: #' + data.orderNumber, { icon: '🔥' });
    };

    const handleItemReady = (data) => {
      if (!user || !['admin', 'waiter'].includes(user.role)) return;
      playNotificationSound();
      const tableText = data.tableNumber ? `bàn ${data.tableNumber}` : 'mang về';
      speakNotification(`Món ${data.itemName} đã chuẩn bị xong cho ${tableText}.`);
      toast.success(`Món ${data.itemName} ĐÃ XONG! Mời phục vụ!`, { icon: '🏃' });
    };

    const handleItemStatusChanged = (data) => {
      if (data.status === 'ready') {
        if (!user || !['admin', 'waiter'].includes(user.role)) return;
        playNotificationSound();
        speakNotification(`Món ${data.itemName} đã sẵn sàng.`);
        toast.success(`Món ${data.itemName} đã sẵn sàng!`);
      } else if (data.status === 'cancelled') {
        if (!user || !['admin', 'waiter'].includes(user.role)) return;
        playNotificationSound();
        speakNotification(`Món ${data.itemName} đã bị hủy.`);
        toast.error(`Món ${data.itemName} đã bị hủy!`, { icon: '🚫' });
      }
    };

    const handleWaiterCall = (data) => {
      if (!user || !['admin', 'waiter'].includes(user.role)) return;
      playNotificationSound();
      speakNotification(`Bàn ${data.tableNumber} đang gọi phục vụ.`);
      toast(`Bàn ${data.tableNumber} đang gọi phục vụ!`, { 
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
        if (!user || !['admin', 'waiter'].includes(user.role)) return;
        playNotificationSound();
        speakNotification(`Bàn ${data.tableNumber || 'N/A'} vừa gọi thêm món ${data.itemName || 'món mới'}.`);
        toast(`Bàn ${data.tableNumber || 'N/A'} vừa gọi thêm món: ${data.itemName || 'món mới'}`, {
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
      }
    };

    const handlePaymentRequested = (data) => {
      if (!user || !['admin', 'waiter'].includes(user.role)) return;
      playNotificationSound();
      speakNotification(`Bàn ${data.tableNumber || 'N/A'} yêu cầu thanh toán.`);
      toast(`Bàn ${data.tableNumber || 'N/A'} yêu cầu thanh toán cho đơn #${data.orderNumber.slice(-6)}!`, {
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
        const tableText = data.tableNumber ? `Bàn ${data.tableNumber}` : 'Đơn hàng';
        const amountText = data.amount 
          ? `thanh toán thành công ${Math.round(data.amount / 1000)} nghìn đồng`
          : 'đã thanh toán thành công';
        speakNotification(`${tableText} ${amountText}.`);
        
        const amountFmt = data.amount ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(data.amount) : '';
        const message = data.orderNumber && data.amount 
          ? `Đơn hàng #${data.orderNumber} vừa được thanh toán ${amountFmt}!`
          : `Đơn hàng đã được thanh toán thành công!`;
          
        toast.success(message, {
          icon: '💰',
          duration: 8000
        });
      }
    };

    socket.on('order_placed', handleOrderPlaced);
    socket.on('new_order', handleNewOrder);
    socket.on('item_ready', handleItemReady);
    socket.on('item_status_changed', handleItemStatusChanged);
    socket.on('waiter_call', handleWaiterCall);
    socket.on('order_updated', handleOrderUpdated);
    socket.on('payment_requested', handlePaymentRequested);
    socket.on('order_payment_updated', handleOrderPaymentUpdated);

    return () => {
      socket.off('order_placed', handleOrderPlaced);
      socket.off('new_order', handleNewOrder);
      socket.off('item_ready', handleItemReady);
      socket.off('item_status_changed', handleItemStatusChanged);
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