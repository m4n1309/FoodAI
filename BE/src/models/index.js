import { Sequelize } from 'sequelize';
import sequelize from '../config/database.js';

import restaurantModel from './restaurantModel.js';
import tableModel from './tableModel.js';
import categoryModel from './categoryModel.js';
import menuItemModel from './menuItemModel.js';
import comboModel from './comboModel.js';
import comboItemModel from './comboItemModel.js';
import customerModel from './customerModel.js';
import staffModel from './staffModel.js';
import orderModel from './orderModel.js';
import orderItemModel from './orderItemModel.js';
import reviewModel from './reviewModel.js';
import menuItemReviewModel from './menuItemReviewModel.js';
import chatbotConversationModel from './chatbotConversationModel.js';
import chatbotMessageModel from './chatbotMessageModel.js';
import notificationModel from './notificationModel.js';
import promotionModel from './promotionModel.js';
import promotionUsageModel from './promotionUsageModel.js';
import paymentHistoryModel from './paymentHistoryModel.js';
import revenueReportModel from './revenueReportModel.js';
import activityLogModel from './activityLogModel.js';
import sessionModel from './sessionModel.js';

const db = {};


db.Restaurant = restaurantModel(sequelize, Sequelize.DataTypes);
db.Table = tableModel(sequelize, Sequelize.DataTypes);
db.Category = categoryModel(sequelize, Sequelize.DataTypes);
db.MenuItem = menuItemModel(sequelize, Sequelize.DataTypes);
db.Combo = comboModel(sequelize, Sequelize.DataTypes);
db.ComboItem = comboItemModel(sequelize, Sequelize.DataTypes);
db.Customer = customerModel(sequelize, Sequelize.DataTypes);
db.Staff = staffModel(sequelize, Sequelize.DataTypes);
db.Order = orderModel(sequelize, Sequelize.DataTypes);
db.OrderItem = orderItemModel(sequelize, Sequelize.DataTypes);
db.Review = reviewModel(sequelize, Sequelize.DataTypes);
db.MenuItemReview = menuItemReviewModel(sequelize, Sequelize.DataTypes);
db.ChatbotConversation = chatbotConversationModel(sequelize, Sequelize.DataTypes);
db.ChatbotMessage = chatbotMessageModel(sequelize, Sequelize.DataTypes);
db.Notification = notificationModel(sequelize, Sequelize.DataTypes);
db.Promotion = promotionModel(sequelize, Sequelize.DataTypes);
db.PromotionUsage = promotionUsageModel(sequelize, Sequelize.DataTypes);
db.PaymentHistory = paymentHistoryModel(sequelize, Sequelize.DataTypes);
db.RevenueReport = revenueReportModel(sequelize, Sequelize.DataTypes);
db.ActivityLog = activityLogModel(sequelize, Sequelize.DataTypes);
db.Session = sessionModel(sequelize, Sequelize.DataTypes);

// Associate models
Object.values(db).forEach(model => {
  if (model.associate) {
    model.associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;


export default db;