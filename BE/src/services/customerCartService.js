import db from '../models/index.js';
import { StatusCodes } from 'http-status-codes';
import { ServiceError } from './serviceError.js';
import { Op } from 'sequelize';

const CART_IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000;

const fallbackOrderNumber = (restaurantId) => `ORD${restaurantId}-${Date.now()}`;

const generateOrderNumberFromDb = async ({ restaurantId, transaction }) => {
  try {
    await db.sequelize.query(
      'CALL sp_generate_order_number(:restaurantId, @p_order_number)',
      {
        replacements: { restaurantId },
        transaction
      }
    );

    const rows = await db.sequelize.query(
      'SELECT @p_order_number AS orderNumber',
      {
        type: db.Sequelize.QueryTypes.SELECT,
        transaction
      }
    );

    const orderNumber = rows?.[0]?.orderNumber;
    if (orderNumber) return orderNumber;
  } catch (error) {
    console.warn('sp_generate_order_number is unavailable, fallback to app-generated order number');
  }

  return fallbackOrderNumber(restaurantId);
};

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

  if (!table) throw new ServiceError('Table not found', StatusCodes.NOT_FOUND);
  if (!table.isActive) throw new ServiceError('Table is not active', StatusCodes.BAD_REQUEST);
  if (String(table.restaurantId) !== String(restaurantId)) {
    throw new ServiceError('Table does not belong to restaurant', StatusCodes.BAD_REQUEST);
  }
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

const ensureCartOwnership = async ({ orderId, sessionId }) => {
  const cart = await db.Order.findByPk(orderId);
  if (!cart) throw new ServiceError('Cart not found', StatusCodes.NOT_FOUND);

  if (cart.orderStatus !== 'cart') {
    throw new ServiceError('Order is not a cart', StatusCodes.BAD_REQUEST);
  }
  if (cart.sessionId !== sessionId) {
    throw new ServiceError('Forbidden: session mismatch', StatusCodes.FORBIDDEN);
  }
  if (isExpired(cart)) {
    await cancelExpiredCart(cart);
    throw new ServiceError('Cart expired', StatusCodes.GONE);
  }

  return cart;
};

const createOrGetCart = async ({ sessionId, isNewSession, restaurantId, tableId }) => {
  if (!restaurantId || !tableId) {
    throw new ServiceError('restaurantId and tableId are required', StatusCodes.BAD_REQUEST);
  }

  await verifyTable(restaurantId, tableId);

  let cart = await db.Order.findOne({
    where: { restaurantId, tableId, sessionId, orderStatus: 'cart' }
  });

  if (cart && isExpired(cart)) {
    await cancelExpiredCart(cart);
    cart = null;
  }

  if (!cart) {
    await db.sequelize.transaction(async (transaction) => {
      const orderNumber = await generateOrderNumberFromDb({ restaurantId, transaction });

      cart = await db.Order.create({
        orderNumber,
        restaurantId,
        tableId,
        sessionId,
        orderStatus: 'cart',
        paymentStatus: 'pending'
      }, {
        transaction
      });
    });
  }

  const fullCart = await loadCartWithItems(cart.id);

  return {
    sessionId,
    isNewSession,
    cart: fullCart
  };
};

const getCart = async ({ sessionId, restaurantId, tableId }) => {
  if (!restaurantId || !tableId) {
    throw new ServiceError('restaurantId and tableId are required', StatusCodes.BAD_REQUEST);
  }

  const cart = await db.Order.findOne({
    where: { restaurantId, tableId, sessionId, orderStatus: 'cart' }
  });

  if (!cart) throw new ServiceError('Cart not found', StatusCodes.NOT_FOUND);

  if (isExpired(cart)) {
    await cancelExpiredCart(cart);
    throw new ServiceError('Cart expired', StatusCodes.GONE);
  }

  const fullCart = await loadCartWithItems(cart.id);
  return { sessionId, cart: fullCart };
};

