import staffService from '../services/staffService.js';
import { isServiceError } from '../services/serviceError.js';
import { StatusCodes } from 'http-status-codes';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  forbiddenResponse
} from '../utils/ResponseHelper.js';

const handleServiceError = (res, error, fallbackMessage) => {
  if (!isServiceError(error)) {
    return errorResponse(res, fallbackMessage, StatusCodes.INTERNAL_SERVER_ERROR);
  }

  if (error.statusCode === StatusCodes.NOT_FOUND) {
    return notFoundResponse(res, error.message);
  }

  if (error.statusCode === StatusCodes.FORBIDDEN) {
    return forbiddenResponse(res, error.message);
  }

  return errorResponse(res, error.message, error.statusCode);
};

const getAllStaffs = async (req, res) => {
  try {
    const restaurantId = req.staff.restaurantId;
    const { page, limit, search, role, isActive } = req.query;

    const data = await staffService.getAllStaffs({
      restaurantId,
      page,
      limit,
      search,
      role,
      isActive
    });

    return successResponse(res, data, 'Staff accounts retrieved successfully');
  } catch (err) {
    console.error('Error fetching staff accounts:', err);
    return handleServiceError(res, err, 'Failed to retrieve staff accounts');
  }
};

const getStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurantId = req.staff.restaurantId;

    const staff = await staffService.getStaffById(restaurantId, id);
    return successResponse(res, staff, 'Staff account details retrieved');
  } catch (err) {
    console.error('Error fetching staff details:', err);
    return handleServiceError(res, err, 'Failed to retrieve staff details');
  }
};

const createStaff = async (req, res) => {
  try {
    const restaurantId = req.staff.restaurantId;
    const newStaff = await staffService.createStaff(restaurantId, req.body);

    return successResponse(res, newStaff, 'Nhân viên đã được tạo thành công!', StatusCodes.CREATED);
  } catch (err) {
    console.error('Error creating staff:', err);
    return handleServiceError(res, err, 'Failed to create staff account');
  }
};

const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurantId = req.staff.restaurantId;

    const updatedStaff = await staffService.updateStaff(restaurantId, id, req.body);
    return successResponse(res, updatedStaff, 'Thông tin nhân viên đã được cập nhật thành công!');
  } catch (err) {
    console.error('Error updating staff:', err);
    return handleServiceError(res, err, 'Failed to update staff account');
  }
};

const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurantId = req.staff.restaurantId;
    const currentStaffId = req.staff.id;

    await staffService.deleteStaff(restaurantId, currentStaffId, id);
    return successResponse(res, null, 'Tài khoản nhân viên đã được xóa thành công!');
  } catch (err) {
    console.error('Error deleting staff:', err);
    return handleServiceError(res, err, 'Failed to delete staff account');
  }
};

export default {
  getAllStaffs,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff
};
