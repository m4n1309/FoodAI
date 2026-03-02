'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    static associate(models) {
      Notification.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant'
      });
      Notification.belongsTo(models.Order, {
        foreignKey: 'orderId',
        as: 'order'
      });
    }
  }
  Notification.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    restaurantId: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    recipientType: {
      type: DataTypes.ENUM('customer', 'staff', 'kitchen'),
      allowNull: false
    },
    recipientId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: 'ID của customer hoặc staff'
    },
    orderId: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    notificationType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'order_confirmed, item_ready, payment_received, etc.'
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    data: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Dữ liệu bổ sung'
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Notification',
    tableName: 'notifications',
    timestamps: true,
  });
  return Notification;
};