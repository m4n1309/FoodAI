'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Review extends Model {
    static associate(models) {
      Review.belongsTo(models.Session, {
        foreignKey: 'session_id',
        as: 'session'
      });
      Review.belongsTo(models.Dish, {
        foreignKey: 'dish_id',
        as: 'dish'
      });
    }
  }

  Review.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      session_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      dish_id: {
        type: DataTypes.INTEGER,
        allowNull: true,           
      },
      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: { args: [1], msg: 'Đánh giá tối thiểu 1 sao' },
          max: { args: [5], msg: 'Đánh giá tối đa 5 sao' },
        },
      },
      comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      images: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Mảng URL ảnh: ["url1", "url2"]',
      },
      is_approved: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'Review',
      tableName: 'reviews',
      timestamps: true,
      underscored: true,
      updatedAt: false,    
    }
  );

  return Review;
};