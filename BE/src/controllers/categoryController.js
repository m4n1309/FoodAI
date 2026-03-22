import {
  successResponse,
  errorResponse,
  notFoundResponse,
  forbiddenResponse
} from '../utils/ResponseHelper.js';
import { StatusCodes } from 'http-status-codes';
import categoryService from '../services/categoryService.js';
import { isServiceError } from '../services/serviceError.js';

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

const getAllCategories = async (req, res) => {
  try {
    const data = await categoryService.getAllCategories(req.query);

    return successResponse(res, {
      total: data.total,
      page: data.page,
      limit: data.limit,
      totalPages: data.totalPages,
      categories: data.categories
    }, 'Lấy danh sách danh mục thành công');
  } catch (error) {
    return handleServiceError(res, error, 'Lấy danh sách thất bại');
  }
};

const getCategoryById = async (req, res) => {
  try {
    const category = await categoryService.getCategoryById(req.params.id);
    return successResponse(res, category, 'Lấy thông tin danh mục thành công');
  } catch (error) {
    return handleServiceError(res, error, 'Lấy thông tin thất bại');
  }
};

const createCategory = async (req, res) => {
  try {
    const category = await categoryService.createCategory({
      body: req.body,
      staff: req.staff
    });

    return successResponse(res, category, 'Tạo danh mục thành công', StatusCodes.CREATED);
  } catch (error) {
    if (error?.name === 'SequelizeValidationError') {
      return forbiddenResponse(res, error.errors.map((e) => e.message).join(', '));
    }
    return handleServiceError(res, error, 'Tạo danh mục thất bại');
  }
};

const updateCategory = async (req, res) => {
  try {
    const category = await categoryService.updateCategory({
      id: req.params.id,
      body: req.body,
      staffRestaurantId: req.staff.restaurantId
    });

    return successResponse(res, category, 'Cập nhật danh mục thành công');
  } catch (error) {
    if (error?.name === 'SequelizeValidationError') {
      return errorResponse(res, error.errors.map((e) => e.message).join(', '), StatusCodes.BAD_REQUEST);
    }
    return handleServiceError(res, error, 'Cập nhật danh mục thất bại');
  }
};

const deleteCategory = async (req, res) => {
  try {
    await categoryService.deleteCategory({
      id: req.params.id,
      staffRestaurantId: req.staff.restaurantId
    });

    return successResponse(res, null, 'Xóa danh mục thành công');
  } catch (error) {
    return handleServiceError(res, error, 'Xóa danh mục thất bại');
  }
};

const toggleCategoryStatus = async (req, res) => {
  try {
    const category = await categoryService.toggleCategoryStatus({
      id: req.params.id,
      staffRestaurantId: req.staff.restaurantId
    });

    return successResponse(res, category, 'Thay đổi trạng thái thành công');
  } catch (error) {
    return handleServiceError(res, error, 'Thay đổi trạng thái thất bại');
  }
};

const reorderCategories = async (req, res) => {
  try {
    await categoryService.reorderCategories({
      categoryIds: req.body.categoryIds,
      staffRestaurantId: req.staff.restaurantId
    });

    return successResponse(res, null, 'Sắp xếp danh mục thành công');
  } catch (error) {
    return handleServiceError(res, error, 'Sắp xếp danh mục thất bại');
  }
};

export default {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
  reorderCategories
};
