import { Model } from 'sequelize';

const ActivityLog = (sequelize, DataTypes) => {
  class ActivityLog extends Model {
    static associate(models) {
      ActivityLog.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant'
      });
      ActivityLog.belongsTo(models.Staff, {
        foreignKey: 'staffId',
        as: 'staff'
      });
    }
  }
  ActivityLog.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    restaurantId: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    staffId: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    actionType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'order_created, item_completed, payment_processed, etc.'
    },
    entityType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'order, menu_item, etc.'
    },
    entityId: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'ActivityLog',
    tableName: 'activity_logs',
    timestamps: true,
  });
  return ActivityLog;
};

export default ActivityLog;