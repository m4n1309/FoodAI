'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Review extends Model {
    static associate(models) {
      Review.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant'
      });
      Review.belongsTo(models.Order, {
        foreignKey: 'orderId',
        as: 'order'
      });
      Review.belongsTo(models.Customer, {
        foreignKey: 'customerId',
        as: 'customer'
      });
      Review.belongsTo(models.Staff, {
        foreignKey: 'respondedBy',
        as: 'responder'
      });
    }
  }
  Review.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    restaurantId: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    orderId: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    customerId: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    customerName: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5
      }
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    images: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Ảnh đính kèm'
    },
    response: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Phản hồi từ nhà hàng'
    },
    respondedBy: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: 'Nhân viên phản hồi'
    },
    respondedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'Review',
    tableName: 'reviews',
    timestamps: true,
    underscored: true
  });
  return Review;
};