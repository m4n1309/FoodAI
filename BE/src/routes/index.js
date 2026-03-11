import express from 'express';
import authRoute from './authRoute.js';
import categoryRoute from './categoryRoute.js';
import menuItemRoute from './menuItemRoute.js';

const router = express.Router();

router.use('/auth', authRoute);
router.use('/categories', categoryRoute);
router.use('/menu-items', menuItemRoute);

export default router;