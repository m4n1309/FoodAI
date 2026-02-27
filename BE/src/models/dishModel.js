'use strict'

const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class Dish extends Model {
    static associate(models) {
      Dish.belongsTo(models.Category, {
        foreignKey: 'category_id',
        as: 'category'
      })
      Dish.hasMany(models.OrderItem, {
        foreignKey: 'dish_id',
        as: 'order_items'
      })
      Dish.hasMany(models.Review, {
        foreignKey: 'dish_id',
        as: 'reviews'
      })
    }
  }
  Dish.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Dish name cannot be empty' },
      }
    },
    name_en: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: { args: [0], msg: 'Price must be a positive number' },
      }
    },
    img_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    ingredients: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    allergens: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    calories: {
      type: DateTypes.INTEGER,
      allowNull: true,
    },
    prep_time: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    is_vegetarian: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_spicy: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_available: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    display_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
    {
      sequelize,
      modelName: 'Dish',
      tableName: 'dishes',
      timestamps: true,
      underscored: true,
    }
  )
  return Dish
}