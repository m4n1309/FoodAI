import db from '../models/index.js';
import { StatusCodes } from 'http-status-codes';
import {
  successResponse,
  errorResponse,
  notFoundResponse
} from '../utils/ResponseHelper.js';

const bootstrap = async (req, res) => {
  try {
    const { qrCode } = req.query;

    if (!qrCode) {
      return errorResponse(res, 'qrCode is required', 'Error', StatusCodes.BAD_REQUEST);
    }

    // Reuse logic similar to tableController.getTableByQRCode, but here we aggregate everything.
    // Validate token using your helper
    // NOTE: tableController imports validateQRToken/parseQRToken from qrCodeHelper.js
    const {
      validateQRToken,
      parseQRToken
    } = await import('../utils/qrCodeHelper.js');

    if (!validateQRToken(qrCode)) {
      return errorResponse(res, 'Invalid QR code token', 'Error', StatusCodes.BAD_REQUEST);
    }

    const { restaurantId, tableId } = parseQRToken(qrCode);

    // 1) Load table + restaurant (ensure active)
    const table = await db.Table.findOne({
      where: {
        id: tableId,
        restaurantId,
        qrCode
      },
      include: [{
        model: db.Restaurant,
        as: 'restaurant',
        attributes: [
          'id',
          'name',
          'slug',
          'address',
          'phone',
          'email',
          'description',
          'logoUrl',
          'openingHours',
          'taxRate',
          'serviceChargeRate',
          'bankInfo',
          'isActive'
        ]
      }]
    });

    if (!table) return notFoundResponse(res, 'Table not found');
    if (!table.isActive) {
      return errorResponse(res, 'Table is not active', 'Error', StatusCodes.BAD_REQUEST);
    }
    if (!table.restaurant || !table.restaurant.isActive) {
      return errorResponse(res, 'Restaurant is not active', 'Error', StatusCodes.BAD_REQUEST);
    }

    // 2) Load categories
    const categories = await db.Category.findAll({
      where: {
        restaurantId: table.restaurantId,
        isActive: true
      },
      order: [['displayOrder', 'ASC'], ['id', 'ASC']]
    });

    // 3) Load menu items
    const menuItems = await db.MenuItem.findAll({
      where: {
        restaurantId: table.restaurantId,
        isAvailable: true
      },
      include: [{
        model: db.Category,
        as: 'category',
        attributes: ['id', 'name', 'slug'],
        required: false
      }],
      order: [['displayOrder', 'ASC'], ['id', 'ASC']]
    });

    // 4) Load combos (optional)
    const combos = await db.Combo.findAll({
      where: {
        restaurantId: table.restaurantId,
        isAvailable: true
      },
      include: [{
        model: db.ComboItem,
        as: 'items',
        include: [{
          model: db.MenuItem,
          as: 'menuItem',
          attributes: ['id', 'name', 'price', 'discountPrice', 'imageUrl', 'isAvailable'],
          required: false
        }],
        required: false
      }],
      order: [['id', 'DESC']]
    });

    // optional: identify current active order for the table (if any)
    const isOccupied = await table.isOccupied?.();
    const currentOrder = isOccupied ? await table.getCurrentOrder?.() : null;

    return successResponse(res, {
      sessionId: req.customerSessionId,
      isNewSession: req.isNewCustomerSession,
      table: {
        id: table.id,
        restaurantId: table.restaurantId,
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        location: table.location,
        status: table.status,
        qrCode: table.qrCode
      },
      restaurant: table.restaurant,
      currentOrder: currentOrder ? {
        id: currentOrder.id,
        orderNumber: currentOrder.orderNumber,
        orderStatus: currentOrder.orderStatus
      } : null,
      categories,
      menuItems,
      combos
    }, 'Bootstrap data retrieved successfully');
  } catch (err) {
    return errorResponse(res, err.message, 'Error', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export default { bootstrap };