import axiosClient from './axiosClient';

const tableApi = {
  /**
   * Get all tables
   * @param {Object} params - Query parameters
   * @returns {Promise} Tables list
   */
  getAll: (params) => {
    return axiosClient.get('/tables', { params });
  },

  /**
   * Get table by ID
   * @param {number} id
   * @returns {Promise} Table data
   */
  getById: (id) => {
    return axiosClient.get(`/tables/${id}`);
  },

  /**
   * Get table by QR code
   * @param {string} qrCode
   * @returns {Promise} Table data
   */
  getByQRCode: (qrCode) => {
    return axiosClient.get(`/tables/qr/${qrCode}`);
  },

  /**
   * Create new table
   * @param {Object} data - Table data
   * @returns {Promise} Created table
   */
  create: (data) => {
    return axiosClient.post('/tables', data);
  },

  /**
   * Update table
   * @param {number} id
   * @param {Object} data - Updated data
   * @returns {Promise} Updated table
   */
  update: (id, data) => {
    return axiosClient.put(`/tables/${id}`, data);
  },

  /**
   * Delete table
   * @param {number} id
   * @returns {Promise}
   */
  delete: (id) => {
    return axiosClient.delete(`/tables/${id}`);
  },

  /**
   * Update table status
   * @param {number} id
   * @param {string} status - 'available', 'occupied', 'reserved', 'maintenance'
   * @returns {Promise}
   */
  updateStatus: (id, status) => {
    return axiosClient.patch(`/tables/${id}/status`, { status });
  },

  /**
   * Generate/Regenerate QR code for table
   * @param {number} id
   * @param {Object} options
   * @returns {Promise} QR code data
   */
  generateQRCode: (id, options = {}) => {
    return axiosClient.post(`/tables/${id}/qr-code`, options);
  },

  /**
   * Get table status summary
   * @param {number} restaurantId
   * @returns {Promise} Status summary
   */
  getStatusSummary: (restaurantId) => {
    return axiosClient.get('/tables/status/summary', {
      params: { restaurantId },
    });
  },
};

export default tableApi;