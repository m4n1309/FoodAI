import { StatusCodes } from 'http-status-codes';
import { successResponse, errorResponse, notFoundResponse } from '../utils/ResponseHelper.js';
import db from '../models/index.js';

// --- CUSTOMER ENDPOINTS ---

export const createReview = async (req, res) => {
  try {
    const { restaurantId, orderId, customerId, customerName, customerPhone, rating, comment, images } = req.body;

    if (!restaurantId || !rating) {
        return errorResponse(res, 'Restaurant ID and rating are required', StatusCodes.BAD_REQUEST);
    }

    let finalCustomerId = customerId;

    // Handle customer loyalty points and order attribution if phone is provided
    if (customerPhone) {
      let customer = await db.Customer.findOne({ where: { phone: customerPhone } });
      if (!customer) {
        customer = await db.Customer.create({ phone: customerPhone, fullName: customerName || 'Khách hàng' });
      }
      finalCustomerId = customer.id;

      // Add 100 loyalty points for the act of reviewing
      let pointsToAdd = 100;
      let ordersToAdd = 0;
      let spentToAdd = 0;

      // Retroactively link order and update stats if this was a guest order
      if (orderId) {
        const order = await db.Order.findByPk(orderId);
        if (order && order.orderStatus === 'completed') {
           // If order belongs to no one (guest), attribute it to this customer
           if (!order.customerId) {
             await order.update({ customerId: finalCustomerId, customerPhone });
             
             // Calculate points from order amount: 1 point per 10,000 VND
             const orderPoints = Math.floor(Number(order.totalAmount || 0) / 10000);
             pointsToAdd += orderPoints;
             ordersToAdd = 1;
             spentToAdd = Number(order.totalAmount || 0);
           }
        } else if (order && order.orderStatus !== 'completed') {
           return errorResponse(res, 'Can only review completed orders', StatusCodes.BAD_REQUEST);
        }
      }

      await customer.update({
        loyaltyPoints: (customer.loyaltyPoints || 0) + pointsToAdd,
        totalOrders: (customer.totalOrders || 0) + ordersToAdd,
        totalSpent: Number(customer.totalSpent || 0) + spentToAdd
      });
    } else if (orderId) {
        // Fallback for when no phone is provided but orderId is
        const order = await db.Order.findByPk(orderId);
        if (!order || order.orderStatus !== 'completed') {
            return errorResponse(res, 'Can only review completed orders', StatusCodes.BAD_REQUEST);
        }
    }

    const review = await db.Review.create({
      restaurantId,
      orderId,
      customerId: finalCustomerId,
      customerName,
      rating,
      comment,
      images, // Assuming images are uploaded externally and passed as URLs
      isPublished: true // Default to true, or wait for admin approval if needed
    });

    return successResponse(res, review, 'Review submitted successfully', StatusCodes.CREATED);
  } catch (error) {
    console.error(error);
    return errorResponse(res, 'Failed to submit review', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const createMenuItemReview = async (req, res) => {
  try {
    const { menuItemId, orderItemId, customerId, rating, comment } = req.body;

    if (!menuItemId || !rating) {
        return errorResponse(res, 'Menu Item ID and rating are required', StatusCodes.BAD_REQUEST);
    }

    const itemReview = await db.MenuItemReview.create({
      menuItemId,
      orderItemId,
      customerId,
      rating,
      comment
    });

    return successResponse(res, itemReview, 'Menu item review submitted successfully', StatusCodes.CREATED);
  } catch (error) {
    console.error(error);
    return errorResponse(res, 'Failed to submit menu item review', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getRestaurantReviews = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const { count, rows } = await db.Review.findAndCountAll({
            where: { restaurantId, isPublished: true },
            limit,
            offset,
            order: [['created_at', 'DESC']]
        });

        return successResponse(res, {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
            reviews: rows
        }, 'Reviews retrieved successfully');
    } catch(error) {
        console.error(error);
        return errorResponse(res, 'Failed to retrieve reviews', StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const getMenuItemReviews = async (req, res) => {
    try {
        const { menuItemId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const { count, rows } = await db.MenuItemReview.findAndCountAll({
            where: { menuItemId },
            limit,
            offset,
            order: [['created_at', 'DESC']],
            include: [{ model: db.Customer, as: 'customer', attributes: ['id', 'fullName', 'avatarUrl'] }]
        });

        return successResponse(res, {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
            reviews: rows
        }, 'Reviews retrieved successfully');
    } catch(error) {
        console.error(error);
        return errorResponse(res, 'Failed to retrieve reviews', StatusCodes.INTERNAL_SERVER_ERROR);
    }
}


// --- ADMIN / STAFF ENDPOINTS ---

export const getAllReviewsAdmin = async (req, res) => {
  try {
    const restaurantId = req.staff.restaurantId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await db.Review.findAndCountAll({
      where: { restaurantId },
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    return successResponse(res, {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
        reviews: rows
    }, 'Reviews retrieved successfully');
  } catch (error) {
    console.error(error);
    return errorResponse(res, 'Failed to fetch reviews', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const updateReviewStatus = async (req, res) => {
    try {
        const restaurantId = req.staff.restaurantId;
        const { id } = req.params;
        const { isPublished } = req.body;

        const review = await db.Review.findOne({ where: { id, restaurantId } });
        if (!review) return notFoundResponse(res, 'Review not found');

        await review.update({ isPublished });

        return successResponse(res, review, 'Review updated successfully');
    } catch (error) {
        console.error(error);
        return errorResponse(res, 'Failed to update review', StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export const respondToReview = async (req, res) => {
    try {
        const restaurantId = req.staff.restaurantId;
        const staffId = req.staff.id;
        const { id } = req.params;
        const { response } = req.body;

        const review = await db.Review.findOne({ where: { id, restaurantId } });
        if (!review) return notFoundResponse(res, 'Review not found');

        await review.update({ 
            response, 
            respondedBy: staffId, 
            respondedAt: new Date() 
        });

        return successResponse(res, review, 'Responded to review successfully');
    } catch (error) {
        console.error(error);
        return errorResponse(res, 'Failed to respond to review', StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

export default {
    createReview,
    createMenuItemReview,
    getRestaurantReviews,
    getMenuItemReviews,
    getAllReviewsAdmin,
    updateReviewStatus,
    respondToReview
};
