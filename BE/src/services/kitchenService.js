import db from '../models/index.js';
import { StatusCodes } from 'http-status-codes';
import { ServiceError } from './serviceError.js';
import { Op } from 'sequelize';
import orderService from './orderService.js';

const getActiveOrders = async ({ restaurantId }) => {
  // Kitchen only cares about orders that are confirmed or preparing
  const { rows } = await db.Order.findAndCountAll({
    where: {
      restaurantId,
      orderStatus: { [Op.in]: ['confirmed', 'preparing'] }
    },
    order: [['created_at', 'ASC']], // Khách đặt trước thì nằm trên
    distinct: true,
    include: [
      {
        model: db.Table,
        as: 'table'
      },
      {
        model: db.OrderItem,
        as: 'items',
        where: {
          itemStatus: { [Op.in]: ['pending', 'preparing', 'ready'] } 
          // Kitchen needs to see ready items too sometimes, or just preparing/pending.
        },
        required: true, // Only fetch orders that actually have items needing kitchen attention
        include: [
          { model: db.MenuItem, as: 'menuItem', required: false },
          { model: db.Combo, as: 'combo', required: false }
        ]
      }
    ]
  });

  return rows;
};

const updateItemStatus = async ({ itemId, restaurantId, status, staffId }) => {
  const validStatuses = ['pending', 'preparing', 'ready', 'served', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new ServiceError('Invalid item status', StatusCodes.BAD_REQUEST);
  }

  const orderItem = await db.OrderItem.findOne({
    where: { id: itemId },
    include: [{ model: db.Order, as: 'order', where: { restaurantId } }]
  });

  if (!orderItem) {
    throw new ServiceError('Item not found', StatusCodes.NOT_FOUND);
  }

  // Update item
  const updateData = { itemStatus: status };
  if (status === 'preparing' || status === 'ready') {
    updateData.preparedBy = staffId;
    if (status === 'ready') updateData.preparedAt = new Date();
  }
  
  await orderItem.update(updateData);

  const orderId = orderItem.orderId;
  const order = orderItem.order;

  // Auto update Order Status based on Items
  const allItems = await db.OrderItem.findAll({ where: { orderId } });
  
  const hasPreparing = allItems.some(i => i.itemStatus === 'preparing');
  const allReadyOrServed = allItems.every(i => ['ready', 'served', 'cancelled'].includes(i.itemStatus));
  // Not counting cancelled items towards "not ready". If all items are cancelled, wait, that's an edge case.
  const hasActiveItems = allItems.some(i => i.itemStatus !== 'cancelled');

  let newOrderStatus = order.orderStatus;
  if (hasActiveItems) {
    if (allReadyOrServed && ['pending', 'confirmed', 'preparing'].includes(order.orderStatus)) {
      newOrderStatus = 'ready'; // All items are ready
    } else if (status === 'preparing' && ['pending', 'confirmed'].includes(order.orderStatus)) {
      newOrderStatus = 'preparing'; // Someone started preparing at least one item
    }
  }

  if (newOrderStatus !== order.orderStatus) {
    await orderService.updateOrderStatus({
      id: orderId,
      restaurantId,
      status: newOrderStatus,
      staffId
    });
  }

  // Return updated item fully loaded
  return await db.OrderItem.findOne({
    where: { id: itemId },
    include: [
      { model: db.MenuItem, as: 'menuItem', required: false },
      { model: db.Combo, as: 'combo', required: false }
    ]
  });
};

export default {
  getActiveOrders,
  updateItemStatus
};
