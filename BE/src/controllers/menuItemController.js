import db from '../models/index.js';
import {
  successResponse,
  errorResponse,
  forbiddenResponse,
  notFoundResponse
} from '../utils/ResponseHelper.js';
import { StatusCodes } from 'http-status-codes';
import { Op } from 'sequelize';

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

const getAllMenuItems = async (req, res) => {
  try {

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
    } = req.query;

    console.log('📋 Get all menu items');
    console.log('   Filters:', { restaurantId, categoryId, isAvailable, search });

    const where = {}

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
      where.name = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { ingredients: { [Op.iLike]: `%${search}%` } }
      ]
    }
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: menuItems } = await db.MenuItem.findAndCountAll({
      where,
      include: [
        {
          model: db.Category,
          as: 'category',
          attributes: ['id', 'name', 'slug']
        }
      ],
      order: [[sort, order.toUpperCase()]],
      limit: parseInt(limit),
      offset: offset
    })

    return successResponse(res, {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / parseInt(limit)),
      menuItems
    }, 'Menu items retrieved successfully');


  } catch (error) {
    console.error('Error occurred while fetching menu items:', error);
    return errorResponse(res, 'Failed to retrieve menu items', StatusCodes.INTERNAL_SERVER_ERROR);
  }
}

const getMenuItemById = async (req, res) => {
  try {

    const { id } = req.params;

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
    })

    if (!menuItem) {
      return notFoundResponse(res, 'Menu item not found');
    }

    return successResponse(res, menuItem, 'Menu item retrieved successfully');

  } catch (error) {
    console.error('Error occurred while fetching menu item:', error);
    return errorResponse(res, 'Failed to retrieve menu item', StatusCodes.INTERNAL_SERVER_ERROR);
  }
}

const getFeaturedMenuItems = async (req, res) => {
  try {

    const { restaurantId, limit = 10 } = req.query;

    const where = {
      isFeatured: true,
      isAvailable: true
    }

    if (restaurantId) where.restaurantId = restaurantId;

    const menuItems = await db.MenuItem.findAll({
      where,
      include: [{
        model: db.Category,
        as: 'category',
        attributes: ['id', 'name', 'slug']
      }
      ],
      order: [['displayOrder', 'ASC']],
      limit: parseInt(limit)
    })

    return successResponse(res, menuItems, 'Featured menu items retrieved successfully');

  } catch (error) {
    console.error('Error occurred while fetching featured menu items:', error);
    return errorResponse(res, 'Failed to retrieve featured menu items', StatusCodes.INTERNAL_SERVER_ERROR);
  }
}

const createMenuItem = async (req, res) => {
  try {

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
      allergens,
    } = req.body;

    if (!restaurantId || !categoryId || !name || !price) {
      return errorResponse(res, 'Missing required fields: restaurantId, categoryId, name, price', StatusCodes.BAD_REQUEST);
    }

    if (req.staff.restaurantId !== restaurantId) {
      return forbiddenResponse(res, 'You can only create menu items for your own restaurant');
    }

    if (categoryId) {
      const category = await db.Category.findOne({
        where: {
          id: categoryId,
          restaurantId
        }
      })
      if (!category) {
        return notFoundResponse(res, 'Category not found in this restaurant');
      }
    }

    const slug = generateSlug(name);
    const existingItem = await db.MenuItem.findOne({
      where: {
        restaurantId,
        name
      }
    })

    if (existingItem) {
      return errorResponse(res, 'A menu item with the same name already exists in this restaurant', StatusCodes.CONFLICT);
    }

    const maxOder = await db.MenuItem.max('displayOrder', {
      where: { restaurantId, categoryId: categoryId || null }
    })

    const menuItem = await db.MenuItem.create({
      restaurantId,
      categoryId,
      name,
      slug,
      description,
      price,
      imageUrl,
      preparationTime,
      calories,
      isVegetarian: isVegetarian || false,
      isSpicy: isSpicy || false,
      ingredients,
      allergens,
      displayOrder: maxOder + 1
    })

    const createdItem = await db.MenuItem.findByPk(menuItem.id, {
      include: [{
        model: db.Category,
        as: 'category',
        attributes: ['id', 'name', 'slug']
      }]
    })

    return successResponse(res, createdItem, 'Menu item created successfully');

  } catch (error) {
    console.error('Error occurred while creating menu item:', error);
    return errorResponse(res, 'Failed to create menu item', StatusCodes.INTERNAL_SERVER_ERROR);
  }
}

