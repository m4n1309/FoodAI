import { StatusCodes } from 'http-status-codes';
import { successResponse, errorResponse, notFoundResponse, forbiddenResponse } from '../utils/ResponseHelper.js';
import { isServiceError } from '../services/serviceError.js';
import kitchenService from '../services/kitchenService.js';

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

const getActiveOrders = async (req, res) => {
  try {
    const orders = await kitchenService.getActiveOrders({
      restaurantId: req.staff.restaurantId
    });
    return successResponse(res, orders, 'Kitchen orders retrieved successfully');
  } catch (error) {
    return handleServiceError(res, error, 'Failed to retrieve kitchen orders');
  }
};

const updateItemStatus = async (req, res) => {
  try {
    const { status, cancelledReason } = req.body;
    const itemId = req.params.id;
    const staffId = req.staff.id;

    const updatedItem = await kitchenService.updateItemStatus({
      itemId,
      restaurantId: req.staff.restaurantId,
      status,
      staffId
    });

    // Notify clients via Socket.IO
    const io = req.app.locals.io;
    if (io) {
      // 1. Notify waiters/managers for global UI toasts
      io.to(`restaurant:${req.staff.restaurantId}`).emit('item_status_changed', {
        itemId: updatedItem.id,
        orderId: updatedItem.orderId,
        itemName: updatedItem.itemName,
        status: updatedItem.itemStatus
      });

      if (updatedItem.itemStatus === 'ready') {
         const db = (await import('../models/index.js')).default;
         const order = await db.Order.findByPk(updatedItem.orderId, { include: ['table'] });
         const tableNumber = order?.table?.tableNumber || 'mang về';

         io.to(`waiter:${req.staff.restaurantId}`).emit('item_ready', {
            itemId: updatedItem.id,
            orderId: updatedItem.orderId,
            itemName: updatedItem.itemName,
            tableNumber
         });
      }

      // 2. Notify specific order room (for Customer Tracking UI)
      io.to(`order:${updatedItem.orderId}`).emit('item_status_changed', {
        itemId: updatedItem.id,
        itemName: updatedItem.itemName,
        status: updatedItem.itemStatus,
        cancelledReason: cancelledReason || 'Hết món'
      });
    }

    return successResponse(res, updatedItem, 'Item status updated successfully');
  } catch (error) {
    return handleServiceError(res, error, 'Failed to update item status');
  }
};

export default {
  getActiveOrders,
  updateItemStatus
};
