import customerService from '../services/customerService.js';
import { isServiceError } from '../services/serviceError.js';
import { StatusCodes } from 'http-status-codes';
import {
  successResponse,
  errorResponse
} from '../utils/ResponseHelper.js';
import db from '../models/index.js';

const bootstrap = async (req, res) => {
  try {
    const data = await customerService.bootstrap({
      qrCode: req.query.qrCode,
      sessionId: req.customerSessionId,
      isNewSession: req.isNewCustomerSession
    });

    return successResponse(res, data, 'Bootstrap data retrieved successfully');
  } catch (err) {
    if (isServiceError(err)) {
      return errorResponse(res, err.message, 'Error', err.statusCode);
    }

    return errorResponse(res, err.message, 'Error', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

const checkIn = async (req, res) => {
  try {
    const { phone, fullName } = req.body;
    if (!phone) {
      return errorResponse(res, 'Phone number is required', StatusCodes.BAD_REQUEST);
    }

    let customer = await db.Customer.findOne({ where: { phone } });
    if (!customer) {
      customer = await db.Customer.create({ phone, fullName: fullName || 'Khách hàng' });
    } else if (fullName && customer.fullName !== fullName) {
      await customer.update({ fullName });
    }

    // Save this customer info into the active session's cart in the database
    if (req.customerSessionId) {
      const activeCart = await db.Order.findOne({
        where: { sessionId: req.customerSessionId, orderStatus: 'cart' }
      });
      if (activeCart) {
        await activeCart.update({
          customerId: customer.id,
          customerName: customer.fullName,
          customerPhone: customer.phone
        });
      }
    }

    return successResponse(res, customer, 'Checked in successfully');
  } catch (err) {
    console.error(err);
    return errorResponse(res, 'Failed to check in', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

const getOrderHistory = async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return errorResponse(res, 'Phone number is required', StatusCodes.BAD_REQUEST);
    }

    const customer = await db.Customer.findOne({ where: { phone } });
    if (!customer) {
      return successResponse(res, { customer: null, orders: [] }, 'No customer profile found');
    }

    const orders = await db.Order.findAll({
      where: {
        customerId: customer.id,
        orderStatus: { [db.Sequelize.Op.ne]: 'cart' }
      },
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
      ],
      order: [['created_at', 'DESC']]
    });

    return successResponse(res, {
      customer: {
        id: customer.id,
        fullName: customer.fullName,
        phone: customer.phone,
        loyaltyPoints: customer.loyaltyPoints,
        totalOrders: customer.totalOrders,
        totalSpent: customer.totalSpent
      },
      orders
    }, 'Order history retrieved successfully');
  } catch (err) {
    console.error('Error fetching order history:', err);
    return errorResponse(res, 'Failed to fetch order history', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export default { bootstrap, checkIn, getOrderHistory };