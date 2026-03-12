import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';

// Pages
import LoginPage from './pages/admin/LoginPage';
import DashboardPage from './pages/admin/DashboardPage';
import CategoriesPage from './pages/admin/CategoriesPage';
import MenuItemsPage from './pages/admin/MenuItemsPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/admin/login" element={<LoginPage />} />

          {/* Protected Admin Routes */}
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
                <div className="min-h-screen flex items-center justify-center">
                  <h1 className="text-4xl font-bold">Tables (Coming Soon)</h1>
                </div>
              </ProtectedRoute>
            }
          />

          {/* Redirects */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/" element={<Navigate to="/admin/login" replace />} />
          <Route path="*" element={<Navigate to="/admin/login" replace />} />
        </Routes>

        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;