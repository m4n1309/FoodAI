import express from 'express';
import authRoute from './authRoute.js';
import categoryRoute from './categoryRoute.js';
import menuItemRoute from './menuItemRoute.js';
import tableRoute from './tableRoute.js';
import customerRoute from './customerRoute.js'; // ✅ NEW
import orderRoute from './orderRoute.js';

const router = express.Router();

router.use('/auth', authRoute);
router.use('/categories', categoryRoute);
router.use('/menu-items', menuItemRoute);
router.use('/tables', tableRoute);
router.use('/customer', customerRoute); // ✅ NEW
router.use('/orders', orderRoute);

export default router;