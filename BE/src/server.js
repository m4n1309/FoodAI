import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';

dotenv.config();

import sequelize from './config/database.js';
import routes from './routes/index.js';

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5000',
  credentials: true 
}));


app.use(cookieParser());


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}
app.get('/', (req, res) => {
  res.json({ 
    message: 'Restaurant QR Ordering API', 
    status: 'running',
    timestamp: new Date() 
  });
});

app.use('/', routes);

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected');
    
    app.listen(PORT, () => {
      console.log('');
      console.log('╔════════════════════════════════════════╗');
      console.log(`║  Server running on port ${PORT}       ║`);
      console.log('╚════════════════════════════════════════╝');
      console.log('');
    });
  } catch (error) {
    console.error('Server start failed:', error);
    process.exit(1);
  }
};

startServer();