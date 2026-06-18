import { Op } from 'sequelize';
import db from '../models/index.js';
import { StatusCodes } from 'http-status-codes';
import { ServiceError } from './serviceError.js';
import { deleteCache } from '../config/redis.js';

const generateSlug = (name) => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

const ensureStaffRestaurantAccess = (staffRestaurantId, targetRestaurantId, message) => {
  if (String(staffRestaurantId) !== String(targetRestaurantId)) {
    throw new ServiceError(message, StatusCodes.FORBIDDEN);
  }
};

const getAllMenuItems = async (query) => {
  const {
    restaurantId,
    categoryId,
    isAvailable,
    isFeatured,
    isVegetarian,
    isSpicy,
    search,
    minPrice,
    maxPrice,
    sort = 'displayOrder',
    order = 'ASC',
    page = 1,
    limit = 50
  } = query;

  const where = {};

  if (restaurantId) where.restaurantId = restaurantId;
  if (categoryId) where.categoryId = categoryId;
  if (isAvailable !== undefined) where.isAvailable = isAvailable === 'true';
  if (isFeatured !== undefined) where.isFeatured = isFeatured === 'true';
  if (isVegetarian !== undefined) where.isVegetarian = isVegetarian === 'true';
  if (isSpicy !== undefined) where.isSpicy = isSpicy === 'true';

  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price[Op.gte] = minPrice;
    if (maxPrice) where.price[Op.lte] = maxPrice;
  }

  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
      { ingredients: { [Op.like]: `%${search}%` } }
    ];
  }

  const numericPage = parseInt(page, 10);
  const numericLimit = parseInt(limit, 10);
  const offset = (numericPage - 1) * numericLimit;

  const { count, rows: menuItems } = await db.MenuItem.findAndCountAll({
    where,
    include: [{
      model: db.Category,
      as: 'category',
      attributes: ['id', 'name', 'slug']
    }],
    order: [[sort, String(order).toUpperCase()]],
    limit: numericLimit,
    offset
  });

  // Fetch ratings for all menu items
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

  return {
    total: count,
    page: numericPage,
    limit: numericLimit,
    totalPages: Math.ceil(count / numericLimit),
    menuItems: menuItems.map(item => {
      const itemJson = item.toJSON();
      itemJson.rating = ratingMap[item.id] || { avgRating: 0.0, reviewCount: 0 };
      return itemJson;
    })
  };
};

const getMenuItemById = async (id) => {
  const menuItem = await db.MenuItem.findByPk(id, {
    include: [
      {
        model: db.Category,
        as: 'category',
        attributes: ['id', 'name', 'slug']
      },
      {
        model: db.Restaurant,
        as: 'restaurant',
        attributes: ['id', 'name', 'slug']
      }
    ]
  });

  if (!menuItem) {
    throw new ServiceError('Menu item not found', StatusCodes.NOT_FOUND);
  }

  return menuItem;
};

const getFeaturedMenuItems = async ({ restaurantId, limit = 10 }) => {
  const where = {
    isFeatured: true,
    isAvailable: true
  };

  if (restaurantId) where.restaurantId = restaurantId;

  return db.MenuItem.findAll({
    where,
    include: [{
      model: db.Category,
      as: 'category',
      attributes: ['id', 'name', 'slug']
    }],
    order: [['displayOrder', 'ASC']],
    limit: parseInt(limit, 10)
  });
};

const createMenuItem = async ({ body, staffRestaurantId }) => {
  const {
    restaurantId,
    categoryId,
    name,
    description,
    price,
    imageUrl,
    preparationTime,
    calories,
    isVegetarian,
    isSpicy,
    ingredients,
    allergens
  } = body;

  if (!restaurantId || !categoryId || !name || !price) {
    throw new ServiceError('Missing required fields: restaurantId, categoryId, name, price', StatusCodes.BAD_REQUEST);
  }

  ensureStaffRestaurantAccess(
    staffRestaurantId,
    restaurantId,
    'You can only create menu items for your own restaurant'
  );

  const category = await db.Category.findOne({
    where: { id: categoryId, restaurantId }
  });
  if (!category) {
    throw new ServiceError('Category not found in this restaurant', StatusCodes.NOT_FOUND);
  }

  const existingItem = await db.MenuItem.findOne({
    where: { restaurantId, name }
  });
  if (existingItem) {
    throw new ServiceError('A menu item with the same name already exists in this restaurant', StatusCodes.CONFLICT);
  }

  const maxOrder = await db.MenuItem.max('displayOrder', {
    where: { restaurantId, categoryId: categoryId || null }
  });

  const menuItem = await db.MenuItem.create({
    restaurantId,
    categoryId,
    name,
    slug: generateSlug(name),
    description,
    price,
    imageUrl,
    preparationTime,
    calories,
    isVegetarian: isVegetarian || false,
    isSpicy: isSpicy || false,
    ingredients,
    allergens,
    displayOrder: (maxOrder || 0) + 1
  });

  await deleteCache(`restaurant:data:${restaurantId}`);

  return db.MenuItem.findByPk(menuItem.id, {
    include: [{
      model: db.Category,
      as: 'category',
      attributes: ['id', 'name', 'slug']
    }]
  });
};

