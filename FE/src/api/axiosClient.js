import axios from 'axios';
import { getOrCreateCustomerSessionId } from '../utils/customerSession.js';

const resolveApiBaseUrl = () => {
  const configured = (import.meta.env.VITE_API_URL || '').trim();
  if (!configured) return '';

  try {
    const parsed = new URL(configured);
    const isDev = import.meta.env.DEV;
    const isLocalhostConfig = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
    const currentHost = window.location.hostname;
    const isCurrentHostLocal = ['localhost', '127.0.0.1', '::1'].includes(currentHost);

    // Keep FE and API on same hostname in development so cookie-based auth remains same-site.
    if (isDev && currentHost && parsed.hostname !== currentHost) {
      parsed.hostname = currentHost;
    } else if (isLocalhostConfig && currentHost && !isCurrentHostLocal) {
      parsed.hostname = currentHost;
    }

    return parsed.toString().replace(/\/$/, '');
  } catch {
    return configured.replace(/\/$/, '');
  }
};

const API_BASE_URL = resolveApiBaseUrl();

const isAuthEndpoint = (url = '') => {
  const normalized = String(url);
  return normalized.includes('/auth/login') || normalized.includes('/auth/refresh-token');
};

const isCustomerEndpoint = (url = '') => {
  return String(url).includes('/customer');
};

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor - Add token to headers
axiosClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors and token refresh
axiosClient.interceptors.response.use(
  (response) => {
    // Return only data from response
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config || {};

    if (isAuthEndpoint(originalRequest.url)) {
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized - Token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        console.log('Access token expired, attempting to refresh...');

        await axios.post(
          `${API_BASE_URL}/auth/refresh-token`,
          {}, // Empty body - refresh token in cookie
          { withCredentials: true }
        );
        console.log('Token refreshed successfully, retrying original request...');

        // Retry original request
        return axiosClient(originalRequest);

      } catch (refreshError) {
        // Refresh failed - logout user
        localStorage.removeItem('user');
        window.location.href = '/admin/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

axiosClient.interceptors.request.use((config) => {
  // Attach customer session only for customer-facing APIs.
  if (isCustomerEndpoint(config.url)) {
    const sessionId = getOrCreateCustomerSessionId();
    config.headers = config.headers || {};
    config.headers['X-Customer-Session'] = sessionId;
  }

  return config;
});

export default axiosClient;