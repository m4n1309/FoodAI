import db from '../models/index.js';
import { Op } from 'sequelize';

// Helper to get boundaries in Vietnam timezone (+7) converted to UTC Dates
const getTzBoundaries = (timezoneOffsetHours = 7) => {
  const now = new Date();
  const tzTime = new Date(now.getTime() + timezoneOffsetHours * 60 * 60 * 1000);
  
  const startOfTodayTz = new Date(tzTime);
  startOfTodayTz.setUTCHours(0, 0, 0, 0);
  const endOfTodayTz = new Date(tzTime);
  endOfTodayTz.setUTCHours(23, 59, 59, 999);
  
  const startOfToday = new Date(startOfTodayTz.getTime() - timezoneOffsetHours * 60 * 60 * 1000);
  const endOfToday = new Date(endOfTodayTz.getTime() - timezoneOffsetHours * 60 * 60 * 1000);
  
  const yesterdayTz = new Date(tzTime);
  yesterdayTz.setDate(yesterdayTz.getDate() - 1);
  
  const startOfYesterdayTz = new Date(yesterdayTz);
  startOfYesterdayTz.setUTCHours(0, 0, 0, 0);
  const endOfYesterdayTz = new Date(yesterdayTz);
  endOfYesterdayTz.setUTCHours(23, 59, 59, 999);
  
  const startOfYesterday = new Date(startOfYesterdayTz.getTime() - timezoneOffsetHours * 60 * 60 * 1000);
  const endOfYesterday = new Date(endOfYesterdayTz.getTime() - timezoneOffsetHours * 60 * 60 * 1000);
  
  return { startOfToday, endOfToday, startOfYesterday, endOfYesterday };
};

// Helper to convert local date strings (YYYY-MM-DD) to UTC boundaries
const convertLocalDatesToUtcBoundaries = (fromDateStr, toDateStr, timezoneOffsetHours = 7) => {
  const startLocal = new Date(`${fromDateStr}T00:00:00.000Z`);
  const endLocal = new Date(`${toDateStr}T23:59:59.999Z`);
  
  const startUtc = new Date(startLocal.getTime() - timezoneOffsetHours * 60 * 60 * 1000);
  const endUtc = new Date(endLocal.getTime() - timezoneOffsetHours * 60 * 60 * 1000);
  
  return { startUtc, endUtc };
};

const getRevenueReport = async ({ restaurantId, from, to, group_by = 'day', tableId, staffId }) => {
  const { startUtc, endUtc } = convertLocalDatesToUtcBoundaries(from, to);
  const where = {
    restaurantId,
    orderStatus: 'completed',
    paymentStatus: 'paid',
    completedAt: {
      [Op.between]: [startUtc, endUtc]
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
  const { startUtc, endUtc } = convertLocalDatesToUtcBoundaries(from, to);
  const whereOrder = {
    restaurantId,
    orderStatus: 'completed',
    paymentStatus: 'paid',
    completedAt: {
      [Op.between]: [startUtc, endUtc]
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

const getDashboardStats = async ({ restaurantId }) => {
  const { startOfToday, endOfToday, startOfYesterday, endOfYesterday } = getTzBoundaries();

  // Execute all 8 queries in parallel
  const [
    revenueResult,
    todayOrdersCount,
    totalMenuItems,
    occupiedTables,
    totalTables,
    recentOrders,
    yesterdayRevenueResult,
    yesterdayOrdersCount
  ] = await Promise.all([
    // 1. Total Revenue Today
    db.Order.findOne({
      where: {
        restaurantId,
        orderStatus: 'completed',
        paymentStatus: 'paid',
        completedAt: {
          [Op.between]: [startOfToday, endOfToday]
        }
      },
      attributes: [
        [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'totalRevenue']
      ],
      raw: true
    }),

    // 2. Today's Orders Count
    db.Order.count({
      where: {
        restaurantId,
        orderStatus: { [Op.ne]: 'cart' },
        created_at: {
          [Op.between]: [startOfToday, endOfToday]
        }
      }
    }),

    // 3. Total Menu Items
    db.MenuItem.count({
      where: { restaurantId, isAvailable: true }
    }),

    // 4. Tables In Use (occupied)
    db.Table.count({
      where: { restaurantId, isActive: true, status: 'occupied' }
    }),

    // 5. Total Tables
    db.Table.count({
      where: { restaurantId, isActive: true }
    }),

    // 6. Recent Orders (limit 5)
    db.Order.findAll({
      where: {
        restaurantId,
        orderStatus: { [Op.ne]: 'cart' }
      },
      limit: 5,
      order: [['created_at', 'DESC']],
      include: [
        { model: db.Table, as: 'table', attributes: ['tableNumber'] },
        {
          model: db.OrderItem,
          as: 'items',
          attributes: ['id', 'itemStatus']
        }
      ]
    }),

    // 7. Yesterday's Revenue
    db.Order.findOne({
      where: {
        restaurantId,
        orderStatus: 'completed',
        paymentStatus: 'paid',
        completedAt: {
          [Op.between]: [startOfYesterday, endOfYesterday]
        }
      },
      attributes: [
        [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'totalRevenue']
      ],
      raw: true
    }),

    // 8. Yesterday's Orders Count
    db.Order.count({
      where: {
        restaurantId,
        orderStatus: { [Op.ne]: 'cart' },
        created_at: {
          [Op.between]: [startOfYesterday, endOfYesterday]
        }
      }
    })
  ]);

  const totalRevenue = parseFloat(revenueResult?.totalRevenue || 0);
  const yesterdayRevenue = parseFloat(yesterdayRevenueResult?.totalRevenue || 0);

  const revenueChange = yesterdayRevenue > 0
    ? (((totalRevenue - yesterdayRevenue) / yesterdayRevenue) * 100).toFixed(1)
    : totalRevenue > 0 ? '+100' : '0';

  const ordersChange = yesterdayOrdersCount > 0
    ? (((todayOrdersCount - yesterdayOrdersCount) / yesterdayOrdersCount) * 100).toFixed(1)
    : todayOrdersCount > 0 ? '+100' : '0';

  return {
    stats: {
      totalRevenue,
      revenueChange: parseFloat(revenueChange) >= 0 ? `+${revenueChange}%` : `${revenueChange}%`,
      revenueTrend: parseFloat(revenueChange) >= 0 ? 'up' : 'down',
      todayOrdersCount,
      ordersChange: parseFloat(ordersChange) >= 0 ? `+${ordersChange}%` : `${ordersChange}%`,
      ordersTrend: parseFloat(ordersChange) >= 0 ? 'up' : 'down',
      totalMenuItems,
      occupiedTables,
      totalTables
    },
    recentOrders: recentOrders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      tableNumber: order.table?.tableNumber || 'Mang về',
      itemCount: order.items ? order.items.filter(i => i.itemStatus !== 'cancelled').length : 0,
      totalAmount: parseFloat(order.totalAmount || 0),
      orderStatus: order.orderStatus,
      createdAt: order.createdAt || order.created_at
    }))
  };
};

export default {
  getRevenueReport,
  getPopularItems,
  getDashboardStats
};
