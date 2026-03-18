import httpClient from './httpClient.js';

const authService = {
  login: (credentials) => httpClient.post('/auth/login', credentials),
  logout: () => httpClient.post('/auth/logout'),
  getCurrentUser: () => httpClient.get('/auth/me'),
  refreshToken: (refreshToken) => httpClient.post('/auth/refresh-token', { refreshToken })
};

export default authService;
