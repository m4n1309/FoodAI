import { StatusCodes } from 'http-status-codes';
import { successResponse, errorResponse, notFoundResponse, forbiddenResponse } from '../utils/ResponseHelper.js';
import { isServiceError } from '../services/serviceError.js';
import orderService from '../services/orderService.js';
import db from '../models/index.js';

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

const getAllOrders = async (req, res) => {
  try {
    const data = await orderService.getAllOrders({
      restaurantId: req.staff.restaurantId,
      ...req.query
    });
    return successResponse(res, data, 'Orders retrieved successfully');
  } catch (error) {
    return handleServiceError(res, error, 'Failed to retrieve orders');
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await orderService.getOrderById({
      id: req.params.id,
      restaurantId: req.staff.restaurantId
    });
    return successResponse(res, order, 'Order retrieved successfully');
  } catch (error) {
    return handleServiceError(res, error, 'Failed to retrieve order');
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const order = await orderService.updateOrderStatus({
      id: req.params.id,
      restaurantId: req.staff.restaurantId,
      status: req.body.status,
      cancelledReason: req.body.cancelledReason,
      staffId: req.staff.id
    });

    // Notify clients? Currently we don't have bi-directional socket to customer but we can emit to staff room
    const io = req.app.locals.io;
    if (io) {
      let tableNumber = 'mang về';
      if (order.tableId) {
        const table = await db.Table.findByPk(order.tableId, { attributes: ['tableNumber'] });
        tableNumber = table?.tableNumber || 'mang về';
      }

      io.to(`restaurant:${order.restaurantId}`).emit('order_updated', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.orderStatus,
        tableId: order.tableId
      });

      if (order.orderStatus === 'confirmed') {
        io.to(`restaurant:${order.restaurantId}`).emit('order_confirmed', {
          orderId: order.id,
          orderNumber: order.orderNumber,
          tableNumber
        });
      }

      // also emit to order room so customer can see updates
      io.to(`order:${order.id}`).emit('order_status_changed', {
        orderId: order.id,
        status: order.orderStatus,
        cancelledReason: order.cancelledReason
      });

      // also emit to table room if there is a table
      if (order.tableId) {
        io.to(`table:${order.tableId}`).emit('order_status_updated', {
          orderId: order.id,
          status: order.orderStatus
        });
      }
    }

    return successResponse(res, order, 'Order status updated successfully');
  } catch (error) {
    return handleServiceError(res, error, 'Failed to update order status');
  }
};

const createOrder = async (req, res) => {
  try {
    const restaurantId = req.staff.restaurantId;
    const staffId = req.staff.id;
    const { tableId, customerName, customerPhone, items } = req.body;

    const order = await orderService.createOrder({
      restaurantId,
      tableId,
      customerName,
      customerPhone,
      items,
      staffId
    });

    // Notify clients over WebSockets
    const io = req.app.locals.io;
    if (io) {
      let tableNumber = 'mang về';
      if (order.tableId) {
        const table = await db.Table.findByPk(order.tableId, { attributes: ['tableNumber'] });
        tableNumber = table?.tableNumber || 'mang về';
      }

      io.to(`restaurant:${restaurantId}`).emit('order_placed', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        tableId: order.tableId,
        tableNumber
      });
      io.to(`restaurant:${restaurantId}`).emit('order_confirmed', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        tableId: order.tableId,
        tableNumber
      });
    }

    return successResponse(res, order, 'Đơn hàng đã được tạo thành công!', StatusCodes.CREATED);
  } catch (error) {
    return handleServiceError(res, error, 'Tạo đơn hàng thất bại');
  }
};

export default {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  createOrder
};
