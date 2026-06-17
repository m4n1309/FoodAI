import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { roleCheck } from '../middleware/roleCheck.js';
import orderController from '../controllers/orderController.js';
import paymentRoute from './paymentRoute.js';

const router = express.Router();

// Allow admin and waiter to manage orders
const allowedRoles = ['admin', 'waiter'];

// ✅ Get all orders with pagination & filters
router.get('/', authenticate, roleCheck(allowedRoles), orderController.getAllOrders);

// ✅ Create a new order (Staff only)
router.post('/', authenticate, roleCheck(allowedRoles), orderController.createOrder);

// ✅ Get a single order by ID
router.get('/:id', authenticate, roleCheck(allowedRoles), orderController.getOrderById);

// ✅ Update order status
router.patch('/:id/status', authenticate, roleCheck(['admin', 'waiter', 'kitchen']), orderController.updateOrderStatus);

// Mount nested payment route
router.use('/:orderId/payments', paymentRoute);

export default router;
