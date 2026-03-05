import { Model } from 'sequelize';

const Session = (sequelize, DataTypes) => {
  class Session extends Model {
    static associate(models) {
      Session.belongsTo(models.Staff, {
        foreignKey: 'staffId',
        as: 'staff'
      });
    }
    isExpired() {
      return new Date() > this.expiresAt;
    }
    async revoke() {
      await this.destroy();
    }
  }

  Session.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    staffId: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    refreshToken: {
      type: DataTypes.STRING(500),
      allowNull: false,
      unique: true,
      comment: 'Hashed refresh token'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Thời gian hết hạn'
    }
  }, {
    sequelize,
    modelName: 'Session',
    tableName: 'sessions',
    timestamps: true,
  });

  return Session;
};
export default Session;