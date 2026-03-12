import axios from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
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
    const originalRequest = error.config;

    // Handle 401 Unauthorized - Token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        console.log('Access token expired, attempting to refresh...');

        await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh-token`,
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

export default axiosClient;