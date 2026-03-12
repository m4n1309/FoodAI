import axiosClient from './axiosClient';

const menuItemApi = {
  /**
   * Get all menu items
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getAll: (params = {}) => {
    return axiosClient.get('/menu-items', { params });
  },

  /**
   * Get menu item by ID
   * @param {number} id
   * @returns {Promise}
   */
  getById: (id) => {
    return axiosClient.get(`/menu-items/${id}`);
  },

  /**
   * Get featured menu items
   * @param {Object} params
   * @returns {Promise}
   */
  getFeatured: (params = {}) => {
    return axiosClient.get('/menu-items/featured', { params });
  },

  /**
   * Create new menu item
   * @param {Object} data - Menu item data
   * @returns {Promise}
   */
  create: (data) => {
    return axiosClient.post('/menu-items', data);
  },

  /**
   * Update menu item
   * @param {number} id
   * @param {Object} data - Menu item data
   * @returns {Promise}
   */
  update: (id, data) => {
    return axiosClient.put(`/menu-items/${id}`, data);
  },

  /**
   * Delete menu item
   * @param {number} id
   * @returns {Promise}
   */
  delete: (id) => {
    return axiosClient.delete(`/menu-items/${id}`);
  },

  /**
   * Toggle menu item availability
   * @param {number} id
   * @returns {Promise}
   */
  toggleAvailability: (id) => {
    return axiosClient.patch(`/menu-items/${id}/availability`);
  },

  /**
   * Toggle menu item featured status
   * @param {number} id
   * @returns {Promise}
   */
  toggleFeatured: (id) => {
    return axiosClient.patch(`/menu-items/${id}/featured`);
  },
};

export default menuItemApi;