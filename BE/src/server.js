import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { initSocketHandlers } from './realtime/socketHandlers.js';

dotenv.config();

import sequelize from './config/database.js';
import routes from './routes/index.js';

const app = express();
const PORT = process.env.PORT || 3000;
const frontendOrigin = process.env.FRONTEND_URL || 'http://localhost:5000';

const buildAllowedOrigins = () => {
  const fromEnv = String(process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const origins = new Set([frontendOrigin, ...fromEnv]);

  if (process.env.NODE_ENV === 'development') {
    origins.add('http://localhost:5173');
    origins.add('http://127.0.0.1:5173');
  }

  return origins;
};

const allowedOrigins = buildAllowedOrigins();

const corsOrigin = (origin, callback) => {
  // Allow non-browser tools (curl/Postman) that do not send Origin.
  if (!origin || allowedOrigins.has(origin)) {
    callback(null, true);
    return;
  }

  console.warn(`CORS blocked origin: ${origin}`);
  callback(null, false);
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({
  origin: corsOrigin,
  credentials: true
}));
app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/qrcodes', express.static(path.join(__dirname, '..', 'public', 'qrcodes')));

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

    // ✅ Create HTTP server
    const httpServer = http.createServer(app);

    // ✅ Attach socket.io
    const io = new SocketIOServer(httpServer, {
      cors: {
        origin: corsOrigin,
        credentials: true
      }
    });

    // expose io for controllers (simple approach)
    app.locals.io = io;

    // register socket handlers
    initSocketHandlers(io);

    httpServer.listen(PORT, () => {
      console.log('');
      console.log('╔════════════════════════════════════════╗');
      console.log(`║  Server running on port ${PORT}       ║`);
      console.log('╚════════════════════════════════════════╝');
      console.log(`Allowed CORS origins: ${Array.from(allowedOrigins).join(', ')}`);
      console.log('');
    });
  } catch (error) {
    console.error('Server start failed:', error);
    process.exit(1);
  }
};

startServer();