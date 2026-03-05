
import { Sequelize } from 'sequelize';
import sequelize from '../config/database.js'; 


import Restaurant from './restaurantModel.js';
import Table from './tableModel.js';
import Category from './categoryModel.js';
import MenuItem from './menuItemModel.js';
import Combo from './comboModel.js';
import ComboItem from './comboItemModel.js';
import Customer from './customerModel.js';
import Staff from './staffModel.js';
import Order from './orderModel.js';
import OrderItem from './orderItemModel.js';
import Review from './reviewModel.js';
import MenuItemReview from './menuItemReviewModel.js';
import ChatbotConversation from './chatbotConversationModel.js';
import ChatbotMessage from './chatbotMessageModel.js';
import Notification from './notificationModel.js';
import Promotion from './promotionModel.js';
import PromotionUsage from './promotionUsageModel.js';
import PaymentHistory from './paymentHistoryModel.js';
import RevenueReport from './revenueReportModel.js';
import ActivityLog from './activityLogModel.js';
import Session from './sessionModel.js';

const db = {
  sequelize,               
  Sequelize,               
  Restaurant,
  Table,
  Category,
  MenuItem,
  Combo,
  ComboItem,
  Customer,
  Staff,
  Order,
  OrderItem,
  Review,
  MenuItemReview,
  ChatbotConversation,
  ChatbotMessage,
  Notification,
  Promotion,
  PromotionUsage,
  PaymentHistory,
  RevenueReport,
  ActivityLog,
  Session
};

Object.values(db).forEach(model => {
  if (model.associate) {
    model.associate(db);
  }
});

export default db;