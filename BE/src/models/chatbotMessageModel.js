import { Model } from 'sequelize';

const ChatbotMessage = (sequelize, DataTypes) => {
  class ChatbotMessage extends Model {
    static associate(models) {
      ChatbotMessage.belongsTo(models.ChatbotConversation, {
        foreignKey: 'conversationId',
        as: 'conversation'
      });
      ChatbotMessage.belongsTo(models.Staff, {
        foreignKey: 'senderId',
        as: 'sender'
      });
    }
  }

  ChatbotMessage.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    conversationId: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    senderType: {
      type: DataTypes.ENUM('customer', 'bot', 'staff'),
      allowNull: false
    },
    senderId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: 'ID của staff nếu là nhân viên'
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    messageType: {
      type: DataTypes.ENUM('text', 'image', 'menu_recommendation', 'order_status'),
      defaultValue: 'text'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Thông tin bổ sung'
    }
  }, {
    sequelize,
    modelName: 'ChatbotMessage',
    tableName: 'chatbot_messages',
    timestamps: true,
    underscored: true,
  });
  return ChatbotMessage;
};
export default ChatbotMessage;