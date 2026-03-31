import db from '../models/index.js';
import { ServiceError } from './serviceError.js';
import { StatusCodes } from 'http-status-codes';

const getPaymentHistory = async (orderId, restaurantId) => {
  const order = await db.Order.findOne({
    where: { id: orderId, restaurantId: restaurantId }
  });
  if (!order) {
    throw new ServiceError('Order not found', StatusCodes.NOT_FOUND);
  }

  const payments = await db.PaymentHistory.findAll({
    where: { orderId: orderId },
    include: [
      {
        model: db.Staff,
        as: 'processor',
        attributes: ['id', 'username', 'fullName', 'role']
      }
    ],
    order: [['created_at', 'DESC']]
  });

  return payments;
}

const createPayment = async (orderId, restaurantId, paymentData, staffId) => {
  const { amount, paymentMethod, transactionId, notes } = paymentData;

  const validMethods = ['cash', 'bank_transfer', 'card', 'e_wallet'];
  if (!validMethods.includes(paymentMethod)) {
    throw new ServiceError('Invalid payment method', StatusCodes.BAD_REQUEST);
  }
  if (!amount || amount <= 0) {
    throw new ServiceError('Valid payment amount required', StatusCodes.BAD_REQUEST);
  }

  // Use a transaction to prevent concurrent double payments
  return await db.sequelize.transaction(async (t) => {
    // Lock the order row to serialize concurrent payment requests
    const order = await db.Order.findOne({
      where: { id: orderId, restaurantId: restaurantId },
      transaction: t,
      lock: true
    });

    if (!order) {
      throw new ServiceError('Order not found', StatusCodes.NOT_FOUND);
    }

    // Only allow payment if the order has been fully served
    if (!['serving', 'completed'].includes(order.orderStatus)) {
      throw new ServiceError(`Chỉ có thể thanh toán khi đơn hàng đã ra bàn (đang ở trạng thái serving hoặc completed). Trạng thái hiện tại: ${order.orderStatus}`, StatusCodes.BAD_REQUEST);
    }

    // Determine if it fully pays off the order
    const existingPayments = await db.PaymentHistory.findAll({ 
      where: { orderId, paymentStatus: 'completed' },
      transaction: t 
    });
    const totalPaidBefore = existingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const remaining = Number(order.totalAmount) - totalPaidBefore;

    // Fixed tolerance for floating point JS math
    if (Number(amount) > remaining + 0.01) {
      throw new ServiceError('Số tiền thanh toán vượt quá số tiền còn nợ của đơn hàng', StatusCodes.BAD_REQUEST);
    }

    const totalPaid = totalPaidBefore + Number(amount);
    
    const payment = await db.PaymentHistory.create({
      orderId,
      amount,
      paymentMethod,
      transactionId,
      notes,
      paymentStatus: 'completed',
      processedBy: staffId
    }, { transaction: t });

    // Update order
    let newPaymentStatus = 'pending';
    if (totalPaid >= Number(order.totalAmount) - 0.01) {
      newPaymentStatus = 'paid';
    }

    await order.update({
      paymentStatus: newPaymentStatus,
      paymentMethod: paymentMethod // stores the latest method
    }, { transaction: t });

    return await db.PaymentHistory.findByPk(payment.id, {
      transaction: t,
      include: [{ model: db.Staff, as: 'processor', attributes: ['id', 'username', 'fullName'] }]
    });
  });
}

export default {
  getPaymentHistory,
  createPayment
};
