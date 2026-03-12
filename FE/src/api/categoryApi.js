import axiosClient from './axiosClient';

const categoryApi = {
  /**
   * Get all categories
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getAll: (params = {}) => {
    return axiosClient.get('/categories', { params });
  },

  /**
   * Get category by ID
   * @param {number} id
   * @returns {Promise}
   */
  getById: (id) => {
    return axiosClient.get(`/categories/${id}`);
  },

  /**
   * Create new category
   * @param {Object} data - Category data
   * @returns {Promise}
   */
  create: (data) => {
    return axiosClient.post('/categories', data);
  },

  /**
   * Update category
   * @param {number} id
   * @param {Object} data - Category data
   * @returns {Promise}
   */
  update: (id, data) => {
    return axiosClient.put(`/categories/${id}`, data);
  },

  /**
   * Delete category
   * @param {number} id
   * @returns {Promise}
   */
  delete: (id) => {
    return axiosClient.delete(`/categories/${id}`);
  },

  /**
   * Toggle category active status
   * @param {number} id
   * @returns {Promise}
   */
  toggleStatus: (id) => {
    return axiosClient.patch(`/categories/${id}/toggle`);
  },

  /**
   * Reorder categories
   * @param {Array} categoryIds - Array of category IDs in new order
   * @returns {Promise}
   */
  reorder: (categoryIds) => {
    return axiosClient.patch('/categories/reorder', { categoryIds });
  },
};

export default categoryApi;