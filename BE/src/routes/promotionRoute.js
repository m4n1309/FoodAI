import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { roleCheck } from '../middleware/roleCheck.js';
import validationMiddleware from '../middleware/validationMiddleware.js';
import promotionController from '../controllers/promotionController.js';

const router = express.Router();

const promotionValidation = [
  body('code').notEmpty().withMessage('Promotion code is required'),
  body('name').notEmpty().withMessage('Promotion name is required'),
  body('discountType').isIn(['percentage', 'fixed_amount']).withMessage('Invalid discount type'),
  body('discountValue').isNumeric().withMessage('Discount value must be a number'),
  body('validFrom').isISO8601().withMessage('Valid from must be a valid date'),
  body('validUntil').isISO8601().withMessage('Valid until must be a valid date')
];

// PUBLIC / CUSTOMER Route
router.get('/public/:restaurantId', promotionController.getAvailablePromotions);

router.post('/validate', 
  [
    body('code').notEmpty().withMessage('Code is required'),
    body('restaurantId').notEmpty().withMessage('Restaurant ID is required')
  ],
  validationMiddleware,
  promotionController.validatePromotion
);

// ADMIN / STAFF Routes
router.use(authenticate);
router.use(roleCheck(['admin', 'manager']));

router.get('/', promotionController.getPromotions);
router.get('/:id', promotionController.getPromotionById);

router.post('/', promotionValidation, validationMiddleware, promotionController.createPromotion);
router.put('/:id', promotionValidation, validationMiddleware, promotionController.updatePromotion);
router.delete('/:id', promotionController.deletePromotion);

export default router;
