import { Model } from 'sequelize';

module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    static associate(models) {
      Order.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant'
      });
      Order.belongsTo(models.Table, {
        foreignKey: 'tableId',
        as: 'table'
      });
      Order.belongsTo(models.Customer, {
        foreignKey: 'customerId',
        as: 'customer'
      });
      Order.belongsTo(models.Staff, {
        foreignKey: 'staffId',
        as: 'staff'
      });
      Order.hasMany(models.OrderItem, {
        foreignKey: 'orderId',
        as: 'items'
      });
      Order.hasMany(models.Review, {
        foreignKey: 'orderId',
        as: 'reviews'
      });
      Order.hasMany(models.PaymentHistory, {
        foreignKey: 'orderId',
        as: 'paymentHistory'
      });
      Order.hasMany(models.Notification, {
        foreignKey: 'orderId',
        as: 'notifications'
      });
      Order.hasMany(models.PromotionUsage, {
        foreignKey: 'orderId',
        as: 'promotionUsages'
      });
      Order.hasMany(models.ChatbotConversation, {
        foreignKey: 'orderId',
        as: 'conversations'
      });
    }
  }

  Order.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    orderNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Mã đơn hàng'
    },
    restaurantId: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    tableId: {
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
    customerPhone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    customerNote: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Ghi chú của khách'
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      comment: 'Tổng tiền món ăn'
    },
    taxAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      comment: 'Tiền thuế'
    },
    serviceCharge: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      comment: 'Phí phục vụ'
    },
    discountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      comment: 'Giảm giá'
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      comment: 'Tổng cộng'
    },
    paymentMethod: {
      type: DataTypes.ENUM('cash', 'bank_transfer', 'card', 'e_wallet'),
      allowNull: true
    },
    paymentStatus: {
      type: DataTypes.ENUM('pending', 'paid', 'refunded'),
      defaultValue: 'pending'
    },
    paymentProofUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Ảnh chứng từ chuyển khoản'
    },
    orderStatus: {
      type: DataTypes.ENUM('cart', 'pending', 'confirmed', 'preparing', 'ready', 'serving', 'completed', 'cancelled'),
      defaultValue: 'cart'
    },
    cancelledReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    staffId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: 'Nhân viên xử lý'
    },
    sessionId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Session cho khách chưa đăng nhập'
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Order',
    tableName: 'orders',
    timestamps: true,
  });
  return Order;
};