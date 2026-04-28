import comboService from '../services/comboService.js';
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
    console.error(error);
    return errorResponse(res, fallbackMessage, StatusCodes.INTERNAL_SERVER_ERROR);
  }
  if (error.statusCode === StatusCodes.NOT_FOUND) {
    return notFoundResponse(res, error.message);
  }
  if (error.statusCode === StatusCodes.FORBIDDEN) {
    return forbiddenResponse(res, error.message);
  }
  return errorResponse(res, error.message, 'Error', error.statusCode);
};

const getAllCombos = async (req, res) => {
  try {
    const combos = await comboService.getAllCombos(req.query);
    return successResponse(res, combos, 'Combos retrieved successfully');
  } catch (error) {
    return handleServiceError(res, error, 'Failed to retrieve combos');
  }
};

const getComboById = async (req, res) => {
  try {
    const combo = await comboService.getComboById(req.params.id);
    return successResponse(res, combo, 'Combo retrieved successfully');
  } catch (error) {
    return handleServiceError(res, error, 'Failed to retrieve combo');
  }
};

const createCombo = async (req, res) => {
  try {
    const combo = await comboService.createCombo({
      body: req.body,
      staffRestaurantId: req.staff.restaurantId
    });
    return successResponse(res, combo, 'Combo created successfully', StatusCodes.CREATED);
  } catch (error) {
    return handleServiceError(res, error, 'Failed to create combo');
  }
};

const updateCombo = async (req, res) => {
  try {
    const combo = await comboService.updateCombo({
      id: req.params.id,
      body: req.body,
      staffRestaurantId: req.staff.restaurantId
    });
    return successResponse(res, combo, 'Combo updated successfully');
  } catch (error) {
    return handleServiceError(res, error, 'Failed to update combo');
  }
};

const deleteCombo = async (req, res) => {
  try {
    await comboService.deleteCombo({
      id: req.params.id,
      staffRestaurantId: req.staff.restaurantId
    });
    return successResponse(res, null, 'Combo deleted successfully');
  } catch (error) {
    return handleServiceError(res, error, 'Failed to delete combo');
  }
};

const toggleAvailability = async (req, res) => {
  try {
    const combo = await comboService.toggleAvailability({
      id: req.params.id,
      staffRestaurantId: req.staff.restaurantId
    });
    return successResponse(res, combo, 'Combo availability toggled successfully');
  } catch (error) {
    return handleServiceError(res, error, 'Failed to toggle combo availability');
  }
};

export default {
  getAllCombos,
  getComboById,
  createCombo,
  updateCombo,
  deleteCombo,
  toggleAvailability
};
