import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { roleCheck } from '../middleware/roleCheck.js';
import kitchenController from '../controllers/kitchenController.js';

const router = express.Router();

// Allow admin, manager, and kitchen to access KDS
const allowedRoles = ['admin', 'manager', 'kitchen'];

router.get('/orders', authenticate, roleCheck(allowedRoles), kitchenController.getActiveOrders);

router.patch('/items/:id/status', authenticate, roleCheck(allowedRoles), kitchenController.updateItemStatus);

export default router;
