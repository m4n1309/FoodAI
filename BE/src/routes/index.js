import express from 'express';
import authRoute from './authRoute.js';
import categoryRoute from './categoryRoute.js';
import { generateSessionId } from '../utils/session.js';
import { successResponse } from '../utils/ResponseHelper.js';

const router = express.Router();

router.use('/auth', authRoute);
router.use('/categories', categoryRoute);

export default router;