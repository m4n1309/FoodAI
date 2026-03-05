import { Model } from 'sequelize';

const Combo = (sequelize, DataTypes) => {
  class Combo extends Model {
    static associate(models) {
      Combo.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant'
      });
      Combo.hasMany(models.ComboItem, {
        foreignKey: 'comboId',
        as: 'items'
      });
      Combo.hasMany(models.OrderItem, {
        foreignKey: 'comboId',
        as: 'orderItems'
      });
    }
  }
  Combo.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    restaurantId: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    discountPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    imageUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    isAvailable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    validFrom: {
      type: DataTypes.DATE,
      allowNull: true
    },
    validUntil: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Combo',
    tableName: 'combos',
    timestamps: true,
    underscored: true,
  });
  return Combo;
};
export default Combo;