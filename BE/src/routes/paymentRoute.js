import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { roleCheck } from '../middleware/roleCheck.js';
import paymentController from '../controllers/paymentController.js';

const router = express.Router({ mergeParams: true });

const allowedRoles = ['admin', 'waiter'];

// Webhook from SePay (public route, authenticated via token in controller)
// Chú ý: Đặt route này TƯƠNG ĐỐI so với /api/payment, hoặc cấu hình router không mergeParams cho cái này
router.post('/sepay-webhook', paymentController.sepayWebhook);

router.get('/', authenticate, roleCheck(allowedRoles), paymentController.getPaymentHistory);
router.post('/', authenticate, roleCheck(allowedRoles), paymentController.createPayment);

export default router;
