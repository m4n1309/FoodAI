import tableService from '../services/tableService.js';
import { isServiceError } from '../services/serviceError.js';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  forbiddenResponse
} from '../utils/ResponseHelper.js'
import { StatusCodes } from 'http-status-codes';
const handleServiceError = (res, error, fallbackMessage) => {
  if (!isServiceError(error)) {
    return errorResponse(res, fallbackMessage, 'Error', StatusCodes.INTERNAL_SERVER_ERROR);
  }

  if (error.statusCode === StatusCodes.NOT_FOUND) {
    return notFoundResponse(res, error.message);
  }
  if (error.statusCode === StatusCodes.FORBIDDEN) {
    return forbiddenResponse(res, error.message);
  }

  return errorResponse(res, error.message, 'Error', error.statusCode);
};

const getAllTables = async (req, res) => {
  try {
    const data = await tableService.getAllTables(req.query);
    return successResponse(res, {
      total: data.total,
      tables: data.tables
    }, 'Tables retrieved successfully');
  } catch (error) {
    return handleServiceError(res, error, 'Failed to retrieve tables');
  }
}

const getTableById = async (req, res) => {
  try {
    const table = await tableService.getTableById(req.params.id);
    return successResponse(res, table, 'Table retrieved successfully');
  } catch (error) {
    return handleServiceError(res, error, 'Failed to retrieve table');
  }
}

const createTable = async (req, res) => {
  try {
    const table = await tableService.createTable({
      body: req.body,
      staffRestaurantId: req.staff.restaurantId,
      requestHost: req.get('host')
    });
    return successResponse(res, table, 'Table created successfully');
  } catch (error) {
    return handleServiceError(res, error, 'Failed to create table');
  }
}

const updateTable = async (req, res) => {
  try {
    const table = await tableService.updateTable({
      id: req.params.id,
      updateData: req.body,
      staffRestaurantId: req.staff.restaurantId,
      requestHost: req.get('host')
    });
    return successResponse(res, table, 'Table updated successfully');
  } catch (error) {
    return handleServiceError(res, error, 'Failed to update table');
  }
}

const deleteTable = async (req, res) => {
  try {
    await tableService.deleteTable({
      id: req.params.id,
      staffRestaurantId: req.staff.restaurantId
    });
    return successResponse(res, null, 'Table deleted successfully');
  } catch (error) {
    return handleServiceError(res, error, 'Failed to delete table');
  }
}

const updateTableStatus = async (req, res) => {
  try {
    const table = await tableService.updateTableStatus({
      id: req.params.id,
      status: req.body.status,
      staffRestaurantId: req.staff.restaurantId
    });
    return successResponse(res, table, 'Table status updated successfully');
  } catch (error) {
    return handleServiceError(res, error, 'Failed to update table status');
  }
}

const generateTableQRCode = async (req, res) => {
  try {
    const result = await tableService.generateTableQRCode({
      id: req.params.id,
      format: req.body?.format || 'url',
      regenerate: req.body?.regenerate || false,
      staffRestaurantId: req.staff.restaurantId,
      requestHost: req.get('host')
    });

    if (result.type === 'buffer') {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.send(result.buffer);
    }

    return successResponse(res, result.data, 'Tạo QR code thành công');
  } catch (error) {
    console.error('❌ Generate QR code error:', error);
    return handleServiceError(res, error, 'Tạo QR code thất bại');
  }
};

const getTableByQRCode = async (req, res) => {
  try {
    const table = await tableService.getTableByQRCode(req.params.qrCode);
    return successResponse(res, table, 'Table found successfully');
  } catch (error) {
    return handleServiceError(res, error, 'Failed to find table by QR code');
  }
}

const getTableStatusSummary = async (req, res) => {
  try {
    const statusCounts = await tableService.getTableStatusSummary(req.query.restaurantId);
    return successResponse(res, statusCounts, 'Table status summary retrieved successfully');
  } catch (error) {
    return handleServiceError(res, error, 'Failed to retrieve table status summary');
  }
}

export default {
  getAllTables,
  getTableById,
  createTable,
  updateTable,
  deleteTable,
  updateTableStatus,
  generateTableQRCode,
  getTableByQRCode,
  getTableStatusSummary
}