const updateMenuItem = async (req, res) => {
  try {

    const { id } = req.params
    const updateData = req.body;

    const menuItem = await db.MenuItem.findByPk(id)

    if (!menuItem) {
      return notFoundResponse(res, 'Menu item not found');
    }

    if (req.staff.restaurantId !== menuItem.restaurantId) {
      return forbiddenResponse(res, 'You can only update menu items for your own restaurant');
    }

    if (updateData.name && updateData.name !== menuItem.name) {
      const existingItem = await db.MenuItem.findOne({
        where: {
          restaurantId: menuItem.restaurantId,
          name: updateData.name,
          id: { [Op.ne]: id }
        }
      })
      if (existingItem) {
        return errorResponse(res, 'A menu item with the same name already exists in this restaurant', StatusCodes.CONFLICT);
      }
    }

    if (updateData.name) {
      updateData.slug = generateSlug(updateData.name);
    }

    if (updateData.categoryId && updateData.categoryId !== menuItem.categoryId) {
      const category = await db.Category.findOne({
        where: {
          id: updateData.categoryId,
          restaurantId: menuItem.restaurantId
        }
      })
      if (!category) {
        return notFoundResponse(res, 'Category not found in this restaurant');
      }
    }

    await menuItem.update(updateData);

    const updatedItem = await db.MenuItem.findByPk(menuItem.id, {
      include: [{
        model: db.Category,
        as: 'category',
        attributes: ['id', 'name', 'slug']
      }]
    })

    return successResponse(res, updatedItem, 'Menu item updated successfully');

  } catch (error) {
    return errorResponse(res, error.message || 'Failed to update menu item', StatusCodes.INTERNAL_SERVER_ERROR);
  }
}

const deleteMenuItem = async (req, res) => {
  try {

    const { id } = req.params

    const menuItem = await db.MenuItem.findByPk(id)

    if (!menuItem) {
      return notFoundResponse(res, 'Menu item not found');
    }

    if (req.staff.restaurantId !== menuItem.restaurantId) {
      return forbiddenResponse(res, 'You can only delete menu items for your own restaurant');
    }

    await menuItem.destroy();

    return successResponse(res, null, 'Menu item deleted successfully');

  } catch (error) {
    return errorResponse(res, 'Failed to delete menu item', StatusCodes.INTERNAL_SERVER_ERROR);
  }
}

const toggleMenuItemAvailability = async (req, res) => {
  try {

    const { id } = req.params
    const menuItem = await db.MenuItem.findByPk(id)

    if (!menuItem) {
      return notFoundResponse(res, 'Menu item not found');
    }

    if (req.staff.restaurantId !== menuItem.restaurantId) {
      return forbiddenResponse(res, 'You can only update menu items for your own restaurant');
    }

    await menuItem.update({
      isAvailable: !menuItem.isAvailable
    })

    return successResponse(res, menuItem, 'Menu item availability toggled successfully');

  } catch (error) {
    return errorResponse(res, 'Failed to toggle menu item availability', StatusCodes.INTERNAL_SERVER_ERROR);
  }
}

const toggleMenuItemFeatured = async (req, res) => {
  try {
    const { id } = req.params
    const menuItem = await db.MenuItem.findByPk(id)

    if (!menuItem) {
      return notFoundResponse(res, 'Menu item not found');
    }
    if (req.staff.restaurantId !== menuItem.restaurantId) {
      return forbiddenResponse(res, 'You can only update menu items for your own restaurant');
    }
    await menuItem.update({
      isFeatured: !menuItem.isFeatured
    })
    return successResponse(res, menuItem, 'Menu item featured status toggled successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to toggle menu item featured status', StatusCodes.INTERNAL_SERVER_ERROR);
  }
}

export default {
  getAllMenuItems,
  getMenuItemById,
  getFeaturedMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
  toggleMenuItemFeatured
}