import express from 'express';
import multer from 'multer';
import { uploadImageToMinio } from '../controllers/uploadController.js';
import { authenticate } from '../middleware/auth.js';
import { roleCheck } from '../middleware/roleCheck.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

router.post('/', authenticate, roleCheck(['admin', 'staff', 'kitchen']), upload.single('image'), uploadImageToMinio);

export default router;
