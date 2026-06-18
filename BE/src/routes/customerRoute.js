import express from 'express';
import { requireCustomerSession } from '../middleware/customerSession.js';
import customerController from '../controllers/customerController.js';
import customerCartController from '../controllers/customerCartController.js';
import chatbotController from '../controllers/chatbotController.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// ✅ Bootstrap & Check-in
router.get('/bootstrap', requireCustomerSession, customerController.bootstrap);
router.post('/check-in', requireCustomerSession, rateLimiter({ max: 5, windowMs: 60000, message: 'Đăng nhập quá nhanh. Vui lòng đợi 1 phút.' }), customerController.checkIn);

// ✅ Cart
router.post('/cart', requireCustomerSession, customerCartController.createOrGetCart);
router.get('/cart', requireCustomerSession, customerCartController.getCart);

// ✅ Cart items
router.post('/cart/items', requireCustomerSession, customerCartController.addItem);
router.patch('/cart/items/:id', requireCustomerSession, customerCartController.updateItem);
router.delete('/cart/items/:id', requireCustomerSession, customerCartController.removeItem);

// ✅ Place order (cart → pending)
router.get('/orders/active', requireCustomerSession, customerCartController.getActiveOrder);
router.get('/orders/history', requireCustomerSession, customerController.getOrderHistory);
router.post('/orders', requireCustomerSession, rateLimiter({ max: 5, windowMs: 60000, message: 'Bạn đang đặt đơn quá nhanh. Vui lòng đợi 1 phút.' }), customerCartController.placeOrder);

// ✅ Add items to active order (no new cart)
router.post('/orders/active/items', requireCustomerSession, customerCartController.addItemToActiveOrder);

// ✅ Request payment
router.post('/orders/:orderId/request-payment', requireCustomerSession, customerCartController.requestPayment);

// ✅ Chatbot (RAG)
router.post('/chatbot/query', requireCustomerSession, chatbotController.query);

export default router;