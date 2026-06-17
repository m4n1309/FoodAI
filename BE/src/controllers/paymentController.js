import { StatusCodes } from 'http-status-codes';
import { successResponse, errorResponse, notFoundResponse, forbiddenResponse } from '../utils/ResponseHelper.js';
import { isServiceError } from '../services/serviceError.js';
import paymentService from '../services/paymentService.js';

const handleServiceError = (res, error, fallbackMessage) => {
  if (!isServiceError(error)) {
    console.error(error);
    return errorResponse(res, fallbackMessage, StatusCodes.INTERNAL_SERVER_ERROR);
  }
  if (error.statusCode === StatusCodes.NOT_FOUND) {
    return notFoundResponse(res, error.message);
  }
  if (error.statusCode === StatusCodes.FORBIDDEN) {
    return forbiddenResponse(res, error.message);
  }
  return errorResponse(res, error.message, 'Error', error.statusCode);
};

const getPaymentHistory = async (req, res) => {
  try {
    const { orderId } = req.params;
    const history = await paymentService.getPaymentHistory(orderId, req.staff.restaurantId);
    return successResponse(res, history, 'Fetched payment history');
  } catch (error) {
    return handleServiceError(res, error, 'Failed to fetch payment history');
  }
};

const createPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const payment = await paymentService.createPayment(
      orderId,
      req.staff.restaurantId,
      req.body,
      req.staff.id
    );

    // Notify Customer about payment info
    const io = req.app.locals.io;
    if (io) {
      io.to(`order:${orderId}`).emit('payment_confirmed', {
        paymentId: payment.id,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod
      });
      // notify also table room if order has tableId. We need to fetch order to get tableId first.
      // For simplicity, let's just emit to order room and restaurant room, as they probably want payment confirmed by order.
      // Wait, the requirement says "emit 'payment_confirmed' cho room 'table:3'".
      try {
        const db = (await import('../models/index.js')).default;
        const order = await db.Order.findByPk(orderId);
        if (order) {
          if (order.tableId) {
            io.to(`table:${order.tableId}`).emit('payment_confirmed', {
              paymentId: payment.id,
              amount: payment.amount,
              paymentMethod: payment.paymentMethod,
              orderId: order.id
            });
          }

          let tableNumber = 'mang về';
          if (order.tableId) {
            const table = await db.Table.findByPk(order.tableId, { attributes: ['tableNumber'] });
            tableNumber = table?.tableNumber || 'mang về';
          }

          // also notify restaurant room
          io.to(`restaurant:${req.staff.restaurantId}`).emit('order_payment_updated', {
            orderId: orderId,
            orderNumber: order.orderNumber,
            tableNumber,
            amount: payment.amount,
            paymentStatus: 'paid'
          });
        }
      } catch (err) {
        console.error('Error emitting to table room or restaurant room on payment:', err);
      }
    }

    return successResponse(res, payment, 'Payment recorded successfully', StatusCodes.CREATED);
  } catch (error) {
    return handleServiceError(res, error, 'Failed to process payment');
  }
};

const sepayWebhook = async (req, res) => {
  try {
    const { headers, body } = req;
    const webhookToken = process.env.SEPAY_WEBHOOK_TOKEN;

    // 1. Verify Token
    if (webhookToken && webhookToken !== 'your_sepay_webhook_token_here') {
      const authHeader = headers['authorization'] || '';
      if (!authHeader.includes(webhookToken)) {
        console.warn('SePay Webhook: Invalid token');
        return res.status(401).json({ success: false, message: 'Invalid token' });
      }
    }

    const amountIn = body.transferAmount || body.amountIn;
    const transactionContent = body.content || body.transactionContent;
    const referenceCode = body.referenceCode;

    console.log('SePay Webhook Received:', body, 'amountIn evaluated to:', amountIn);

    // 2. We only care about incoming money
    if (!amountIn || amountIn <= 0 || body.transferType === 'out') {
      return res.status(200).json({ success: true, message: 'Not an incoming transaction' });
    }

    // 3. Extract orderNumber from transactionContent
    // Giả định nội dung CK có chứa mã đơn hàng. Trích xuất các chuỗi liên tục (chữ/số/gạch ngang) từ nội dung CK.
    const potentialOrderNumbers = (transactionContent || '').match(/[A-Za-z0-9-]+/g) || [];
    
    const db = (await import('../models/index.js')).default;
    let order = null;
    
    for (const word of potentialOrderNumbers) {
      if (word.length >= 4) {
        // Many banks strip hyphens, so we normalize both DB orderNumber and the word to remove hyphens
        const normalizedWord = word.replace(/-/g, '');
        order = await db.Order.findOne({ 
          where: db.sequelize.where(
            db.sequelize.fn('REPLACE', db.sequelize.col('order_number'), '-', ''),
            normalizedWord
          )
        });
        if (order) break;
      }
    }

    if (!order) {
      console.warn(`SePay Webhook: No order found for content "${transactionContent}"`);
      return res.status(200).json({ success: true, message: 'Order not found' });
    }

    // 4. Verify Amount
    if (parseFloat(amountIn) < parseFloat(order.totalAmount)) {
      console.warn(`SePay Webhook: Insufficient amount. Expected ${order.totalAmount}, got ${amountIn}`);
      return res.status(200).json({ success: true, message: 'Insufficient amount' });
    }

    // 5. Update Order Status and Payment History
    if (order.paymentStatus !== 'paid') {
      await db.sequelize.transaction(async (t) => {
        order.paymentStatus = 'paid';
        order.paymentMethod = 'bank_transfer';
        await order.save({ transaction: t });

        await db.PaymentHistory.create({
          orderId: order.id,
          amount: amountIn,
          paymentMethod: 'bank_transfer',
          paymentStatus: 'completed',
          transactionId: referenceCode || 'SEPAY',
          notes: `SePay Webhook: ${transactionContent}`
        }, { transaction: t });
      });

      // 6. Notify via Socket.io
      const io = req.app.locals.io;
      if (io) {
        io.to(`order:${order.id}`).emit('payment_confirmed', {
          paymentId: referenceCode,
          amount: amountIn,
          paymentMethod: 'bank_transfer'
        });
        
        if (order.tableId) {
          io.to(`table:${order.tableId}`).emit('payment_confirmed', {
            paymentId: referenceCode,
            amount: amountIn,
            paymentMethod: 'bank_transfer',
            orderId: order.id
          });
        }

        let tableNumber = 'mang về';
        if (order.tableId) {
          const table = await db.Table.findByPk(order.tableId, { attributes: ['tableNumber'] });
          tableNumber = table?.tableNumber || 'mang về';
        }

        io.to(`restaurant:${order.restaurantId}`).emit('order_payment_updated', {
          orderId: order.id,
          orderNumber: order.orderNumber,
          tableNumber,
          amount: amountIn,
          paymentStatus: 'paid'
        });
      }
    }

    return res.status(200).json({ success: true, message: 'Payment processed' });
  } catch (error) {
    console.error('SePay Webhook Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message, stack: error.stack });
  }
};

export default {
  getPaymentHistory,
  createPayment,
  sepayWebhook
};
