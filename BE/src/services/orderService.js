import db from '../models/index.js';
import { StatusCodes } from 'http-status-codes';
import { ServiceError } from './serviceError.js';
import { Op } from 'sequelize';

const getAllOrders = async ({ restaurantId, page = 1, limit = 10, status, search, location }) => {
  const offset = (page - 1) * limit;

  // Build where clause for Order
  const where = {
    restaurantId,
    // by default, we don't show 'cart' orders to staff, only placed orders
    orderStatus: { [Op.ne]: 'cart' }
  };

  if (status && status !== 'all') {
    where.orderStatus = status;
  }

  if (search) {
    where[Op.or] = [
      { orderNumber: { [Op.like]: `%${search}%` } },
      { customerName: { [Op.like]: `%${search}%` } }
    ];
  }

  // Build where clause for Table
  const tableWhere = {};
  if (location && location !== 'all') {
    tableWhere.location = location;
  }

  const { count, rows } = await db.Order.findAndCountAll({
    where,
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10),
    order: [['created_at', 'DESC']],
    distinct: true, // important when using includes with hasMany
    include: [
      {
        model: db.Table,
        as: 'table',
        where: Object.keys(tableWhere).length > 0 ? tableWhere : undefined,
        required: Object.keys(tableWhere).length > 0
      },
      {
        model: db.OrderItem,
        as: 'items',
        include: [
          { model: db.MenuItem, as: 'menuItem', required: false },
          { model: db.Combo, as: 'combo', required: false }
        ]
      }
    ]
  });

  return {
    total: count,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    totalPages: Math.ceil(count / limit),
    orders: rows
  };
};

const getOrderById = async ({ id, restaurantId }) => {
  const order = await db.Order.findOne({
    where: { id, restaurantId, orderStatus: { [Op.ne]: 'cart' } },
    include: [
      { model: db.Table, as: 'table' },
      {
        model: db.OrderItem,
        as: 'items',
        include: [
          { model: db.MenuItem, as: 'menuItem', required: false },
          { model: db.Combo, as: 'combo', required: false }
        ]
      }
    ]
  });

  if (!order) {
    throw new ServiceError('Order not found', StatusCodes.NOT_FOUND);
  }

  return order;
};

const updateOrderStatus = async ({ id, restaurantId, status, cancelledReason, staffId }) => {
  const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'serving', 'completed', 'cancelled'];
  
  if (!validStatuses.includes(status)) {
    throw new ServiceError('Invalid order status', StatusCodes.BAD_REQUEST);
  }

  const order = await db.Order.findOne({
    where: { id, restaurantId }
  });

  if (!order) {
    throw new ServiceError('Order not found', StatusCodes.NOT_FOUND);
  }

  if (order.orderStatus === 'cart') {
    throw new ServiceError('Cannot update status of a cart order', StatusCodes.BAD_REQUEST);
  }

  const updateData = { orderStatus: status, staffId };

  if (status === 'completed') {
    updateData.completedAt = new Date();
    
    // Update Customer loyalty points if order has a customer
    if (order.customerId && order.orderStatus !== 'completed') {
        const customer = await db.Customer.findByPk(order.customerId);
        if (customer) {
            // Calculate points: 1 point per 10,000 VND spent
            const pointsEarned = Math.floor(Number(order.totalAmount || 0) / 10000);
            
            await customer.update({
                loyaltyPoints: (customer.loyaltyPoints || 0) + pointsEarned
            });
        }
    }
  } else if (status === 'cancelled') {
    updateData.cancelledReason = cancelledReason || 'Cancelled by staff';
  }

  await order.update(updateData);

  // Return fully populated order
  return await getOrderById({ id: order.id, restaurantId });
};

const createOrder = async ({ restaurantId, tableId, customerName, customerPhone, items, staffId }) => {
  if (!tableId) {
    throw new ServiceError('Mã bàn ăn (tableId) là bắt buộc', StatusCodes.BAD_REQUEST);
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ServiceError('Danh sách món ăn không được để trống', StatusCodes.BAD_REQUEST);
  }

  // 1. Verify table access
  const table = await db.Table.findOne({
    where: { id: tableId, restaurantId }
  });
  if (!table) {
    throw new ServiceError('Bàn ăn không tồn tại hoặc không thuộc nhà hàng của bạn', StatusCodes.NOT_FOUND);
  }

  // 2. Validate/Create customer profile
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

  let customer = await db.Customer.findOne({ where: { phone } });
  if (!customer) {
    customer = await db.Customer.create({ phone, fullName: name });
  } else if (customer.fullName !== name) {
    await customer.update({ fullName: name });
  }

  // 3. Generate order number
  let orderNumber;
  try {
    await db.sequelize.query(
      'CALL sp_generate_order_number(:restaurantId, @p_order_number)',
      { replacements: { restaurantId } }
    );
    const rows = await db.sequelize.query(
      'SELECT @p_order_number AS orderNumber',
      { type: db.Sequelize.QueryTypes.SELECT }
    );
    orderNumber = rows?.[0]?.orderNumber;
  } catch {
    orderNumber = `ORD${restaurantId}-${Date.now()}`;
  }

  if (!orderNumber) {
    orderNumber = `ORD${restaurantId}-${Date.now()}`;
  }

  let order;
  await db.sequelize.transaction(async (transaction) => {
    // 4. Create Order
    order = await db.Order.create({
      orderNumber,
      restaurantId,
      tableId,
      customerId: customer.id,
      customerName: name,
      customerPhone: phone,
      orderStatus: 'confirmed', // Staff placed orders are automatically confirmed
      paymentStatus: 'pending',
      staffId
    }, { transaction });

    // 5. Create Order Items
    for (const item of items) {
      let itemName = '';
      let unitPrice = 0;
      if (item.menuItemId) {
        const mi = await db.MenuItem.findByPk(item.menuItemId, { transaction });
        if (!mi) throw new ServiceError(`Món ăn ID ${item.menuItemId} không tồn tại`, StatusCodes.NOT_FOUND);
        itemName = mi.name;
        unitPrice = mi.discountPrice ?? mi.price;
      } else if (item.comboId) {
        const combo = await db.Combo.findByPk(item.comboId, { transaction });
        if (!combo) throw new ServiceError(`Combo ID ${item.comboId} không tồn tại`, StatusCodes.NOT_FOUND);
        itemName = combo.name;
        unitPrice = combo.discountPrice ?? combo.price;
      } else {
        throw new ServiceError('Mỗi chi tiết phải chỉ định menuItemId hoặc comboId', StatusCodes.BAD_REQUEST);
      }

      await db.OrderItem.create({
        orderId: order.id,
        menuItemId: item.menuItemId || null,
        comboId: item.comboId || null,
        itemType: item.menuItemId ? 'menu_item' : 'combo',
        itemName,
        quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
        unitPrice,
        totalPrice: Number(unitPrice) * Math.max(1, parseInt(item.quantity, 10) || 1),
        specialInstructions: item.specialInstructions ? String(item.specialInstructions).trim() : null,
        itemStatus: 'pending'
      }, { transaction });
    }

    // 6. Call Stored Procedure to Calculate Totals
    try {
      await db.sequelize.query(
        'CALL sp_calculate_order_total(:orderId)',
        { replacements: { orderId: order.id }, transaction }
      );
    } catch (err) {
      console.error('Failed to run sp_calculate_order_total:', err);
    }

    // 7. Update table status to occupied
    await table.update({ status: 'occupied' }, { transaction });
  });

  return await getOrderById({ id: order.id, restaurantId });
};

export default {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  createOrder
};
