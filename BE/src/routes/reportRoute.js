import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { roleCheck } from '../middleware/roleCheck.js';
import reportController from '../controllers/reportController.js';

const router = express.Router();

// Only admin can access reports, but waiter can access dashboard stats to place orders
router.get('/revenue', authenticate, roleCheck(['admin']), reportController.getRevenueReport);
router.get('/popular-items', authenticate, roleCheck(['admin']), reportController.getPopularItems);
router.get('/dashboard-stats', authenticate, roleCheck(['admin', 'waiter']), reportController.getDashboardStats);

export default router;
