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
      // also notify restaurant room
      io.to(`restaurant:${req.staff.restaurantId}`).emit('order_payment_updated', {
        orderId: orderId,
        paymentStatus: 'paid'
      });
    }

    return successResponse(res, payment, 'Payment recorded successfully', StatusCodes.CREATED);
  } catch (error) {
    return handleServiceError(res, error, 'Failed to process payment');
  }
};

export default {
  getPaymentHistory,
  createPayment
};
