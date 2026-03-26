import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { roleCheck } from '../middleware/roleCheck.js';
import paymentController from '../controllers/paymentController.js';

const router = express.Router({ mergeParams: true });

const allowedRoles = ['admin', 'manager', 'cashier', 'waiter'];

router.get('/', authenticate, roleCheck(allowedRoles), paymentController.getPaymentHistory);
router.post('/', authenticate, roleCheck(allowedRoles), paymentController.createPayment);

export default router;
