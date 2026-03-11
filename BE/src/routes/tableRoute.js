import express from 'express';
const router = express.Router();

import tableController from '../controllers/tableController.js';
import { authenticate } from '../middleware/auth.js';
import { roleCheck } from '../middleware/roleCheck.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PUBLIC ROUTES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Get table by QR code (Customer scan QR)
router.get('/qr/:qrCode', tableController.getTableByQRCode);

// Get all tables (Public for customer to view available tables)
router.get('/', tableController.getAllTables);

// Get table by ID
router.get('/:id', tableController.getTableById);

// Get table status summary
router.get('/status/summary', tableController.getTableStatusSummary);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROTECTED ROUTES - ADMIN & MANAGER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Create table
router.post('/',
  authenticate,
  roleCheck(['admin', 'manager']),
  tableController.createTable
);

// Update table
router.put('/:id',
  authenticate,
  roleCheck(['admin', 'manager']),
  tableController.updateTable
);

// Delete table
router.delete('/:id',
  authenticate,
  roleCheck(['admin']),
  tableController.deleteTable
);

// Update table status
router.patch('/:id/status',
  authenticate,
  roleCheck(['admin', 'manager', 'waiter']),
  tableController.updateTableStatus
);

// Generate/Regenerate QR code
router.post('/:id/qr-code',
  authenticate,
  roleCheck(['admin', 'manager']),
  tableController.generateTableQRCode
);

export default router;