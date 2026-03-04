import { Model } from 'sequelize';

module.exports = (sequelize, DataTypes) => {
  class MenuItem extends Model {
    static associate(models) {
      MenuItem.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant'
      })
      MenuItem.belongsTo(models.Category, {
        foreignKey: 'categoryId',
        as: 'category'
      })
      MenuItem.hasMany(models.OrderItem, {
        foreignKey: 'menuItemId',
        as: 'orderItems'
      })
      MenuItem.hasMany(models.ComboItem, {
        foreignKey: 'menuItemId',
        as: 'comboItems'
      })
      MenuItem.hasMany(models.MenuItemReview, {
        foreignKey: 'menuItemId',
        as: 'reviews'
      })
    }
  }
  MenuItem.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    restaurantId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    categoryId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    discountPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    imageUrl: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    preparationTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    calories: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    isVegetarian: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isSpicy: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },ingredients: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    allergens: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isAvailable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    isFeatured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },{
    sequelize,
    modelName: 'MenuItem',
    tableName: 'menu_items',
    timestamps: true,
  })
  return MenuItem;
}