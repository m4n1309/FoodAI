import s3Client, { getMinioPublicUrl } from '../config/minio.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';

export const uploadImageToMinio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const file = req.file;
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname) || '.jpg';
    const filename = `image-${uniqueSuffix}${ext}`;

    // Upload to MinIO bucket 'menu-images'
    await s3Client.send(new PutObjectCommand({
      Bucket: 'menu-images',
      Key: filename,
      Body: file.buffer,
      ContentType: file.mimetype || 'image/jpeg'
    }));

    const imageUrl = getMinioPublicUrl('menu-images', filename);
    return res.status(200).json({
      message: 'Upload successful',
      url: imageUrl,
      filename
    });
  } catch (error) {
    console.error('MinIO upload controller error:', error);
    return res.status(500).json({
      message: 'Failed to upload image to MinIO',
      error: error.message
    });
  }
};
