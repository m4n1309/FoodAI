import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { roleCheck } from '../middleware/roleCheck.js';
import orderController from '../controllers/orderController.js';

const router = express.Router();

// Allow admin, manager, and waiter to manage orders
const allowedRoles = ['admin', 'manager', 'waiter'];

// ✅ Get all orders with pagination & filters
router.get('/', authenticate, roleCheck(allowedRoles), orderController.getAllOrders);

// ✅ Get a single order by ID
router.get('/:id', authenticate, roleCheck(allowedRoles), orderController.getOrderById);

// ✅ Update order status
router.patch('/:id/status', authenticate, roleCheck(allowedRoles), orderController.updateOrderStatus);

export default router;
