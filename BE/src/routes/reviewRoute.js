import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { roleCheck } from '../middleware/roleCheck.js';
import validationMiddleware from '../middleware/validationMiddleware.js';
import reviewController from '../controllers/reviewController.js';

const router = express.Router();

// CUSTOMER / PUBLIC ROUTES
router.get('/restaurant/:restaurantId', reviewController.getRestaurantReviews);
router.get('/menu-item/:menuItemId', reviewController.getMenuItemReviews);

router.post('/menu-item', 
  [
    body('menuItemId').notEmpty().withMessage('Menu Item ID is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5')
  ],
  validationMiddleware,
  reviewController.createMenuItemReview
);

router.post('/',
  [
    body('restaurantId').notEmpty().withMessage('Restaurant ID is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5')
  ],
  validationMiddleware,
  reviewController.createReview
);

// ADMIN / STAFF ROUTES
router.use(authenticate);
router.use(roleCheck(['admin', 'manager', 'staff']));

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

export default router;
