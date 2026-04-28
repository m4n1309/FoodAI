import db from '../models/index.js';
import { StatusCodes } from 'http-status-codes';
import { ServiceError } from './serviceError.js';
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

const ensureStaffRestaurantAccess = (staffRestaurantId, targetRestaurantId, message) => {
  if (String(staffRestaurantId) !== String(targetRestaurantId)) {
    throw new ServiceError(message, StatusCodes.FORBIDDEN);
  }
};

const getAllCombos = async (query) => {
  const { restaurantId, isAvailable, search } = query;
  const where = {};
  if (restaurantId) where.restaurantId = restaurantId;
  if (isAvailable !== undefined) where.isAvailable = isAvailable === 'true';
  if (search) {
    where.name = { [Op.like]: `%${search}%` };
  }

  return db.Combo.findAll({
    where,
    include: [{
      model: db.ComboItem,
      as: 'items',
      include: [{
        model: db.MenuItem,
        as: 'menuItem',
        attributes: ['id', 'name', 'price', 'discountPrice', 'imageUrl']
      }]
    }],
    order: [['id', 'DESC']]
  });
};

const getComboById = async (id) => {
  const combo = await db.Combo.findByPk(id, {
    include: [{
      model: db.ComboItem,
      as: 'items',
      include: [{
        model: db.MenuItem,
        as: 'menuItem'
      }]
    }]
  });
  if (!combo) throw new ServiceError('Combo not found', StatusCodes.NOT_FOUND);
  return combo;
};

const createCombo = async ({ body, staffRestaurantId }) => {
  const { restaurantId, name, description, price, discountPrice, imageUrl, items, isAvailable } = body;

  if (!restaurantId || !name || !price) {
    throw new ServiceError('Missing required fields', StatusCodes.BAD_REQUEST);
  }

  ensureStaffRestaurantAccess(staffRestaurantId, restaurantId, 'Access denied');

  return await db.sequelize.transaction(async (t) => {
    const combo = await db.Combo.create({
      restaurantId,
      name,
      slug: generateSlug(name),
      description,
      price,
      discountPrice,
      imageUrl,
      isAvailable: isAvailable !== undefined ? isAvailable : true
    }, { transaction: t });

    if (items && Array.isArray(items)) {
      const comboItems = items.map(it => ({
        comboId: combo.id,
        menuItemId: it.menuItemId,
        quantity: it.quantity || 1
      }));
      await db.ComboItem.bulkCreate(comboItems, { transaction: t });
    }

    return await db.Combo.findByPk(combo.id, {
      include: [{
        model: db.ComboItem,
        as: 'items',
        include: [{
          model: db.MenuItem,
          as: 'menuItem'
        }]
      }],
      transaction: t
    });
  });
};

const updateCombo = async ({ id, body, staffRestaurantId }) => {
  const combo = await db.Combo.findByPk(id);
  if (!combo) throw new ServiceError('Combo not found', StatusCodes.NOT_FOUND);

  ensureStaffRestaurantAccess(staffRestaurantId, combo.restaurantId, 'Access denied');

  const { name, description, price, discountPrice, imageUrl, items, isAvailable } = body;

  return await db.sequelize.transaction(async (t) => {
    const updateData = {
      name: name || combo.name,
      description: description !== undefined ? description : combo.description,
      price: price || combo.price,
      discountPrice: discountPrice !== undefined ? discountPrice : combo.discountPrice,
      imageUrl: imageUrl !== undefined ? imageUrl : combo.imageUrl,
      isAvailable: isAvailable !== undefined ? isAvailable : combo.isAvailable
    };

    if (name) updateData.slug = generateSlug(name);

    await combo.update(updateData, { transaction: t });

    if (items && Array.isArray(items)) {
      await db.ComboItem.destroy({ where: { comboId: id }, transaction: t });
      const comboItems = items.map(it => ({
        comboId: id,
        menuItemId: it.menuItemId,
        quantity: it.quantity || 1
      }));
      await db.ComboItem.bulkCreate(comboItems, { transaction: t });
    }

    return await db.Combo.findByPk(id, {
      include: [{
        model: db.ComboItem,
        as: 'items',
        include: [{
          model: db.MenuItem,
          as: 'menuItem'
        }]
      }],
      transaction: t
    });
  });
};

const deleteCombo = async ({ id, staffRestaurantId }) => {
  const combo = await db.Combo.findByPk(id);
  if (!combo) throw new ServiceError('Combo not found', StatusCodes.NOT_FOUND);

  ensureStaffRestaurantAccess(staffRestaurantId, combo.restaurantId, 'Access denied');

  return await db.sequelize.transaction(async (t) => {
    await db.ComboItem.destroy({ where: { comboId: id }, transaction: t });
    await combo.destroy({ transaction: t });
  });
};

const toggleAvailability = async ({ id, staffRestaurantId }) => {
  const combo = await db.Combo.findByPk(id);
  if (!combo) throw new ServiceError('Combo not found', StatusCodes.NOT_FOUND);

  ensureStaffRestaurantAccess(staffRestaurantId, combo.restaurantId, 'Access denied');

  await combo.update({ isAvailable: !combo.isAvailable });
  return combo;
};

export default {
  getAllCombos,
  getComboById,
  createCombo,
  updateCombo,
  deleteCombo,
  toggleAvailability
};
