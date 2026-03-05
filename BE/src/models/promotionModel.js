import { Model } from 'sequelize';

const Promotion = (sequelize, DataTypes) => {
  class Promotion extends Model {
    static associate(models) {
      Promotion.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant'
      });
      Promotion.hasMany(models.PromotionUsage, {
        foreignKey: 'promotionId',
        as: 'usages'
      });
    }
  }

  Promotion.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    restaurantId: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    discountType: {
      type: DataTypes.ENUM('percentage', 'fixed_amount'),
      allowNull: false
    },
    discountValue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    minOrderAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    maxDiscountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    usageLimit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Số lần sử dụng tối đa'
    },
    usageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Số lần đã sử dụng'
    },
    validFrom: {
      type: DataTypes.DATE,
      allowNull: false
    },
    validUntil: {
      type: DataTypes.DATE,
      allowNull: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'Promotion',
    tableName: 'promotions',
    timestamps: true,
    underscored: true
  });
  return Promotion;
};
export default Promotion;