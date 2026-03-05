import express from 'express';
import authRoute from './authRoute.js';
import { generateSessionId } from '../utils/session.js';
import { successResponse } from '../utils/ResponseHelper.js';

const router = express.Router();

router.use('/auth', authRoute);

router.get('/session', (req, res) => {
  const sessionId = generateSessionId();
  return successResponse(res, {
    sessionId,
    message: 'Session ID generated successfully'
  }, 'Session ID generated successfully');
})

export default router;