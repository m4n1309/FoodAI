import { Model } from 'sequelize';

const RevenueReport = (sequelize, DataTypes) => {
  class RevenueReport extends Model {
    static associate(models) {
      RevenueReport.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant'
      });
    }
  }
  RevenueReport.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    restaurantId: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    reportDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    totalOrders: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    totalRevenue: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00
    },
    totalTax: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00
    },
    totalServiceCharge: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00
    },
    totalDiscount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00
    },
    cashRevenue: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00
    },
    bankTransferRevenue: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00
    },
    cardRevenue: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00
    },
    eWalletRevenue: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00
    },
    averageOrderValue: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    }
  }, {
    sequelize,
    modelName: 'RevenueReport',
    tableName: 'revenue_reports',
    timestamps: true,
  });
  return RevenueReport;
};
export default RevenueReport;