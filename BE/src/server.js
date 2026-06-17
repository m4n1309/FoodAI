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

const isPrivateLanOrigin = (origin) => {
  if (!origin) return false;

  try {
    const parsed = new URL(origin);
    const host = parsed.hostname;

    if (['localhost', '127.0.0.1', '::1'].includes(host)) {
      return true;
    }

    if (host.startsWith('192.168.')) {
      return true;
    }

    if (host.startsWith('10.')) {
      return true;
    }

    if (host.startsWith('172.')) {
      const second = Number(host.split('.')[1]);
      if (Number.isInteger(second) && second >= 16 && second <= 31) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
};

const corsOrigin = (origin, callback) => {
  const allowPrivateLanInDev =
    process.env.NODE_ENV === 'development' &&
    String(process.env.CORS_ALLOW_PRIVATE_LAN || 'true').toLowerCase() !== 'false';

  // Allow non-browser tools (curl/Postman) that do not send Origin.
  if (!origin || allowedOrigins.has(origin) || (allowPrivateLanInDev && isPrivateLanOrigin(origin))) {
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

    // Recreate sp_calculate_order_total to exclude cancelled items from calculation
    console.log('Updating stored procedure sp_calculate_order_total...');
    await sequelize.query('DROP PROCEDURE IF EXISTS sp_calculate_order_total');
    await sequelize.query(`
      CREATE PROCEDURE sp_calculate_order_total(
          IN p_order_id BIGINT
      )
      BEGIN
          DECLARE v_subtotal DECIMAL(10,2);
          DECLARE v_tax_rate DECIMAL(5,2);
          DECLARE v_service_rate DECIMAL(5,2);
          DECLARE v_tax_amount DECIMAL(10,2);
          DECLARE v_service_charge DECIMAL(10,2);
          DECLARE v_total DECIMAL(10,2);
          
          SELECT COALESCE(SUM(total_price), 0) INTO v_subtotal
          FROM order_items
          WHERE order_id = p_order_id AND item_status != 'cancelled';
          
          SELECT r.tax_rate, r.service_charge_rate
          INTO v_tax_rate, v_service_rate
          FROM orders o
          JOIN restaurants r ON o.restaurant_id = r.id
          WHERE o.id = p_order_id;
          
          SET v_tax_amount = v_subtotal * v_tax_rate / 100;
          SET v_service_charge = v_subtotal * v_service_rate / 100;
          SET v_total = v_subtotal + v_tax_amount + v_service_charge;
          
          UPDATE orders
          SET subtotal = v_subtotal,
              tax_amount = v_tax_amount,
              service_charge = v_service_charge,
              total_amount = v_total
          WHERE id = p_order_id;
      END
    `);
    console.log('Stored procedure sp_calculate_order_total updated successfully.');

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
// Trigger nodemon restart to reload .env configuration