const updateMenuItem = async ({ id, updateData, staffRestaurantId }) => {
  const menuItem = await db.MenuItem.findByPk(id);
  if (!menuItem) {
    throw new ServiceError('Menu item not found', StatusCodes.NOT_FOUND);
  }

  ensureStaffRestaurantAccess(
    staffRestaurantId,
    menuItem.restaurantId,
    'You can only update menu items for your own restaurant'
  );

  const payload = { ...updateData };

  if (payload.name && payload.name !== menuItem.name) {
    const existingItem = await db.MenuItem.findOne({
      where: {
        restaurantId: menuItem.restaurantId,
        name: payload.name,
        id: { [Op.ne]: id }
      }
    });

    if (existingItem) {
      throw new ServiceError('A menu item with the same name already exists in this restaurant', StatusCodes.CONFLICT);
    }
  }

  if (payload.name) {
    payload.slug = generateSlug(payload.name);
  }

  if (payload.categoryId && payload.categoryId !== menuItem.categoryId) {
    const category = await db.Category.findOne({
      where: {
        id: payload.categoryId,
        restaurantId: menuItem.restaurantId
      }
    });

    if (!category) {
      throw new ServiceError('Category not found in this restaurant', StatusCodes.NOT_FOUND);
    }
  }

  await menuItem.update(payload);

  await deleteCache(`restaurant:data:${menuItem.restaurantId}`);

  return db.MenuItem.findByPk(menuItem.id, {
    include: [{
      model: db.Category,
      as: 'category',
      attributes: ['id', 'name', 'slug']
    }]
  });
};

const deleteMenuItem = async ({ id, staffRestaurantId }) => {
  const menuItem = await db.MenuItem.findByPk(id);
  if (!menuItem) {
    throw new ServiceError('Menu item not found', StatusCodes.NOT_FOUND);
  }

  ensureStaffRestaurantAccess(
    staffRestaurantId,
    menuItem.restaurantId,
    'You can only delete menu items for your own restaurant'
  );

  await menuItem.destroy();
  await deleteCache(`restaurant:data:${menuItem.restaurantId}`);
};

const toggleMenuItemAvailability = async ({ id, staffRestaurantId }) => {
  const menuItem = await db.MenuItem.findByPk(id);
  if (!menuItem) {
    throw new ServiceError('Menu item not found', StatusCodes.NOT_FOUND);
  }

  ensureStaffRestaurantAccess(
    staffRestaurantId,
    menuItem.restaurantId,
    'You can only update menu items for your own restaurant'
  );

  await menuItem.update({ isAvailable: !menuItem.isAvailable });
  await deleteCache(`restaurant:data:${menuItem.restaurantId}`);
  return menuItem;
};

const toggleMenuItemFeatured = async ({ id, staffRestaurantId }) => {
  const menuItem = await db.MenuItem.findByPk(id);
  if (!menuItem) {
    throw new ServiceError('Menu item not found', StatusCodes.NOT_FOUND);
  }

  ensureStaffRestaurantAccess(
    staffRestaurantId,
    menuItem.restaurantId,
    'You can only update menu items for your own restaurant'
  );

  await menuItem.update({ isFeatured: !menuItem.isFeatured });
  await deleteCache(`restaurant:data:${menuItem.restaurantId}`);
  return menuItem;
};

export default {
  getAllMenuItems,
  getMenuItemById,
  getFeaturedMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
  toggleMenuItemFeatured
};