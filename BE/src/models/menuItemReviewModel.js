import { Model } from 'sequelize';

const MenuItemReview = (sequelize, DataTypes) => {
  class MenuItemReview extends Model {
    static associate(models) {
      MenuItemReview.belongsTo(models.MenuItem, {
        foreignKey: 'menuItemId',
        as: 'menuItem'
      });
      MenuItemReview.belongsTo(models.OrderItem, {
        foreignKey: 'orderItemId',
        as: 'orderItem'
      });
      MenuItemReview.belongsTo(models.Customer, {
        foreignKey: 'customerId',
        as: 'customer'
      });
    }
  }
  MenuItemReview.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    menuItemId: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    orderItemId: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    customerId: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5
      }
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'MenuItemReview',
    tableName: 'menu_item_reviews',
    timestamps: true,
    updatedAt: false,
    underscored: true
  });
  return MenuItemReview;
};
export default MenuItemReview;