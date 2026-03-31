import customerCartService from '../services/customerCartService.js';
import { isServiceError } from '../services/serviceError.js';
import { StatusCodes } from 'http-status-codes';
import { successResponse, errorResponse } from '../utils/ResponseHelper.js';

const handleServiceError = (res, err) => {
  if (isServiceError(err)) {
    return errorResponse(res, err.message, 'Error', err.statusCode);
  }

  return errorResponse(res, err.message, 'Error', StatusCodes.INTERNAL_SERVER_ERROR);
};

// POST /customer/cart
const createOrGetCart = async (req, res) => {
  try {
    const data = await customerCartService.createOrGetCart({
      sessionId: req.customerSessionId,
      isNewSession: req.isNewCustomerSession,
      restaurantId: req.body.restaurantId,
      tableId: req.body.tableId
    });

    return successResponse(res, data, 'Cart ready');
  } catch (err) {
    return handleServiceError(res, err);
  }
};

// GET /customer/cart?restaurantId=1&tableId=1
const getCart = async (req, res) => {
  try {
    const data = await customerCartService.getCart({
      sessionId: req.customerSessionId,
      restaurantId: req.query.restaurantId,
      tableId: req.query.tableId
    });

    return successResponse(res, data, 'Cart retrieved successfully');
  } catch (err) {
    return handleServiceError(res, err);
  }
};

// POST /customer/cart/items
const addItem = async (req, res) => {
  try {
    const data = await customerCartService.addItem({
      sessionId: req.customerSessionId,
      ...req.body
    });

    return successResponse(res, data, 'Item added to cart', StatusCodes.CREATED);
  } catch (err) {
    return handleServiceError(res, err);
  }
};

// PATCH /customer/cart/items/:id
const updateItem = async (req, res) => {
  try {
    const data = await customerCartService.updateItem({
      sessionId: req.customerSessionId,
      id: req.params.id,
      quantity: req.body.quantity,
      specialInstructions: req.body.specialInstructions
    });

    return successResponse(res, data, 'Cart item updated successfully');
  } catch (err) {
    return handleServiceError(res, err);
  }
};

// DELETE /customer/cart/items/:id
const removeItem = async (req, res) => {
  try {
    const data = await customerCartService.removeItem({
      sessionId: req.customerSessionId,
      id: req.params.id
    });

    return successResponse(res, data, 'Cart item removed successfully');
  } catch (err) {
    return handleServiceError(res, err);
  }
};

// POST /customer/orders
const placeOrder = async (req, res) => {
  try {
    const data = await customerCartService.placeOrder({
      sessionId: req.customerSessionId,
      orderId: req.body.orderId,
      customerName: req.body.customerName,
      customerNote: req.body.customerNote,
      promotionCode: req.body.promotionCode,
      pointsToRedeem: req.body.pointsToRedeem,
      customerId: req.body.customerId
    });

    // Notify staff via Socket.IO
    const io = req.app.locals.io;
    if (io && data.order?.restaurantId) {
      io.to(`restaurant:${data.order.restaurantId}`).emit('order_placed', {
        orderId: data.order.id,
        orderNumber: data.order.orderNumber,
        tableId: data.order.tableId,
        restaurantId: data.order.restaurantId,
        itemCount: (data.order.items || []).length
      });
      
      io.to(`kitchen:${data.order.restaurantId}`).emit('new_order', {
        orderId: data.order.id,
        orderNumber: data.order.orderNumber,
        tableId: data.order.tableId,
        itemCount: (data.order.items || []).length
      });
    }

    return successResponse(res, data, 'Order placed successfully', StatusCodes.CREATED);
  } catch (err) {
    return handleServiceError(res, err);
  }
};

export default {
  createOrGetCart,
  getCart,
  addItem,
  updateItem,
  removeItem,
  placeOrder
};