import express from 'express';
const router = express.Router();

import categoryController from '../controllers/categoryController.js';
import { authenticate } from '../middleware/auth.js';
import { roleCheck } from '../middleware/roleCheck.js';

//PUBLIC ROUTES
router.get( '/', categoryController.getAllCategories);
router.get( '/:id', categoryController.getCategoryById);

//PROTECTED ROUTES
router.post( '/', authenticate, roleCheck(['admin']), categoryController.createCategory);
router.put( '/:id', authenticate, roleCheck(['admin']), categoryController.updateCategory);
router.delete( '/:id', authenticate, roleCheck(['admin']), categoryController.deleteCategory);
router.patch( '/:id/toggle', authenticate, roleCheck(['admin']), categoryController.toggleCategoryStatus);
router.post( '/reorder', authenticate, roleCheck(['admin']), categoryController.reorderCategories);

export default router;