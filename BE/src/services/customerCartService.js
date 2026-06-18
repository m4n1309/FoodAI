import db from '../models/index.js';
import { StatusCodes } from 'http-status-codes';
import { ServiceError } from './serviceError.js';
import { Op } from 'sequelize';
import { getCache, setCache, deleteCache } from '../config/redis.js';

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
  await deleteCache(`cart:items:${order.id}`);
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
  const cacheKey = `cart:items:${cartId}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const cart = await db.Order.findByPk(cartId, {
    include: [{
      model: db.OrderItem,
      as: 'items',
      include: [
        { model: db.MenuItem, as: 'menuItem', required: false },
        { model: db.Combo, as: 'combo', required: false }
      ]
    }]
  });

  if (cart) {
    await setCache(cacheKey, cart, 7200); // 2 hours matching CART_IDLE_TIMEOUT_MS
  }
  return cart;
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
  await deleteCache(`cart:items:${cart.id}`);
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
  await deleteCache(`cart:items:${cart.id}`);

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
  await deleteCache(`cart:items:${cart.id}`);

  const cartFull = await loadCartWithItems(cart.id);
  return { sessionId, cart: cartFull };
};

/**
 * Chuyển giỏ hàng (cart) thành đơn hàng chính thức (pending).
 * Validate: session đúng, status === 'cart', chưa hết hạn, có ít nhất 1 item.
 */
const placeOrder = async ({ sessionId, orderId, customerName, customerPhone, customerNote, promotionCode, pointsToRedeem, customerId }) => {
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

  const phone = (customerPhone || '').trim();
  const name = (customerName || '').trim();

  if (!name) {
    throw new ServiceError('Tên khách hàng là bắt buộc', StatusCodes.BAD_REQUEST);
  }
  if (!phone) {
    throw new ServiceError('Số điện thoại khách hàng là bắt buộc', StatusCodes.BAD_REQUEST);
  }
  if (!/^[0-9+ ]{9,15}$/.test(phone)) {
    throw new ServiceError('Số điện thoại không hợp lệ', StatusCodes.BAD_REQUEST);
  }

  let finalCustomerId = customerId;
  let customer = await db.Customer.findOne({ where: { phone } });
  if (!customer) {
    customer = await db.Customer.create({ phone, fullName: name });
  } else if (customer.fullName !== name) {
    await customer.update({ fullName: name });
  }
  finalCustomerId = customer.id;

  await db.sequelize.transaction(async (transaction) => {
    await cart.update({
      orderStatus: 'pending',
      customerName: name || null,
      customerPhone: phone || null,
      customerNote: (customerNote || '').trim() || null,
      customerId: finalCustomerId || null
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

  await deleteCache(`cart:items:${cart.id}`);

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

const getActiveOrder = async ({ sessionId, restaurantId, tableId }) => {
  if (!restaurantId || !tableId) {
    throw new ServiceError('restaurantId and tableId are required', StatusCodes.BAD_REQUEST);
  }

  const activeOrder = await db.Order.findOne({
    where: {
      restaurantId,
      tableId,
      orderStatus: {
        [db.Sequelize.Op.notIn]: ['cart', 'completed', 'cancelled']
      }
    },
    include: [{
      model: db.OrderItem,
      as: 'items',
      include: [
        { model: db.MenuItem, as: 'menuItem', required: false },
        { model: db.Combo, as: 'combo', required: false }
      ]
    }],
    order: [['created_at', 'DESC']]
  });

  if (!activeOrder) {
    return { sessionId, order: null };
  }

  const orderObj = activeOrder.toJSON();
  // Nếu session ID của khách không trùng với session ID tạo đơn (hoặc đơn do nhân viên tạo có session_id = null)
  // thì ẩn các thông tin nhạy cảm của khách
  if (orderObj.sessionId !== sessionId) {
    if (orderObj.customerPhone && orderObj.customerPhone.length >= 6) {
      const len = orderObj.customerPhone.length;
      orderObj.customerPhone = orderObj.customerPhone.slice(0, 3) + '*'.repeat(len - 6) + orderObj.customerPhone.slice(len - 3);
    } else if (orderObj.customerPhone) {
      orderObj.customerPhone = '***';
    }
    orderObj.customerNote = null;
  }

  return { sessionId, order: orderObj };
};

/**
 * Thêm món vào đơn đang hoạt động của bàn (không tạo đơn mới).
 * Dùng khi khách đã đặt đơn rồi nhưng muốn gọi thêm.
 */
const addItemToActiveOrder = async ({ sessionId, restaurantId, tableId, itemType, menuItemId, comboId, quantity = 1, specialInstructions }) => {
  if (!restaurantId || !tableId) {
    throw new ServiceError('restaurantId and tableId are required', StatusCodes.BAD_REQUEST);
  }
  if (!itemType) {
    throw new ServiceError('itemType is required', StatusCodes.BAD_REQUEST);
  }

  // Tìm đơn active của bàn
  const activeOrder = await db.Order.findOne({
    where: {
      restaurantId,
      tableId,
      orderStatus: {
        [Op.notIn]: ['cart', 'completed', 'cancelled']
      }
    },
    order: [['created_at', 'DESC']]
  });

  if (!activeOrder) {
    throw new ServiceError('Không tìm thấy đơn hàng đang hoạt động tại bàn này', StatusCodes.NOT_FOUND);
  }

  const qty = Math.max(1, parseInt(quantity, 10) || 1);

  const itemSource = await resolveOrderItemSource({
    itemType,
    menuItemId,
    comboId,
    cartRestaurantId: activeOrder.restaurantId
  });

  const normalizedInstructions = (specialInstructions || '').trim() || null;

  // Check if same item already exists with pending status & same instructions
  const existingItemWhere = {
    orderId: activeOrder.id,
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
      orderId: activeOrder.id,
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

  // Recalculate order total
  try {
    await db.sequelize.query(
      'CALL sp_calculate_order_total(:orderId)',
      { replacements: { orderId: activeOrder.id } }
    );
  } catch (err) {
    console.error('sp_calculate_order_total failed in addItemToActiveOrder:', err);
  }

  let newOrderStatus = activeOrder.orderStatus;
  if (['ready', 'serving'].includes(activeOrder.orderStatus)) {
    newOrderStatus = 'preparing';
  }

  await activeOrder.update({
    orderStatus: newOrderStatus,
    updatedAt: new Date()
  });

  // Return updated order with all items
  const fullOrder = await db.Order.findByPk(activeOrder.id, {
    include: [{
      model: db.OrderItem,
      as: 'items',
      include: [
        { model: db.MenuItem, as: 'menuItem', required: false },
        { model: db.Combo, as: 'combo', required: false }
      ]
    }]
  });

  return { sessionId, order: fullOrder, newItem: item };
};

export default {
  createOrGetCart,
  getCart,
  addItem,
  updateItem,
  removeItem,
  placeOrder,
  getActiveOrder,
  addItemToActiveOrder
};
