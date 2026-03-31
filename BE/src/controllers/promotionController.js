import { StatusCodes } from 'http-status-codes';
import { successResponse, errorResponse, notFoundResponse } from '../utils/ResponseHelper.js';
import db from '../models/index.js';
import { Op } from 'sequelize';

// --- ADMIN / MANAGER ENDPOINTS ---

export const getPromotions = async (req, res) => {
  try {
    const restaurantId = req.staff.restaurantId;
    const promotions = await db.Promotion.findAll({
      where: { restaurantId },
      order: [['created_at', 'DESC']]
    });
    return successResponse(res, promotions, 'Promotions retrieved successfully');
  } catch (error) {
    console.error(error);
    return errorResponse(res, 'Failed to fetch promotions', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getPromotionById = async (req, res) => {
  try {
    const restaurantId = req.staff.restaurantId;
    const { id } = req.params;
    const promotion = await db.Promotion.findOne({ where: { id, restaurantId } });
    if (!promotion) return notFoundResponse(res, 'Promotion not found');
    return successResponse(res, promotion, 'Promotion retrieved successfully');
  } catch (error) {
    console.error(error);
    return errorResponse(res, 'Failed to fetch promotion', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const createPromotion = async (req, res) => {
  try {
    const restaurantId = req.staff.restaurantId;
    const data = { ...req.body, restaurantId };
    const promotion = await db.Promotion.create(data);
    return successResponse(res, promotion, 'Promotion created successfully', StatusCodes.CREATED);
  } catch (error) {
    console.error(error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return errorResponse(res, 'Promotion code already exists', StatusCodes.CONFLICT);
    }
    return errorResponse(res, 'Failed to create promotion', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const updatePromotion = async (req, res) => {
  try {
    const restaurantId = req.staff.restaurantId;
    const { id } = req.params;
    const promotion = await db.Promotion.findOne({ where: { id, restaurantId } });
    
    if (!promotion) return notFoundResponse(res, 'Promotion not found');
    
    await promotion.update(req.body);
    return successResponse(res, promotion, 'Promotion updated successfully');
  } catch (error) {
    console.error(error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return errorResponse(res, 'Promotion code already exists', StatusCodes.CONFLICT);
    }
    return errorResponse(res, 'Failed to update promotion', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const deletePromotion = async (req, res) => {
  try {
    const restaurantId = req.staff.restaurantId;
    const { id } = req.params;
    const promotion = await db.Promotion.findOne({ where: { id, restaurantId } });
    
    if (!promotion) return notFoundResponse(res, 'Promotion not found');
    
    await promotion.destroy();
    return successResponse(res, null, 'Promotion deleted successfully');
  } catch (error) {
    console.error(error);
    return errorResponse(res, 'Failed to delete promotion', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// --- PUBLIC / CUSTOMER ENDPOINT ---

export const validatePromotion = async (req, res) => {
  try {
    const { code, restaurantId, orderAmount } = req.body;
    
    if (!code || !restaurantId) {
      return errorResponse(res, 'Code and restaurantId are required', StatusCodes.BAD_REQUEST);
    }

    const promotion = await db.Promotion.findOne({
      where: {
        code,
        restaurantId,
        isActive: true,
        validFrom: { [Op.lte]: new Date() },
        validUntil: { [Op.gte]: new Date() }
      }
    });

    if (!promotion) {
      return errorResponse(res, 'Invalid or expired promotion code', StatusCodes.BAD_REQUEST);
    }

    if (promotion.usageLimit && promotion.usageCount >= promotion.usageLimit) {
      return errorResponse(res, 'Promotion usage limit reached', StatusCodes.BAD_REQUEST);
    }

    if (promotion.minOrderAmount && orderAmount && Number(orderAmount) < Number(promotion.minOrderAmount)) {
      return errorResponse(res, `Minimum order amount of ${promotion.minOrderAmount} required`, StatusCodes.BAD_REQUEST);
    }

    // calculate tentative discount
    let discountAmount = 0;
    if (promotion.discountType === 'percentage') {
      discountAmount = (Number(orderAmount || 0) * Number(promotion.discountValue)) / 100;
      if (promotion.maxDiscountAmount && discountAmount > Number(promotion.maxDiscountAmount)) {
        discountAmount = Number(promotion.maxDiscountAmount);
      }
    } else {
      discountAmount = Number(promotion.discountValue);
    }

    return successResponse(res, { promotion, tentativeDiscountAmount: discountAmount }, 'Promotion is valid');
  } catch (error) {
    console.error(error);
    return errorResponse(res, 'Failed to validate promotion', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getAvailablePromotions = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    if (!restaurantId) return errorResponse(res, 'Restaurant ID required', StatusCodes.BAD_REQUEST);

    const promotions = await db.Promotion.findAll({
      where: {
        restaurantId,
        isActive: true,
        validFrom: { [Op.lte]: new Date() },
        validUntil: { [Op.gte]: new Date() }
      },
      order: [['created_at', 'DESC']]
    });

    // Filter out logically fully-used promotions in memory just to be safe
    const validPromotions = promotions.filter(p => !p.usageLimit || p.usageCount < p.usageLimit);

    return successResponse(res, validPromotions, 'Available promotions retrieved successfully');
  } catch (error) {
    console.error(error);
    return errorResponse(res, 'Failed to fetch available promotions', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export default {
  getPromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  deletePromotion,
  validatePromotion,
  getAvailablePromotions
};
