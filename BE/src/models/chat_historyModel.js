'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ChatHistory extends Model {
    static associate(models) {
      ChatHistory.belongsTo(models.Session, {
        foreignKey: 'session_id',
        as: 'session'
      });
    }
  }

  ChatHistory.init(
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
      role: {
        type: DataTypes.ENUM('user', 'assistant', 'system'),
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Nội dung tin nhắn không được để trống' },
        },
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'intent, sentiment, entities... do AI trả về',
      },
    },
    {
      sequelize,
      modelName: 'ChatHistory',
      tableName: 'chat_history',
      timestamps: true,
      underscored: true,
      updatedAt: false,            
    }
  );

  return ChatHistory;
};