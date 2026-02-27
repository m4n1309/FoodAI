'user strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class AdminUser extends Model {
    static associate(models) {
      AdminUser.hasMany(models.Order, { foreignKey: 'confirm_by', as: 'confirmed_orders' })
    }
  }

  AdminUser.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    username: {
      type: DataTypes.SRING(50),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Username cannot be empty' },
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Password cannot be Empty' },
        }
      },
      role: {
        type: DataTypes.ENUM('admin', 'staff', 'kitchen'),
        allowNull: false,
        defaultValue: 'staff',
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      last_login: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    }
  }),
  {
    sequelize,
    modelName: 'AdminUser',
    tableName: 'admin_users',
    timestamps: true,
    underscored: true,
  }
  return AdminUser;
}