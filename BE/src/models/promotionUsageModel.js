import { Model } from 'sequelize';

module.exports = (sequelize, DataTypes) => {
  class PromotionUsage extends Model {
    static associate(models) {
      PromotionUsage.belongsTo(models.Promotion, {
        foreignKey: 'promotionId',
        as: 'promotion'
      });
      PromotionUsage.belongsTo(models.Order, {
        foreignKey: 'orderId',
        as: 'order'
      });
      PromotionUsage.belongsTo(models.Customer, {
        foreignKey: 'customerId',
        as: 'customer'
      });
    }
  }
  PromotionUsage.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    promotionId: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    orderId: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    customerId: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    discountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    usedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'PromotionUsage',
    tableName: 'promotion_usage',
    timestamps: false,
  });
  return PromotionUsage;
};