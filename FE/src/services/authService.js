import httpClient from './httpClient.js';

const authService = {
  login: (credentials) => httpClient.post('/auth/login', credentials),
  logout: () => httpClient.post('/auth/logout'),
  getCurrentUser: () => httpClient.get('/auth/me'),
  refreshToken: (refreshToken) => httpClient.post('/auth/refresh-token', { refreshToken }),
  forgotPassword: (email) => httpClient.post('/auth/forgot-password', { email }),
  resetPassword: (data) => httpClient.post('/auth/reset-password', data)
};

export default authService;
