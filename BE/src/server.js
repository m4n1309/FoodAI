
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const { testDatabaseConnection } = require('./config/database');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send(' <h1>Welcome to the Restaurant QR Code Ordering System API</h1><p>Use the /health endpoint to check server status.</p>');
})

io.on('connection', (socket) => {

  socket.on('join:admin', () => {
    socket.join('admin-room');
  });

  socket.on('join:kitchen', () => {
    socket.join('kitchen-room');
  });

  socket.on('join:table', (tableNumber) => {
    socket.join(`table-${tableNumber}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await testDatabaseConnection();

    server.listen(PORT, () => {
      console.log('');
      console.log('============================================');
      console.log('SERVER IS RUNNING');
      console.log('============================================');
      console.log(`Port: ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`http://localhost:${PORT}`);
      console.log(`http://localhost:${PORT}/health`);
      
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}


startServer();

module.exports = { app, io };