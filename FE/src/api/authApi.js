import axiosClient from './axiosClient';

const authApi = {
  /**
   * Login
   * @param {Object} credentials - { username, password }
   * @returns {Promise}
   */
  login: (credentials) => {
    return axiosClient.post('/auth/login', credentials);
  },

  /**
   * Logout
   * @returns {Promise}
   */
  logout: () => {
    return axiosClient.post('/auth/logout');
  },

  /**
   * Get current user info
   * @returns {Promise}
   */
  getCurrentUser: () => {
    return axiosClient.get('/auth/me');
  },

  /**
   * Refresh access token
   * @param {string} refreshToken
   * @returns {Promise}
   */
  refreshToken: (refreshToken) => {
    return axiosClient.post('/auth/refresh', { refreshToken });
  },
};

export default authApi;