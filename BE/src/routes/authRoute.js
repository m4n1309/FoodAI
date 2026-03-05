import express from 'express';
import authController from '../controllers/authController.js';
import { validateRefreshToken, validateLogin } from '../utils/validator.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', validateLogin, authController.login);

router.post('/logout', authenticate, authController.logout);

router.post('/refresh-token', validateRefreshToken, authController.refreshAccessToken);

router.get('/me', authenticate, authController.getCurStaff);

router.get('/sessions', authenticate, authController.getSessions);

router.delete('/sessions/:sessionId', authenticate, authController.revokeSession);

export default router;