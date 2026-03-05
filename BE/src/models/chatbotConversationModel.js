import { Model } from 'sequelize';

const ChatbotConversation = (sequelize, DataTypes) => {
  class ChatbotConversation extends Model {
    static associate(models) {
      ChatbotConversation.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant'
      });
      ChatbotConversation.belongsTo(models.Customer, {
        foreignKey: 'customerId',
        as: 'customer'
      });
      ChatbotConversation.belongsTo(models.Table, {
        foreignKey: 'tableId',
        as: 'table'
      });
      ChatbotConversation.belongsTo(models.Order, {
        foreignKey: 'orderId',
        as: 'order'
      });
      ChatbotConversation.hasMany(models.ChatbotMessage, {
        foreignKey: 'conversationId',
        as: 'messages'
      });
    }
  }

  ChatbotConversation.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    restaurantId: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    customerId: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    sessionId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Session cho khách chưa đăng nhập'
    },
    tableId: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    orderId: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    endedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'ChatbotConversation',
    tableName: 'chatbot_conversations',
    timestamps: true,
    underscored: true,
  });
  return ChatbotConversation;
};
export default ChatbotConversation;