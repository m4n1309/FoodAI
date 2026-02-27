'use strict'

const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class Session extends Model {
    static associate(models) {
      Session.belongsTo(models.Table, {
        foreignKey: 'table_id',
        as: 'table'
      })
      Session.hasMany(models.Order, {
        foreignKey: 'session_id', 
        as: 'orders'
      })
      Session.hasMany(models.ChatHistory, {
        foreignKey: 'session_id',
        as: 'chat_histories'
      })
      Session.hasMany(models.Review, {
        foreignKey: 'session_id',
        as: 'reviews'
      })
    }
  }
  Session.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    table_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    session_token:{
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: 'Session token cannot be empty' },
      }
    },
    customer_name:{
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    customer_phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    number_of_guests: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    start_time: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    end_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
    },
    status: {
      type: DataTypes.ENUM('active', 'completed', 'cancelled'),
      defaultValue: 'active',
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    }
  },
  {
    sequelize,
    modelName: 'Session',
    tableName: 'sessions',
    timestamps: true,
    underscored: true,
  })
  return Session;
}