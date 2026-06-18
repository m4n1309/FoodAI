import db from '../models/index.js';
import { StatusCodes } from 'http-status-codes';
import { ServiceError } from './serviceError.js';
import { validateQRToken, parseQRToken } from '../utils/qrCodeHelper.js';
import { getCache, setCache } from '../config/redis.js';

const bootstrap = async ({ qrCode, sessionId, isNewSession }) => {
  if (!qrCode) {
    throw new ServiceError('qrCode is required', StatusCodes.BAD_REQUEST);
  }

  if (!validateQRToken(qrCode)) {
    throw new ServiceError('Invalid QR code token', StatusCodes.BAD_REQUEST);
  }

  const { restaurantId, tableId } = parseQRToken(qrCode);

  const table = await db.Table.findOne({
    where: {
      id: tableId,
      restaurantId,
    },
    include: [{
      model: db.Restaurant,
      as: 'restaurant',
      attributes: ['id', 'name', 'slug', 'isActive', 'logoUrl', 'bannerUrl', 'address', 'phone']
    }]
  });

  if (!table) {
    throw new ServiceError('Table not found', StatusCodes.NOT_FOUND);
  }
  if (!table.isActive) {
    throw new ServiceError('Table is not active', StatusCodes.BAD_REQUEST);
  }
  if (!table.restaurant || !table.restaurant.isActive) {
    throw new ServiceError('Restaurant is not active', StatusCodes.BAD_REQUEST);
  }

  const cacheKey = `restaurant:data:${table.restaurantId}`;
  let cachedData = await getCache(cacheKey);

  let categories, menuItems, combos, restaurant;

  if (cachedData) {
    categories = cachedData.categories;
    menuItems = cachedData.menuItems;
    combos = cachedData.combos;
    restaurant = cachedData.restaurant;
  } else {
    categories = await db.Category.findAll({
      where: {
        restaurantId: table.restaurantId,
        isActive: true
      },
      order: [['displayOrder', 'ASC'], ['id', 'ASC']]
    });

    const dbMenuItems = await db.MenuItem.findAll({
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

    // Fetch ratings for all menu items in this restaurant
    const ratings = await db.MenuItemReview.findAll({
      attributes: [
        'menuItemId',
        [db.sequelize.fn('AVG', db.sequelize.col('rating')), 'avgRating'],
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'reviewCount']
      ],
      group: ['menuItemId'],
      raw: true
    });

    const ratingMap = {};
    ratings.forEach(r => {
      ratingMap[r.menuItemId] = {
        avgRating: parseFloat(Number(r.avgRating || 0).toFixed(1)),
        reviewCount: parseInt(r.reviewCount || 0, 10)
      };
    });

    menuItems = dbMenuItems.map(item => {
      const itemJson = item.toJSON ? item.toJSON() : { ...item };
      itemJson.rating = ratingMap[item.id] || { avgRating: 0.0, reviewCount: 0 };
      return itemJson;
    });

    combos = await db.Combo.findAll({
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

    restaurant = table.restaurant;

    // Cache the data for 10 minutes (600 seconds)
    await setCache(cacheKey, { categories, menuItems, combos, restaurant }, 600);
  }

  const isOccupied = await table.isOccupied?.();
  const currentOrder = isOccupied ? await table.getCurrentOrder?.() : null;

  return {
    sessionId,
    isNewSession,
    table: {
      id: table.id,
      restaurantId: table.restaurantId,
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      location: table.location,
      status: table.status,
      qrCode: table.qrCode
    },
    restaurant,
    currentOrder: currentOrder ? {
      id: currentOrder.id,
      orderNumber: currentOrder.orderNumber,
      orderStatus: currentOrder.orderStatus
    } : null,
    categories,
    menuItems,
    combos
  };
};

export default {
  bootstrap
};