const resolveOrderItemSource = async ({ itemType, menuItemId, comboId, cartRestaurantId }) => {
  if (!['menu_item', 'combo'].includes(itemType)) {
    throw new ServiceError('Invalid itemType', StatusCodes.BAD_REQUEST);
  }

  if (itemType === 'menu_item') {
    if (!menuItemId) throw new ServiceError('menuItemId is required', StatusCodes.BAD_REQUEST);

    const mi = await db.MenuItem.findByPk(menuItemId);
    if (!mi) throw new ServiceError('Menu item not found', StatusCodes.NOT_FOUND);
    if (!mi.isAvailable) throw new ServiceError('Menu item is not available', StatusCodes.BAD_REQUEST);
    if (String(mi.restaurantId) !== String(cartRestaurantId)) {
      throw new ServiceError('Menu item does not belong to this restaurant', StatusCodes.BAD_REQUEST);
    }

    return {
      menuItemId,
      comboId: null,
      itemName: mi.name,
      unitPrice: mi.discountPrice ?? mi.price
    };
  }

  if (!comboId) throw new ServiceError('comboId is required', StatusCodes.BAD_REQUEST);

  const combo = await db.Combo.findByPk(comboId);
  if (!combo) throw new ServiceError('Combo not found', StatusCodes.NOT_FOUND);
  if (!combo.isAvailable) throw new ServiceError('Combo is not available', StatusCodes.BAD_REQUEST);
  if (String(combo.restaurantId) !== String(cartRestaurantId)) {
    throw new ServiceError('Combo does not belong to this restaurant', StatusCodes.BAD_REQUEST);
  }

  return {
    menuItemId: null,
    comboId,
    itemName: combo.name,
    unitPrice: combo.discountPrice ?? combo.price
  };
};

const addItem = async ({ sessionId, orderId, itemType, menuItemId, comboId, quantity = 1, specialInstructions }) => {
  if (!orderId || !itemType) {
    throw new ServiceError('orderId and itemType are required', StatusCodes.BAD_REQUEST);
  }

  const cart = await ensureCartOwnership({ orderId, sessionId });
  const qty = Math.max(1, parseInt(quantity, 10) || 1);

  const itemSource = await resolveOrderItemSource({
    itemType,
    menuItemId,
    comboId,
    cartRestaurantId: cart.restaurantId
  });

  const normalizedInstructions = (specialInstructions || '').trim() || null;

  const existingItemWhere = {
    orderId: cart.id,
    itemType,
    itemStatus: 'pending',
    menuItemId: itemSource.menuItemId,
    comboId: itemSource.comboId,
    specialInstructions: normalizedInstructions
  };

  let item = await db.OrderItem.findOne({ where: existingItemWhere });

  if (item) {
    const mergedQty = Number(item.quantity || 0) + qty;
    const mergedTotalPrice = Number(itemSource.unitPrice) * mergedQty;

    await item.update({
      itemName: itemSource.itemName,
      unitPrice: itemSource.unitPrice,
      quantity: mergedQty,
      totalPrice: mergedTotalPrice
    });
  } else {
    item = await db.OrderItem.create({
      orderId: cart.id,
      menuItemId: itemSource.menuItemId,
      comboId: itemSource.comboId,
      itemType,
      itemName: itemSource.itemName,
      quantity: qty,
      unitPrice: itemSource.unitPrice,
      totalPrice: Number(itemSource.unitPrice) * qty,
      specialInstructions: normalizedInstructions,
      itemStatus: 'pending'
    });
  }

  await cart.update({ updatedAt: new Date() });
  const cartFull = await loadCartWithItems(cart.id);

  return { sessionId, item, cart: cartFull };
};

