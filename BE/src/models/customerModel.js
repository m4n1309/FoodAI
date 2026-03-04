import { Model } from 'sequelize';

module.exports = (sequelize, DataTypes) => {
  class Customer extends Model {
    static associate(models) {
      Customer.hasMany(models.Order, {
        foreignKey: 'customerId',
        as: 'orders'
      });
      Customer.hasMany(models.Review, {
        foreignKey: 'customerId',
        as: 'reviews'
      });
      Customer.hasMany(models.MenuItemReview, {
        foreignKey: 'customerId',
        as: 'menuItemReviews'
      });
      Customer.hasMany(models.ChatbotConversation, {
        foreignKey: 'customerId',
        as: 'conversations'
      });
      Customer.hasMany(models.PromotionUsage, {
        foreignKey: 'customerId',
        as: 'promotionUsages'
      });
    }
  }
  Customer.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    fullName: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    avatarUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    loyaltyPoints: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Điểm tích lũy'
    },
    totalOrders: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    totalSpent: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00
    }
  }, {
    sequelize,
    modelName: 'Customer',
    tableName: 'customers',
    timestamps: true,
  });
  return Customer;
};