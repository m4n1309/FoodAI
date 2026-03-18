import {
  successResponse,
  errorResponse,
  forbiddenResponse,
  notFoundResponse
} from '../utils/ResponseHelper.js';
import { StatusCodes } from 'http-status-codes';
import menuItemService from '../services/menuItemService.js';
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

const getAllMenuItems = async (req, res) => {
  try {
    const data = await menuItemService.getAllMenuItems(req.query);

    return successResponse(res, {
      total: data.total,
      page: data.page,
      limit: data.limit,
      totalPages: data.totalPages,
      menuItems: data.menuItems
    }, 'Menu items retrieved successfully');
  } catch (error) {
    return handleServiceError(res, error, 'Failed to retrieve menu items');
  }
};

const getMenuItemById = async (req, res) => {
  try {
    const menuItem = await menuItemService.getMenuItemById(req.params.id);
    return successResponse(res, menuItem, 'Menu item retrieved successfully');
  } catch (error) {
    return handleServiceError(res, error, 'Failed to retrieve menu item');
  }
};

const getFeaturedMenuItems = async (req, res) => {
  try {
    const menuItems = await menuItemService.getFeaturedMenuItems(req.query);
    return successResponse(res, menuItems, 'Featured menu items retrieved successfully');
  } catch (error) {
    return handleServiceError(res, error, 'Failed to retrieve featured menu items');
  }
};

const createMenuItem = async (req, res) => {
  try {
    const createdItem = await menuItemService.createMenuItem({
      body: req.body,
      staffRestaurantId: req.staff.restaurantId
    });

    return successResponse(res, createdItem, 'Menu item created successfully');
  } catch (error) {
    return handleServiceError(res, error, 'Failed to create menu item');
  }
};

const updateMenuItem = async (req, res) => {
  try {
    const updatedItem = await menuItemService.updateMenuItem({
      id: req.params.id,
      updateData: req.body,
      staffRestaurantId: req.staff.restaurantId
    });

    return successResponse(res, updatedItem, 'Menu item updated successfully');
  } catch (error) {
    return handleServiceError(res, error, 'Failed to update menu item');
  }
};

const deleteMenuItem = async (req, res) => {
  try {
    await menuItemService.deleteMenuItem({
      id: req.params.id,
      staffRestaurantId: req.staff.restaurantId
    });

    return successResponse(res, null, 'Menu item deleted successfully');
  } catch (error) {
    return handleServiceError(res, error, 'Failed to delete menu item');
  }
};

const toggleMenuItemAvailability = async (req, res) => {
  try {
    const menuItem = await menuItemService.toggleMenuItemAvailability({
      id: req.params.id,
      staffRestaurantId: req.staff.restaurantId
    });

    return successResponse(res, menuItem, 'Menu item availability toggled successfully');
  } catch (error) {
    return handleServiceError(res, error, 'Failed to toggle menu item availability');
  }
};

const toggleMenuItemFeatured = async (req, res) => {
  try {
    const menuItem = await menuItemService.toggleMenuItemFeatured({
      id: req.params.id,
      staffRestaurantId: req.staff.restaurantId
    });

    return successResponse(res, menuItem, 'Menu item featured status toggled successfully');
  } catch (error) {
    return handleServiceError(res, error, 'Failed to toggle menu item featured status');
  }
};

export default {
  getAllMenuItems,
  getMenuItemById,
  getFeaturedMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
  toggleMenuItemFeatured
};
