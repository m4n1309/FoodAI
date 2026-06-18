import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import db from '../models/index.js';
import s3Client, { getMinioPublicUrl } from '../config/minio.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from 'redis';

const migrateTableImages = async (Model, modelName) => {
  console.log(`\n--- Migrating ${modelName} images ---`);
  const items = await Model.findAll();
  let migratedCount = 0;

  for (const item of items) {
    const url = item.imageUrl;
    if (!url) continue;

    // Check if it is an unsplash or external image that is not yet migrated to MinIO
    const isExternal = url.startsWith('http') && !url.includes('minio') && !url.includes('m4nfood.site');
    if (!isExternal) {
      console.log(`Skipping ${modelName} "${item.name}" (already migrated or local: ${url})`);
      continue;
    }

    console.log(`Migrating ${modelName} "${item.name}" image from: ${url}`);

    try {
      // Download the image
      const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
      const buffer = Buffer.from(response.data);
      
      // Get Content-Type
      const contentType = response.headers['content-type'] || 'image/jpeg';
      let extension = '.jpg';
      if (contentType.includes('png')) extension = '.png';
      else if (contentType.includes('webp')) extension = '.webp';
      else if (contentType.includes('gif')) extension = '.gif';

      const filename = `migrated-${modelName.toLowerCase()}-${uuidv4()}${extension}`;

      // Upload to MinIO
      await s3Client.send(new PutObjectCommand({
        Bucket: 'menu-images',
        Key: filename,
        Body: buffer,
        ContentType: contentType
      }));

      const newMinioUrl = getMinioPublicUrl('menu-images', filename);
      
      // Update in DB
      await item.update({ imageUrl: newMinioUrl });
      console.log(`Successfully migrated! New URL: ${newMinioUrl}`);
      migratedCount++;
    } catch (err) {
      console.error(`Failed to migrate image for ${modelName} "${item.name}":`, err.message);
    }
  }

  console.log(`Finished ${modelName} migration. Migrated ${migratedCount} images.`);
};

const main = async () => {
  try {
    // 1. Migrate Category
    await migrateTableImages(db.Category, 'Category');

    // 2. Migrate MenuItem
    await migrateTableImages(db.MenuItem, 'MenuItem');

    // 3. Migrate Combo
    await migrateTableImages(db.Combo, 'Combo');

    // 4. Flush Redis Caching to reflect new URLs
    try {
      const redisHost = process.env.REDIS_HOST || '127.0.0.1';
      const redisPort = process.env.REDIS_PORT || 6379;
      const redisUrl = `redis://${redisHost}:${redisPort}`;
      console.log(`\nConnecting to Redis at ${redisUrl} to flush cache...`);
      const redisClient = createClient({ url: redisUrl });
      await redisClient.connect();
      await redisClient.flushAll();
      console.log('Successfully flushed all Redis cache!');
      await redisClient.disconnect();
    } catch (redisErr) {
      console.error('Failed to flush Redis cache:', redisErr.message);
    }

    // 5. Close DB Connection
    await db.sequelize.close();
    console.log('\nMigration process completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    try {
      await db.sequelize.close();
    } catch {}
    process.exit(1);
  }
};

main();
