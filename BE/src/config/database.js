import { Sequelize } from 'sequelize';

import dotenv from 'dotenv';
dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',

    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },

    logging: process.env.NODE_ENV === 'development' ? console.log : false,

    timezone: '+07:00',

    define: {
      timestamps: true,
      underscored: false,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  }
);
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connecttion successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
}

const syncDatabase = async (options = {}) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync(options);
    }
  } catch (error) {
    console.error('Error syncing database:', error);
    throw error;
  }
}

export default sequelize;

export {
  connectDB,
  syncDatabase
};
