import { Model } from 'sequelize';

const Table = (sequelize, DataTypes) => {
  class Table extends Model {
    static associate(models) {
      Table.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant'
      })
      Table.hasMany(models.Order, {
        foreignKey: 'tableId',
        as: 'orders'
      })
      Table.hasMany(models.ChatbotConversation, {
        foreignKey: 'tableId',
        as: 'conversations'
      })
    }
    async isOccupied() {
      const Order = sequelize.models.Order;
      const activeOrder = await Order.findOne({
        where: {
          tableId: this.id,
          orderStatus: {
            [sequelize.Sequelize.Op.notIn]: ['completed', 'cancelled', 'cart']
          }
        }
      });
      return !!activeOrder;
    }
    async getCurrentOrder() {
      const Order = sequelize.models.Order;
      return await Order.findOne({
        where: {
          tableId: this.id,
          orderStatus: {
            [sequelize.Sequelize.Op.notIn]: ['completed', 'cancelled']
          }
        },
        order: [['createdAt', 'DESC']]
      });
    }
  }
  Table.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    restaurantId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    tableNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    qrCode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    capacity: {
      type: DataTypes.INTEGER,
      defaultValue: 4,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('available', 'occupied', 'reserved', 'maintenance'),
      defaultValue: 'available',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    sequelize,
    modelName: 'Table',
    tableName: 'tables',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['restaurant_id'] },
      { fields: ['qr_code'], unique: true },
      { fields: ['status'] },
      { 
        fields: ['restaurant_id', 'table_number'],
        unique: true,
        name: 'unique_table'
      }
    ]
  })
  return Table;
}

export default Table;