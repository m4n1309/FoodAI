'use strict';

const { Model } = require('sequelize');

MediaSourceHandle.exports = (sequelize, DataTypes) => {
  class Table extends Model {
    static associate(models) {
      Table.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant'
      })
      Table.hasMany(models.Order, {
        foreignKey: 'tableId',
        as: 'orders'
      })
      Table.hasMany(models.ChatbotConversation, {
        foreignKey: 'tableId',
        as: 'conversations'
      })
    }
  }
  Table.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    restaurantId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    tableNumber: {
      type: DateTypes.STRING,
      allowNull: false,
    },
    qrCode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    capacity: {
      type: DataTypes.INTEGER,
      defaultValue: 4,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('available', 'occupied', 'reserved'),
      defaultValue: 'available',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    sequelize,
    modelName: 'Table',
    tableName: 'tables',
    timestamps: true,
  })
  return Table;
}