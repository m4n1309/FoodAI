import axios from 'axios';
import { API_BASE_URL } from '../config/apiConfig.js';
import { getOrCreateCustomerSessionId } from '../utils/customerSession.js';

const isAuthEndpoint = (url = '') => {
  const normalized = String(url);
  return normalized.includes('/auth/login') || normalized.includes('/auth/refresh-token');
};

const isCustomerEndpoint = (url = '') => String(url).includes('/customer');

const httpClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

httpClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config || {};

    if (isAuthEndpoint(originalRequest.url)) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await axios.post(`${API_BASE_URL}/auth/refresh-token`, {}, { withCredentials: true });
        return httpClient(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('user');
        window.location.href = '/admin/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

httpClient.interceptors.request.use((config) => {
  if (isCustomerEndpoint(config.url)) {
    const sessionId = getOrCreateCustomerSessionId();
    config.headers = config.headers || {};
    config.headers['X-Customer-Session'] = sessionId;
  }

  return config;
});

export default httpClient;
