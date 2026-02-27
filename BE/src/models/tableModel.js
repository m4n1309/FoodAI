'use strict'

const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class Table extends Model {
    static associate(models) {
      Table.belongsTo(models.Restaurant, { foreignKey: 'restaurant_id', as: 'restaurant' })
      Table.hasMany(models.Session, { foreignKey: 'table_id', as: 'sessions' })
    }
  }
  Table.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    restaurant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    table_number: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        notEmpty: true,
      }
    },
    qr_code: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    capacity: {
      type: DataTypes.INTEGER,
      defaultValue: 4,
      validate: {
        min: 1,
      },
    },
    location: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('available', 'occupied', 'reserved', 'maintenance'),
      defaultValue: 'available',
    }
  }
    , {
      sequelize,
      modelName: 'Table',
      tableName: 'tables',
      timestamps: true,
      underscored: true,
    })
  return Table;
}