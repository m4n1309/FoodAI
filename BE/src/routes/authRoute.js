import express from 'express';
import authController from '../controllers/authController.js';
import { validateSignIn, validateRefreshToken } from '../utils/validator.js';


const router = express.Router();

router.post('/sinup', singnUp);

export default router;