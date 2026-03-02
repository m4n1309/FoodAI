'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Restaurant extends Model {
    static associate(models) {
      Restaurant.hasMany(models.Table, {
        foreignKey: 'restaurantId',
        as: 'tables'
      })
      Restaurant.hasMany(models.Category, {
        foreignKey: 'restaurantId',
        as: 'categories'
      })
      Restaurant.hasMany(models.MenuItem, {
        foreignKey: 'restaurantId',
        as: 'menuItems'
      })
      Restaurant.hasMany(models.Combo, {
        foreignKey: 'restaurantId',
        as: 'combos'
      })
      Restaurant.hasMany(models.Staff, {
        foreignKey: 'restaurantId',
        as: 'staffs'
      })
      Restaurant.hasMany(models.Order, {
        foreignKey: 'restaurantId',
        as: 'orders'
      })
      Restaurant.hasMany(models.Review, {
        foreignKey: 'restaurantId',
        as: 'reviews'
      })
      Restaurant.hasMany(models.Promotion, {
        foreignKey: 'restaurantId',
        as: 'promotions'
      })
      Restaurant.hasMany(models.Notification, {
        foreignKey: 'restaurantId',
        as: 'notifications'
      })
      Restaurant.hasMany(models.RevenueReport, {
        foreignKey: 'restaurantId',
        as: 'revenueReports'
      })
      Restaurant.hasMany(models.ActivityLog, {
        foreignKey: 'restaurantId',
        as: 'activityLogs'
      })
    }
  }
  Restaurant.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    openingHours: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    logoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    taxRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00,
    },
    serviceChangeRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00,
    },
    bankInfo: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
    {
      sequelize,
      modelName: 'Restaurant',
      tableName: 'restaurants',
      timestamps: true,
    })
  return Restaurant;
}