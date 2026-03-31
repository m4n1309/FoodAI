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
                loyaltyPoints: (customer.loyaltyPoints || 0) + pointsEarned,
                totalOrders: (customer.totalOrders || 0) + 1,
                totalSpent: Number(customer.totalSpent || 0) + Number(order.totalAmount || 0)
            });
        }
    }
  } else if (status === 'cancelled') {
    updateData.cancelledReason = cancelledReason || 'Cancelled by staff';
  }

  await order.update(updateData);

  // Return fully populated order
  return await getOrderById({ id, restaurantId });
};

export default {
  getAllOrders,
  getOrderById,
  updateOrderStatus
};
