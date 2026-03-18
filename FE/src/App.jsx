import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './state/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import LoginPage from './pages/admin/LoginPage.jsx';
import DashboardPage from './pages/admin/DashboardPage.jsx';
import CategoriesPage from './pages/admin/CategoriesPage.jsx';
import MenuItemsPage from './pages/admin/MenuItemsPage.jsx';
import TablesPage from './pages/admin/TablesPage.jsx';
import CustomerMenuPage from './pages/customer/customerMenuPage';
import { toastOptions } from './config/toastConfig.js';

function ScanRedirectPage() {
  const location = useLocation();
  const qrCode = new URLSearchParams(location.search).get('qr');

  if (!qrCode) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Navigate to={`/customer/menu/${encodeURIComponent(qrCode)}`} replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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

          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/" element={<Navigate to="/admin/login" replace />} />
          <Route path="*" element={<Navigate to="/admin/login" replace />} />
        </Routes>

        <Toaster
          position="top-right"
          toastOptions={toastOptions}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;