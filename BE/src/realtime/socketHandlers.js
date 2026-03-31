import db from '../models/index.js';

export const initSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    // customer join order room
    socket.on('join_order', async ({ orderId, sessionId }) => {
      try {
        if (!orderId || !sessionId) {
          socket.emit('join_order_error', { message: 'orderId and sessionId are required' });
          return;
        }

        const order = await db.Order.findByPk(orderId, {
          attributes: ['id', 'sessionId', 'orderStatus']
        });

        if (!order) {
          socket.emit('join_order_error', { message: 'Order not found' });
          return;
        }

        if (order.sessionId !== sessionId) {
          socket.emit('join_order_error', { message: 'Forbidden: session mismatch' });
          return;
        }

        const room = `order:${orderId}`;
        socket.join(room);

        socket.emit('join_order_success', { orderId, room, orderStatus: order.orderStatus });
      } catch (err) {
        socket.emit('join_order_error', { message: err.message || 'Join failed' });
      }
    });

    socket.on('leave_order', ({ orderId }) => {
      if (!orderId) return;
      socket.leave(`order:${orderId}`);
    });

    // staff join restaurant room to receive order_placed events
    socket.on('join_restaurant', ({ restaurantId }) => {
      if (!restaurantId) {
        socket.emit('join_restaurant_error', { message: 'restaurantId is required' });
        return;
      }
      const room = `restaurant:${restaurantId}`;
      socket.join(room);
      socket.emit('join_restaurant_success', { restaurantId, room });
    });

    socket.on('leave_restaurant', ({ restaurantId }) => {
      if (!restaurantId) return;
      socket.leave(`restaurant:${restaurantId}`);
    });

    // Role-specific rooms (staff roles)
    socket.on('join_role_room', ({ restaurantId, role }) => {
      // role can be 'kitchen', 'waiter', etc.
      if (!restaurantId || !role) {
        socket.emit('join_role_error', { message: 'restaurantId and role are required' });
        return;
      }
      const room = `${role}:${restaurantId}`;
      socket.join(room);
      socket.emit('join_role_success', { restaurantId, role, room });
    });

    socket.on('leave_role_room', ({ restaurantId, role }) => {
      if (!restaurantId || !role) return;
      socket.leave(`${role}:${restaurantId}`);
    });

    // Table specific rooms for customers to receive generic updates for their table
    socket.on('join_table', ({ tableId }) => {
      if (!tableId) return;
      const room = `table:${tableId}`;
      socket.join(room);
      socket.emit('join_table_success', { tableId, room });
    });

    socket.on('leave_table', ({ tableId }) => {
       if (!tableId) return;
       socket.leave(`table:${tableId}`);
    });
  });
};