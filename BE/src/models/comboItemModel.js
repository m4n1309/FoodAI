import { Model } from 'sequelize';

const ComboItem = (sequelize, DataTypes) => {
  class ComboItem extends Model {
    static associate(models) {
      ComboItem.belongsTo(models.Combo, {
        foreignKey: 'comboId',
        as: 'combo'
      });
      ComboItem.belongsTo(models.MenuItem, {
        foreignKey: 'menuItemId',
        as: 'menuItem'
      });
    }
  }
  ComboItem.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    comboId: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    menuItemId: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    }
  }, {
    sequelize,
    modelName: 'ComboItem',
    tableName: 'combo_items',
    timestamps: false,
    underscored: true,
  });

  return ComboItem;
};
export default ComboItem;