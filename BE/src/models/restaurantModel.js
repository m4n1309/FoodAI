'use strict'

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Restaurant extends Model {
    static associate(models) {
      Restaurant.hasMany(models.Table, { foreignKey: 'restaurant_id', as: 'tables' });
    }
  }
}

Restaurant.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Restaurant name cannot be empty' },
    },
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Restaurant address cannot be empty' },
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      isEmail: { msg: 'Invalid email format' },
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  logo_url: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  opening_hours: {
    type: DataTypes.JSON,
    allowNull: true,
  },
},
  {
    sequelize,
    modelName: 'Restaurant',
    tableName: 'restaurants',
    underscored: true,
    timestamps: true,
  }
);
return Restaurant;