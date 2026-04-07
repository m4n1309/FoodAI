import { StatusCodes } from 'http-status-codes';
import { successResponse, errorResponse } from '../utils/ResponseHelper.js';
import reportService from '../services/reportService.js';

const getRevenueReport = async (req, res) => {
  try {
    const { from, to, group_by, table_id, staff_id } = req.query;

    if (!from || !to) {
      return errorResponse(res, 'Missing from or to date range', StatusCodes.BAD_REQUEST);
    }

    const data = await reportService.getRevenueReport({
      restaurantId: req.staff.restaurantId,
      from,
      to,
      group_by: group_by || 'day',
      tableId: table_id,
      staffId: staff_id
    });

    return successResponse(res, data, 'Revenue report retrieved successfully');
  } catch (error) {
    console.error('Error in getRevenueReport controller:', error);
    return errorResponse(res, 'Failed to retrieve revenue report', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

const getPopularItems = async (req, res) => {
  try {
    const { from, to, limit, category_id } = req.query;

    if (!from || !to) {
      return errorResponse(res, 'Missing from or to date range', StatusCodes.BAD_REQUEST);
    }

    const data = await reportService.getPopularItems({
      restaurantId: req.staff.restaurantId,
      from,
      to,
      categoryId: category_id,
      limit: limit || 10
    });

    return successResponse(res, data, 'Popular items report retrieved successfully');
  } catch (error) {
    console.error('Error in getPopularItems controller:', error);
    return errorResponse(res, 'Failed to retrieve popular items report', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export default {
  getRevenueReport,
  getPopularItems
};
