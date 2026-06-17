import express from 'express';
import staffController from '../controllers/staffController.js';
import { authenticate } from '../middleware/auth.js';
import { roleCheck } from '../middleware/roleCheck.js';

const router = express.Router();

// Enforce admin-only access for all staff management endpoints
router.use(authenticate);
router.use(roleCheck(['admin']));

router.get('/', staffController.getAllStaffs);
router.get('/:id', staffController.getStaffById);
router.post('/', staffController.createStaff);
router.put('/:id', staffController.updateStaff);
router.delete('/:id', staffController.deleteStaff);

export default router;
