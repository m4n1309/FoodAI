import db from '../models/index.js';
import { StatusCodes } from 'http-status-codes';
import { successResponse, errorResponse, notFoundResponse } from '../utils/ResponseHelper.js';

const CART_IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours

const generateOrderNumber = (restaurantId) => `ORD${restaurantId}-${Date.now()}`;

const isExpired = (order) => {
  if (!order?.updatedAt) return false;
  return Date.now() - new Date(order.updatedAt).getTime() > CART_IDLE_TIMEOUT_MS;
};

const cancelExpiredCart = async (order) => {
  await order.update({ orderStatus: 'cancelled', cancelledReason: 'cart_expired' });
};

const verifyTable = async (restaurantId, tableId) => {
  const table = await db.Table.findByPk(tableId, {
    attributes: ['id', 'restaurantId', 'isActive']
  });

  if (!table) return { ok: false, status: StatusCodes.NOT_FOUND, message: 'Table not found' };
  if (!table.isActive) return { ok: false, status: StatusCodes.BAD_REQUEST, message: 'Table is not active' };
  if (String(table.restaurantId) !== String(restaurantId)) {
    return { ok: false, status: StatusCodes.BAD_REQUEST, message: 'Table does not belong to restaurant' };
  }
  return { ok: true, table };
};

const loadCartWithItems = async (cartId) => {
  return db.Order.findByPk(cartId, {
    include: [{
      model: db.OrderItem,
      as: 'items',
      include: [
        { model: db.MenuItem, as: 'menuItem', required: false },
        { model: db.Combo, as: 'combo', required: false }
      ]
    }]
  });
};

