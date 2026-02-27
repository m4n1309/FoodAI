'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    static associate(models) {
    }
  }

  Notification.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      type: {
        type: DataTypes.ENUM('new_order', 'order_ready', 'table_request', 'system'),
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Tiêu đề không được để trống' },
        },
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      target_role: {
        type: DataTypes.ENUM('admin', 'staff', 'kitchen', 'all'),
        defaultValue: 'all',
      },
      is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      related_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'order_id hoặc session_id liên quan',
      },
    },
    {
      sequelize,
      modelName: 'Notification',
      tableName: 'notifications',
      timestamps: true,
      underscored: true,
      updatedAt: false,            
    }
  );

  return Notification;
};