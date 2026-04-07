import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { roleCheck } from '../middleware/roleCheck.js';
import reportController from '../controllers/reportController.js';

const router = express.Router();

// Only admin and manager can access reports
router.get('/revenue', authenticate, roleCheck(['admin', 'manager']), reportController.getRevenueReport);
router.get('/popular-items', authenticate, roleCheck(['admin', 'manager']), reportController.getPopularItems);

export default router;
