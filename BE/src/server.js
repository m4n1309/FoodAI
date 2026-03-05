import express from 'express';
import dotenv, { config } from 'dotenv';
dotenv.config();
import db from './config/database.js';
import routes from './routes/index.js';
import cookieParser from 'cookie-parser';

const app = express();
const PORT = process.env.PORT || 3000;

//middeleware
app.use(express.json());
app.use(cookieParser());

//public routes
app.use(config.API_PREFIX, routes);

//private routes

db.connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
})