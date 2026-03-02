'use strict';

const { Model } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  class Staff extends Model {
    static associate(models) {
      Staff.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant'
      });
      Staff.hasMany(models.Order, {
        foreignKey: 'staffId',
        as: 'orders'
      });
      Staff.hasMany(models.OrderItem, {
        foreignKey: 'preparedBy',
        as: 'preparedItems'
      });
      Staff.hasMany(models.Review, {
        foreignKey: 'respondedBy',
        as: 'reviewResponses'
      });
      Staff.hasMany(models.ChatbotMessage, {
        foreignKey: 'senderId',
        as: 'chatMessages'
      });
      Staff.hasMany(models.PaymentHistory, {
        foreignKey: 'processedBy',
        as: 'processedPayments'
      });
      Staff.hasMany(models.ActivityLog, {
        foreignKey: 'staffId',
        as: 'activityLogs'
      });
    }
    async comparePassword(candidatePassword) {
      return await bcrypt.compare(candidatePassword, this.passwordHash);
    }

    toJSON() {
      const values = Object.assign({}, this.get());
      delete values.passwordHash;
      return values;
    }
  }
  Staff.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    restaurantId: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    fullName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    role: {
      type: DataTypes.ENUM('admin', 'manager', 'waiter', 'kitchen', 'cashier'),
      allowNull: false
    },
    avatarUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Staff',
    tableName: 'staff',
    timestamps: true,
    hooks: {
      beforeCreate: async (staff) => {
        if (staff.passwordHash) {
          const salt = await bcrypt.genSalt(10);
          staff.passwordHash = await bcrypt.hash(staff.passwordHash, salt);
        }
      },
      beforeUpdate: async (staff) => {
        if (staff.changed('passwordHash')) {
          const salt = await bcrypt.genSalt(10);
          staff.passwordHash = await bcrypt.hash(staff.passwordHash, salt);
        }
      }
    }
  });
  return Staff;
};