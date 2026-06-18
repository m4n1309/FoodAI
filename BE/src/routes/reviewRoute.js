import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { roleCheck } from '../middleware/roleCheck.js';
import validationMiddleware from '../middleware/validationMiddleware.js';
import reviewController from '../controllers/reviewController.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// CUSTOMER / PUBLIC ROUTES
router.get('/restaurant/:restaurantId', reviewController.getRestaurantReviews);
router.get('/menu-item/:menuItemId', reviewController.getMenuItemReviews);

router.post('/menu-item', 
  rateLimiter({ max: 5, windowMs: 60000, message: 'Đánh giá quá nhanh. Vui lòng đợi 1 phút.' }),
  [
    body('menuItemId').notEmpty().withMessage('Menu Item ID is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5')
  ],
  validationMiddleware,
  reviewController.createMenuItemReview
);

router.post('/',
  rateLimiter({ max: 5, windowMs: 60000, message: 'Đánh giá quá nhanh. Vui lòng đợi 1 phút.' }),
  [
    body('restaurantId').notEmpty().withMessage('Restaurant ID is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5')
  ],
  validationMiddleware,
  reviewController.createReview
);

// ADMIN / STAFF ROUTES
router.use(authenticate);
router.use(roleCheck(['admin', 'waiter']));

router.get('/admin/all', reviewController.getAllReviewsAdmin);

router.put('/:id/status',
  [
    body('isPublished').isBoolean().withMessage('isPublished must be a boolean')
  ],
  validationMiddleware,
  reviewController.updateReviewStatus
);

router.put('/:id/respond',
  [
    body('response').notEmpty().withMessage('Response text is required')
  ],
  validationMiddleware,
  reviewController.respondToReview
);

router.put('/menu-item/:id/respond',
  [
    body('response').notEmpty().withMessage('Response text is required')
  ],
  validationMiddleware,
  reviewController.respondToMenuItemReview
);

export default router;