const updateItem = async ({ sessionId, id, quantity, specialInstructions }) => {
  const item = await db.OrderItem.findByPk(id, {
    include: [{ model: db.Order, as: 'order' }]
  });
  if (!item) throw new ServiceError('Cart item not found', StatusCodes.NOT_FOUND);

  const cart = item.order;
  if (!cart) throw new ServiceError('Order not found', StatusCodes.NOT_FOUND);

  if (cart.orderStatus !== 'cart') {
    throw new ServiceError('Order is not a cart', StatusCodes.BAD_REQUEST);
  }
  if (cart.sessionId !== sessionId) {
    throw new ServiceError('Forbidden: session mismatch', StatusCodes.FORBIDDEN);
  }
  if (isExpired(cart)) {
    await cancelExpiredCart(cart);
    throw new ServiceError('Cart expired', StatusCodes.GONE);
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
  return { sessionId, item, cart: cartFull };
};

const removeItem = async ({ sessionId, id }) => {
  const item = await db.OrderItem.findByPk(id, {
    include: [{ model: db.Order, as: 'order' }]
  });
  if (!item) throw new ServiceError('Cart item not found', StatusCodes.NOT_FOUND);

  const cart = item.order;
  if (!cart) throw new ServiceError('Order not found', StatusCodes.NOT_FOUND);

  if (cart.orderStatus !== 'cart') {
    throw new ServiceError('Order is not a cart', StatusCodes.BAD_REQUEST);
  }
  if (cart.sessionId !== sessionId) {
    throw new ServiceError('Forbidden: session mismatch', StatusCodes.FORBIDDEN);
  }
  if (isExpired(cart)) {
    await cancelExpiredCart(cart);
    throw new ServiceError('Cart expired', StatusCodes.GONE);
  }

  await item.destroy();
  await cart.update({ updatedAt: new Date() });

  const cartFull = await loadCartWithItems(cart.id);
  return { sessionId, cart: cartFull };
};

/**
 * Chuyển giỏ hàng (cart) thành đơn hàng chính thức (pending).
 * Validate: session đúng, status === 'cart', chưa hết hạn, có ít nhất 1 item.
 */
const placeOrder = async ({ sessionId, orderId, customerName, customerNote, promotionCode, pointsToRedeem, customerId }) => {
  if (!orderId) {
    throw new ServiceError('orderId is required', StatusCodes.BAD_REQUEST);
  }

  // Verify ownership & cart validity
  const cart = await ensureCartOwnership({ orderId, sessionId });

  // Must have at least one item
  const itemCount = await db.OrderItem.count({ where: { orderId: cart.id } });
  if (itemCount === 0) {
    throw new ServiceError('Cannot place an empty order', StatusCodes.BAD_REQUEST);
  }

  await db.sequelize.transaction(async (transaction) => {
    await cart.update({
      orderStatus: 'pending',
      customerName: (customerName || '').trim() || null,
      customerNote: (customerNote || '').trim() || null,
      customerId: customerId || null
    }, { transaction });

    // Try calling the total-calculation stored procedure if it exists
    try {
      await db.sequelize.query(
        'CALL sp_calculate_order_total(:orderId)',
        { replacements: { orderId: cart.id }, transaction }
      );
    } catch {
      // SP optional — if unavailable, totals remain as-is (set by item triggers)
    }

    // Refresh cart to get calculated subtotal and totals
    const currentOrder = await db.Order.findByPk(cart.id, { transaction });
    let currentDiscountAmount = 0;
    
    // Process Points Redemption (1 point = 10,000 VND value? Or 100 VND? Let's use 100 VND per point to keep it clean)
    if (pointsToRedeem && currentOrder.customerId) {
        const customer = await db.Customer.findByPk(currentOrder.customerId, { transaction });
        if (customer && customer.loyaltyPoints >= pointsToRedeem) {
            // Assume 1 point = 100 VND discount for this example.
            const pointsDiscount = Number(pointsToRedeem) * 100;
            currentDiscountAmount += pointsDiscount;
            // Deduct points
            await customer.update({ loyaltyPoints: customer.loyaltyPoints - pointsToRedeem }, { transaction });
        }
    }

    // Process Promotion Code
    if (promotionCode) {
        const promotion = await db.Promotion.findOne({
            where: {
                code: promotionCode,
                restaurantId: cart.restaurantId,
                isActive: true,
                validFrom: { [Op.lte]: new Date() },
                validUntil: { [Op.gte]: new Date() }
            },
            transaction
        });

        if (promotion && (!promotion.usageLimit || promotion.usageCount < promotion.usageLimit)) {
            let promoDiscount = 0;
            const sub = Number(currentOrder.subtotal || 0);
            
            if (!promotion.minOrderAmount || sub >= Number(promotion.minOrderAmount)) {
                if (promotion.discountType === 'percentage') {
                    promoDiscount = (sub * Number(promotion.discountValue)) / 100;
                    if (promotion.maxDiscountAmount && promoDiscount > Number(promotion.maxDiscountAmount)) {
                        promoDiscount = Number(promotion.maxDiscountAmount);
                    }
                } else {
                    promoDiscount = Number(promotion.discountValue);
                }
                
                currentDiscountAmount += promoDiscount;
                
                // Increment promo usage
                await promotion.update({ usageCount: promotion.usageCount + 1 }, { transaction });
                
                // Create PromotionUsage
                await db.PromotionUsage.create({
                    customerId: currentOrder.customerId,
                    promotionId: promotion.id,
                    orderId: currentOrder.id,
                    discountAmount: promoDiscount
                }, { transaction });
            }
        }
    }

    // Update order discount and final total if any discount
    if (currentDiscountAmount > 0) {
        let finalTotal = Number(currentOrder.subtotal || 0) + Number(currentOrder.taxAmount || 0) + Number(currentOrder.serviceCharge || 0) - currentDiscountAmount;
        if (finalTotal < 0) finalTotal = 0;
        await currentOrder.update({
            discountAmount: currentDiscountAmount,
            totalAmount: finalTotal
        }, { transaction });
    }
  });

  const fullOrder = await db.Order.findByPk(cart.id, {
    include: [{
      model: db.OrderItem,
      as: 'items',
      include: [
        { model: db.MenuItem, as: 'menuItem', required: false },
        { model: db.Combo, as: 'combo', required: false }
      ]
    }]
  });

  return { sessionId, order: fullOrder };
};

export default {
  createOrGetCart,
  getCart,
  addItem,
  updateItem,
  removeItem,
  placeOrder
};
