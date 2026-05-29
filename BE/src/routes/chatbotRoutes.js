import express from 'express';
import { query } from '../controllers/chatbotController.js';

const router = express.Router();

router.post('/chat', query);

export default router;
