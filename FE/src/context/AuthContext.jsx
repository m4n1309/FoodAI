import { createContext, useState, useEffect, useContext } from 'react';
import authApi from '../api/authApi';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      const savedUser = localStorage.getItem('user');
      
      if (savedUser) {
        try {
          // Verify token is still valid
          const response = await authApi.getCurrentUser();
          setUser(response.data);
          localStorage.setItem('user', JSON.stringify(response.data));
        } catch (error) {
          console.error('Auth check failed:', error);
          // Token invalid, clear storage
          localStorage.removeItem('user');
          setUser(null);
        }
      }
      
      setLoading(false);
    };

    checkAuth();
  }, []);

  /**
   * Login user
   */
  const login = async (username, password) => {
    try {
      const response = await authApi.login({ username, password });
      const { staff } = response.data;

      // Save to localStorage
      localStorage.setItem('user', JSON.stringify(staff));
      
      setUser(staff);
      toast.success('Đăng nhập thành công!');
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Đăng nhập thất bại';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear storage and state
      localStorage.removeItem('user');
      setUser(null);
      toast.success('Đã đăng xuất');
    }
  };

  /**
   * Check if user has required role
   */
  const hasRole = (roles) => {
    if (!user) return false;
    if (typeof roles === 'string') {
      return user.role === roles;
    }
    return roles.includes(user.role);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    hasRole,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};