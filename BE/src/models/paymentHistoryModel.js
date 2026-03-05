import { Model } from 'sequelize';

const PaymentHistory = (sequelize, DataTypes) => {
  class PaymentHistory extends Model {
    static associate(models) {
      PaymentHistory.belongsTo(models.Order, {
        foreignKey: 'orderId',
        as: 'order'
      });
      PaymentHistory.belongsTo(models.Staff, {
        foreignKey: 'processedBy',
        as: 'processor'
      });
    }
  }
  PaymentHistory.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    orderId: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    paymentMethod: {
      type: DataTypes.ENUM('cash', 'bank_transfer', 'card', 'e_wallet'),
      allowNull: false
    },
    paymentStatus: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
      defaultValue: 'pending'
    },
    transactionId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Mã giao dịch từ ngân hàng/ví điện tử'
    },
    paymentProofUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    processedBy: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: 'Nhân viên xử lý'
    }
  }, {
    sequelize,
    modelName: 'PaymentHistory',
    tableName: 'payment_history',
    timestamps: true,
    underscored: true,
  });
  return PaymentHistory;
};
export default PaymentHistory;