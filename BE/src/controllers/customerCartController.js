import customerCartService from '../services/customerCartService.js';
import { isServiceError } from '../services/serviceError.js';
import { StatusCodes } from 'http-status-codes';
import { successResponse, errorResponse } from '../utils/ResponseHelper.js';
import db from '../models/index.js';

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
      customerPhone: req.body.customerPhone,
      customerNote: req.body.customerNote,
      promotionCode: req.body.promotionCode,
      pointsToRedeem: req.body.pointsToRedeem,
      customerId: req.body.customerId
    });

    // Notify staff via Socket.IO
    const io = req.app.locals.io;
    if (io && data.order?.restaurantId) {
      const table = await db.Table.findByPk(data.order.tableId, { attributes: ['tableNumber'] });
      const tableNumber = table?.tableNumber || 'mang về';

      io.to(`restaurant:${data.order.restaurantId}`).emit('order_placed', {
        orderId: data.order.id,
        orderNumber: data.order.orderNumber,
        tableId: data.order.tableId,
        tableNumber,
        restaurantId: data.order.restaurantId,
        itemCount: (data.order.items || []).length
      });
    }

    return successResponse(res, data, 'Order placed successfully', StatusCodes.CREATED);
  } catch (err) {
    return handleServiceError(res, err);
  }
};

// GET /customer/orders/active?restaurantId=1&tableId=1
const getActiveOrder = async (req, res) => {
  try {
    const data = await customerCartService.getActiveOrder({
      sessionId: req.customerSessionId,
      restaurantId: req.query.restaurantId,
      tableId: req.query.tableId
    });

    return successResponse(res, data, 'Active order retrieved successfully');
  } catch (err) {
    return handleServiceError(res, err);
  }
};

// POST /customer/orders/active/items
const addItemToActiveOrder = async (req, res) => {
  try {
    const data = await customerCartService.addItemToActiveOrder({
      sessionId: req.customerSessionId,
      restaurantId: req.body.restaurantId,
      tableId: req.body.tableId,
      itemType: req.body.itemType,
      menuItemId: req.body.menuItemId,
      comboId: req.body.comboId,
      quantity: req.body.quantity,
      specialInstructions: req.body.specialInstructions
    });

    // Fetch table number first to include in socket notifications
    const table = await db.Table.findByPk(data.order.tableId, { attributes: ['tableNumber'] });
    const tableNumber = table?.tableNumber || 'N/A';

    // Notify staff and order room about the new item
    const io = req.app.locals.io;
    if (io && data.order?.restaurantId) {
      // Thông báo tới nhân viên quản lý
      io.to(`restaurant:${data.order.restaurantId}`).emit('order_updated', {
        orderId: data.order.id,
        orderNumber: data.order.orderNumber,
        status: data.order.orderStatus,
        tableId: data.order.tableId,
        tableNumber,
        reason: 'item_added',
        itemName: data.newItem?.itemName || 'món mới'
      });

      // Thông báo tới khách hàng theo dõi đơn
      io.to(`order:${data.order.id}`).emit('item_status_changed', {
        orderId: data.order.id,
        itemId: data.newItem?.id,
        status: 'pending'
      });

      // Thông báo tới nhà bếp
      io.to(`kitchen:${data.order.restaurantId}`).emit('new_order', {
        orderId: data.order.id,
        orderNumber: data.order.orderNumber,
        tableId: data.order.tableId,
        tableNumber,
        reason: 'item_added',
        itemName: data.newItem?.itemName || 'món mới'
      });

      // Thông báo tới nhân viên phục vụ (waiter)
      io.to(`waiter:${data.order.restaurantId}`).emit('order_updated', {
        orderId: data.order.id,
        orderNumber: data.order.orderNumber,
        tableId: data.order.tableId,
        tableNumber,
        reason: 'item_added',
        itemName: data.newItem?.itemName || 'món mới'
      });
    }

    // Lưu notification vào DB
    await db.Notification.create({
      restaurantId: data.order.restaurantId,
      notificationType: 'order_item_added',
      title: 'Khách gọi thêm món',
      message: `Bàn ${tableNumber} (Đơn ${data.order.orderNumber}) vừa gọi thêm: ${data.newItem?.itemName || 'món mới'}.`,
      recipientType: 'staff',
      isRead: false
    });

    return successResponse(res, data, 'Đã thêm món vào đơn hàng', StatusCodes.CREATED);
  } catch (err) {
    return handleServiceError(res, err);
  }
};

// POST /customer/orders/:orderId/request-payment
const requestPayment = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Verify order exists and is active
    const order = await db.Order.findByPk(orderId);
    if (!order) {
      return errorResponse(res, 'Order not found', 'Error', StatusCodes.NOT_FOUND);
    }
    if (['cart', 'completed', 'cancelled'].includes(order.orderStatus)) {
      return errorResponse(res, 'Đơn hàng không ở trạng thái có thể yêu cầu thanh toán', 'Error', StatusCodes.BAD_REQUEST);
    }

    // Save notification in DB
    const table = await db.Table.findByPk(order.tableId, { attributes: ['tableNumber'] });
    const tableNumber = table?.tableNumber || 'N/A';

    // Emit socket event to staff
    const io = req.app.locals.io;
    if (io && order.restaurantId) {
      io.to(`restaurant:${order.restaurantId}`).emit('payment_requested', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        tableId: order.tableId,
        tableNumber,
        timestamp: new Date()
      });
      io.to(`waiter:${order.restaurantId}`).emit('payment_requested', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        tableId: order.tableId,
        tableNumber,
        timestamp: new Date()
      });
    }

    await db.Notification.create({
      restaurantId: order.restaurantId,
      notificationType: 'payment_request',
      title: 'Yêu cầu thanh toán',
      message: `Bàn ${tableNumber} (Đơn ${order.orderNumber}) yêu cầu thanh toán.`,
      recipientType: 'staff',
      isRead: false
    });

    return successResponse(res, { orderId: order.id, orderNumber: order.orderNumber }, 'Đã gửi yêu cầu thanh toán');
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
  placeOrder,
  getActiveOrder,
  addItemToActiveOrder,
  requestPayment
};