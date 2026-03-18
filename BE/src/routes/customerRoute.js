import express from 'express';
import { requireCustomerSession } from '../middleware/customerSession.js';
import customerController from '../controllers/customerController.js';
import customerCartController from '../controllers/customerCartController.js';

const router = express.Router();

// ✅ Bootstrap
router.get('/bootstrap', requireCustomerSession, customerController.bootstrap);

// ✅ Cart
router.post('/cart', requireCustomerSession, customerCartController.createOrGetCart);
router.get('/cart', requireCustomerSession, customerCartController.getCart);

// ✅ Cart items
router.post('/cart/items', requireCustomerSession, customerCartController.addItem);
router.patch('/cart/items/:id', requireCustomerSession, customerCartController.updateItem);
router.delete('/cart/items/:id', requireCustomerSession, customerCartController.removeItem);

export default router;