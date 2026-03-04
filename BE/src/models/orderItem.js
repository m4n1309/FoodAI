import { Model } from 'sequelize';

module.exports = (sequelize, DataTypes) => {
  class OrderItem extends Model {
    static associate(models) {
      OrderItem.belongsTo(models.Order, {
        foreignKey: 'orderId',
        as: 'order'
      });
      OrderItem.belongsTo(models.MenuItem, {
        foreignKey: 'menuItemId',
        as: 'menuItem'
      });
      OrderItem.belongsTo(models.Combo, {
        foreignKey: 'comboId',
        as: 'combo'
      });
      OrderItem.belongsTo(models.Staff, {
        foreignKey: 'preparedBy',
        as: 'preparer'
      });
      OrderItem.hasMany(models.MenuItemReview, {
        foreignKey: 'orderItemId',
        as: 'reviews'
      });
    }
  }

  OrderItem.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    orderId: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    menuItemId: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    comboId: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    itemType: {
      type: DataTypes.ENUM('menu_item', 'combo'),
      allowNull: false
    },
    itemName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Lưu tên để tránh mất data khi xóa món'
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    totalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    specialInstructions: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Yêu cầu đặc biệt'
    },
    itemStatus: {
      type: DataTypes.ENUM('pending', 'preparing', 'ready', 'served', 'cancelled'),
      defaultValue: 'pending'
    },
    preparedBy: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: 'Nhân viên bếp chuẩn bị'
    },
    preparedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'OrderItem',
    tableName: 'order_items',
    timestamps: true,
  });
  return OrderItem;
};