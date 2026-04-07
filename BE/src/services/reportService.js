import db from '../models/index.js';
import { Op } from 'sequelize';

const getRevenueReport = async ({ restaurantId, from, to, group_by = 'day', tableId, staffId }) => {
  const where = {
    restaurantId,
    orderStatus: 'completed',
    paymentStatus: 'paid',
    completedAt: {
      [Op.between]: [from, `${to} 23:59:59`]
    }
  };

  if (tableId) where.tableId = tableId;
  if (staffId) where.staffId = staffId;

  // 1. Overall Summary
  const summary = await db.Order.findOne({
    where,
    attributes: [
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'totalOrders'],
      [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'totalRevenue'],
      [db.sequelize.fn('SUM', db.sequelize.col('tax_amount')), 'totalTax'],
      [db.sequelize.fn('SUM', db.sequelize.col('service_charge')), 'totalServiceCharge'],
      [db.sequelize.fn('SUM', db.sequelize.col('discount_amount')), 'totalDiscount']
    ],
    raw: true
  });

  // 2. Breakdown by Payment Method
  const paymentBreakdown = await db.Order.findAll({
    where,
    attributes: [
      'paymentMethod',
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'orderCount'],
      [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'revenue']
    ],
    group: ['paymentMethod'],
    raw: true
  });

  // 3. Data for Charts (Grouped by time bucket)
  let timeBucketAttr;
  if (group_by === 'week') {
    timeBucketAttr = [db.sequelize.fn('YEARWEEK', db.sequelize.col('completed_at'), 1), 'time_bucket'];
  } else if (group_by === 'month') {
    timeBucketAttr = [db.sequelize.fn('DATE_FORMAT', db.sequelize.col('completed_at'), '%Y-%m'), 'time_bucket'];
  } else {
    timeBucketAttr = [db.sequelize.fn('DATE', db.sequelize.col('completed_at')), 'time_bucket'];
  }

  const chartData = await db.Order.findAll({
    where,
    attributes: [
      timeBucketAttr,
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'totalOrders'],
      [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'totalRevenue'],
      [db.sequelize.fn('MAX', db.sequelize.col('total_amount')), 'maxOrderValue']
    ],
    group: ['time_bucket'],
    order: [['time_bucket', 'ASC']],
    raw: true
  });

  return {
    summary: {
      totalOrders: parseInt(summary.totalOrders || 0, 10),
      totalRevenue: parseFloat(summary.totalRevenue || 0),
      totalTax: parseFloat(summary.totalTax || 0),
      totalServiceCharge: parseFloat(summary.totalServiceCharge || 0),
      totalDiscount: parseFloat(summary.totalDiscount || 0),
      averageOrderValue: summary.totalOrders > 0 
        ? parseFloat(summary.totalRevenue || 0) / parseInt(summary.totalOrders, 10) 
        : 0
    },
    paymentBreakdown: paymentBreakdown.map(p => ({
      ...p,
      orderCount: parseInt(p.orderCount, 10),
      revenue: parseFloat(p.revenue)
    })),
    chartData: chartData.map(c => ({
      ...c,
      totalOrders: parseInt(c.totalOrders, 10),
      totalRevenue: parseFloat(c.totalRevenue),
      maxOrderValue: parseFloat(c.maxOrderValue)
    }))
  };
};

const getPopularItems = async ({ restaurantId, from, to, categoryId, limit = 10 }) => {
  const whereOrder = {
    restaurantId,
    orderStatus: 'completed',
    paymentStatus: 'paid',
    completedAt: {
      [Op.between]: [from, `${to} 23:59:59`]
    }
  };

  const whereMenuItem = {};
  if (categoryId) whereMenuItem.categoryId = categoryId;

  const popularItems = await db.OrderItem.findAll({
    attributes: [
      'menuItemId',
      [db.sequelize.fn('COUNT', db.sequelize.col('OrderItem.id')), 'orderCount'],
      [db.sequelize.fn('SUM', db.sequelize.col('OrderItem.total_price')), 'totalRevenue'],
      [db.sequelize.fn('SUM', db.sequelize.col('OrderItem.quantity')), 'totalQuantity']
    ],
    include: [
      {
        model: db.Order,
        as: 'order',
        attributes: [],
        where: whereOrder
      },
      {
        model: db.MenuItem,
        as: 'menuItem',
        attributes: ['id', 'name', 'price', 'imageUrl', 'categoryId'],
        where: whereMenuItem,
        include: [
          {
            model: db.Category,
            as: 'category',
            attributes: ['name']
          }
        ]
      }
    ],
    group: ['menuItemId', 'menuItem.id', 'menuItem.category.id'],
    order: [[db.sequelize.literal('totalQuantity'), 'DESC']],
    limit: parseInt(limit, 10),
    raw: true,
    nest: true
  });

  // Fetch average rating for these items
  const menuItemIds = popularItems.map(item => item.menuItemId);
  const ratings = await db.MenuItemReview.findAll({
    attributes: [
      'menuItemId',
      [db.sequelize.fn('AVG', db.sequelize.col('rating')), 'avgRating'],
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'reviewCount']
    ],
    where: {
      menuItemId: { [Op.in]: menuItemIds }
    },
    group: ['menuItemId'],
    raw: true
  });

  const ratingMap = ratings.reduce((acc, r) => {
    acc[r.menuItemId] = {
      avgRating: parseFloat(r.avgRating || 0).toFixed(1),
      reviewCount: parseInt(r.reviewCount || 0, 10)
    };
    return acc;
  }, {});

  return popularItems.map(item => ({
    ...item,
    orderCount: parseInt(item.orderCount, 10),
    totalRevenue: parseFloat(item.totalRevenue || 0),
    totalQuantity: parseInt(item.totalQuantity || 0, 10),
    rating: ratingMap[item.menuItemId] || { avgRating: '0.0', reviewCount: 0 }
  }));
};

export default {
  getRevenueReport,
  getPopularItems
};
