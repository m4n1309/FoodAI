import express from 'express';
import comboController from '../controllers/comboController.js';
import { authenticate } from '../middleware/auth.js';
import { roleCheck } from '../middleware/roleCheck.js';

const router = express.Router();

// Public routes (can be used by customer)
router.get('/', comboController.getAllCombos);
router.get('/:id', comboController.getComboById);

// Protected routes (admin/manager)
router.post('/', authenticate, roleCheck(['admin', 'manager']), comboController.createCombo);
router.put('/:id', authenticate, roleCheck(['admin', 'manager']), comboController.updateCombo);
router.delete('/:id', authenticate, roleCheck(['admin', 'manager']), comboController.deleteCombo);
router.patch('/:id/toggle-availability', authenticate, roleCheck(['admin', 'manager']), comboController.toggleAvailability);

export default router;