// POST /customer/cart
const createOrGetCart = async (req, res) => {
  try {
    const sessionId = req.customerSessionId;
    const { restaurantId, tableId } = req.body;

    if (!restaurantId || !tableId) {
      return errorResponse(res, 'restaurantId and tableId are required', 'Error', StatusCodes.BAD_REQUEST);
    }

    const tableCheck = await verifyTable(restaurantId, tableId);
    if (!tableCheck.ok) return errorResponse(res, tableCheck.message, 'Error', tableCheck.status);

    // Key A: sessionId + restaurantId + tableId
    let cart = await db.Order.findOne({
      where: { restaurantId, tableId, sessionId, orderStatus: 'cart' }
    });

    if (cart && isExpired(cart)) {
      await cancelExpiredCart(cart);
      cart = null;
    }

    if (!cart) {
      cart = await db.Order.create({
        orderNumber: generateOrderNumber(restaurantId),
        restaurantId,
        tableId,
        sessionId,
        orderStatus: 'cart',
        paymentStatus: 'pending'
      });
    }

    const fullCart = await loadCartWithItems(cart.id);

    return successResponse(res, {
      sessionId,
      isNewSession: req.isNewCustomerSession,
      cart: fullCart
    }, 'Cart ready');
  } catch (err) {
    return errorResponse(res, err.message, 'Error', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// GET /customer/cart?restaurantId=1&tableId=1
const getCart = async (req, res) => {
  try {
    const sessionId = req.customerSessionId;
    const { restaurantId, tableId } = req.query;

    if (!restaurantId || !tableId) {
      return errorResponse(res, 'restaurantId and tableId are required', 'Error', StatusCodes.BAD_REQUEST);
    }

    const cart = await db.Order.findOne({
      where: { restaurantId, tableId, sessionId, orderStatus: 'cart' }
    });

    if (!cart) return notFoundResponse(res, 'Cart not found');

    if (isExpired(cart)) {
      await cancelExpiredCart(cart);
      return errorResponse(res, 'Cart expired', 'Error', StatusCodes.GONE);
    }

    const fullCart = await loadCartWithItems(cart.id);
    return successResponse(res, { sessionId, cart: fullCart }, 'Cart retrieved successfully');
  } catch (err) {
    return errorResponse(res, err.message, 'Error', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// POST /customer/cart/items
const addItem = async (req, res) => {
  try {
    const sessionId = req.customerSessionId;
    const { orderId, itemType, menuItemId, comboId, quantity = 1, specialInstructions } = req.body;

    if (!orderId || !itemType) {
      return errorResponse(res, 'orderId and itemType are required', 'Error', StatusCodes.BAD_REQUEST);
    }
    if (!['menu_item', 'combo'].includes(itemType)) {
      return errorResponse(res, 'Invalid itemType', 'Error', StatusCodes.BAD_REQUEST);
    }

    const cart = await db.Order.findByPk(orderId);
    if (!cart) return notFoundResponse(res, 'Cart not found');

    if (cart.orderStatus !== 'cart') {
      return errorResponse(res, 'Order is not a cart', 'Error', StatusCodes.BAD_REQUEST);
    }
    if (cart.sessionId !== sessionId) {
      return errorResponse(res, 'Forbidden: session mismatch', 'Forbidden', StatusCodes.FORBIDDEN);
    }
    if (isExpired(cart)) {
      await cancelExpiredCart(cart);
      return errorResponse(res, 'Cart expired', 'Error', StatusCodes.GONE);
    }

    const qty = Math.max(1, parseInt(quantity, 10) || 1);

    let itemName;
    let unitPrice;

    if (itemType === 'menu_item') {
      if (!menuItemId) return errorResponse(res, 'menuItemId is required', 'Error', StatusCodes.BAD_REQUEST);

      const mi = await db.MenuItem.findByPk(menuItemId);
      if (!mi) return notFoundResponse(res, 'Menu item not found');
      if (!mi.isAvailable) return errorResponse(res, 'Menu item is not available', 'Error', StatusCodes.BAD_REQUEST);
      if (String(mi.restaurantId) !== String(cart.restaurantId)) {
        return errorResponse(res, 'Menu item does not belong to this restaurant', 'Error', StatusCodes.BAD_REQUEST);
      }

      itemName = mi.name;
      unitPrice = mi.discountPrice ?? mi.price;
    } else {
      if (!comboId) return errorResponse(res, 'comboId is required', 'Error', StatusCodes.BAD_REQUEST);

      const combo = await db.Combo.findByPk(comboId);
      if (!combo) return notFoundResponse(res, 'Combo not found');
      if (!combo.isAvailable) return errorResponse(res, 'Combo is not available', 'Error', StatusCodes.BAD_REQUEST);
      if (String(combo.restaurantId) !== String(cart.restaurantId)) {
        return errorResponse(res, 'Combo does not belong to this restaurant', 'Error', StatusCodes.BAD_REQUEST);
      }

      itemName = combo.name;
      unitPrice = combo.discountPrice ?? combo.price;
    }

    const normalizedInstructions = (specialInstructions || '').trim() || null;

    const existingItemWhere = {
      orderId: cart.id,
      itemType,
      itemStatus: 'pending',
      menuItemId: itemType === 'menu_item' ? menuItemId : null,
      comboId: itemType === 'combo' ? comboId : null,
      specialInstructions: normalizedInstructions
    };

    let item = await db.OrderItem.findOne({ where: existingItemWhere });

    if (item) {
      const mergedQty = Number(item.quantity || 0) + qty;
      const mergedTotalPrice = Number(unitPrice) * mergedQty;

      await item.update({
        itemName,
        unitPrice,
        quantity: mergedQty,
        totalPrice: mergedTotalPrice
      });
    } else {
      item = await db.OrderItem.create({
        orderId: cart.id,
        menuItemId: itemType === 'menu_item' ? menuItemId : null,
        comboId: itemType === 'combo' ? comboId : null,
        itemType,
        itemName,
        quantity: qty,
        unitPrice,
        totalPrice: Number(unitPrice) * qty,
        specialInstructions: normalizedInstructions,
        itemStatus: 'pending'
      });
    }

    // touch updatedAt to extend idle timeout
    await cart.update({ updatedAt: new Date() });

    const cartFull = await loadCartWithItems(cart.id);
    return successResponse(res, { sessionId, item, cart: cartFull }, 'Item added to cart', StatusCodes.CREATED);
  } catch (err) {
    return errorResponse(res, err.message, 'Error', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// PATCH /customer/cart/items/:id
const updateItem = async (req, res) => {
  try {
    const sessionId = req.customerSessionId;
    const { id } = req.params;
    const { quantity, specialInstructions } = req.body;

    const item = await db.OrderItem.findByPk(id, {
      include: [{ model: db.Order, as: 'order' }]
    });
    if (!item) return notFoundResponse(res, 'Cart item not found');

    const cart = item.order;
    if (!cart) return notFoundResponse(res, 'Order not found');

    if (cart.orderStatus !== 'cart') {
      return errorResponse(res, 'Order is not a cart', 'Error', StatusCodes.BAD_REQUEST);
    }
    if (cart.sessionId !== sessionId) {
      return errorResponse(res, 'Forbidden: session mismatch', 'Forbidden', StatusCodes.FORBIDDEN);
    }
    if (isExpired(cart)) {
      await cancelExpiredCart(cart);
      return errorResponse(res, 'Cart expired', 'Error', StatusCodes.GONE);
    }

    const qty = quantity != null ? Math.max(1, parseInt(quantity, 10) || 1) : item.quantity;
    const totalPrice = Number(item.unitPrice) * qty;

    await item.update({
      quantity: qty,
      totalPrice,
      specialInstructions: specialInstructions ?? item.specialInstructions
    });

    await cart.update({ updatedAt: new Date() });

    const cartFull = await loadCartWithItems(cart.id);
    return successResponse(res, { sessionId, item, cart: cartFull }, 'Cart item updated successfully');
  } catch (err) {
    return errorResponse(res, err.message, 'Error', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// DELETE /customer/cart/items/:id
const removeItem = async (req, res) => {
  try {
    const sessionId = req.customerSessionId;
    const { id } = req.params;

    const item = await db.OrderItem.findByPk(id, {
      include: [{ model: db.Order, as: 'order' }]
    });
    if (!item) return notFoundResponse(res, 'Cart item not found');

    const cart = item.order;
    if (!cart) return notFoundResponse(res, 'Order not found');

    if (cart.orderStatus !== 'cart') {
      return errorResponse(res, 'Order is not a cart', 'Error', StatusCodes.BAD_REQUEST);
    }
    if (cart.sessionId !== sessionId) {
      return errorResponse(res, 'Forbidden: session mismatch', 'Forbidden', StatusCodes.FORBIDDEN);
    }
    if (isExpired(cart)) {
      await cancelExpiredCart(cart);
      return errorResponse(res, 'Cart expired', 'Error', StatusCodes.GONE);
    }

    await item.destroy();
    await cart.update({ updatedAt: new Date() });

    const cartFull = await loadCartWithItems(cart.id);
    return successResponse(res, { sessionId, cart: cartFull }, 'Cart item removed successfully');
  } catch (err) {
    return errorResponse(res, err.message, 'Error', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export default {
  createOrGetCart,
  getCart,
  addItem,
  updateItem,
  removeItem
};