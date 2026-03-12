import express from 'express';
const router = express.Router();

import menuItemController from '../controllers/menuItemController.js';
import { authenticate } from '../middleware/auth.js';
import { roleCheck  } from '../middleware/roleCheck.js';


//PUBLIC ROUTES
router.get('/', menuItemController.getAllMenuItems);
router.get('/:id', menuItemController.getMenuItemById);
router.get('/featured', menuItemController.getFeaturedMenuItems);

//ADMIN ROUTES
router.post('/', authenticate, roleCheck(['admin']), menuItemController.createMenuItem);
router.put('/:id', authenticate, roleCheck(['admin']), menuItemController.updateMenuItem);
router.delete('/:id', authenticate, roleCheck(['admin']), menuItemController.deleteMenuItem);
router.patch('/:id/featured', authenticate, roleCheck(['admin']), menuItemController.toggleMenuItemFeatured);
router.patch('/:id/availability', authenticate, roleCheck(['admin']), menuItemController.toggleMenuItemAvailability);

export default router;
