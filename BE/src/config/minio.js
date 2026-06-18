import { S3Client, CreateBucketCommand, PutBucketPolicyCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
dotenv.config();

const minioEndpoint = process.env.MINIO_ENDPOINT || '127.0.0.1';
const minioPort = process.env.MINIO_PORT || 9000;
const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
const secretKey = process.env.MINIO_SECRET_KEY || 'minioadminpassword';

// MinIO S3-compatible client configuration
const s3Client = new S3Client({
  endpoint: `http://${minioEndpoint}:${minioPort}`,
  forcePathStyle: true, // Required for MinIO
  region: 'us-east-1', // Dummy region required by AWS SDK
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretKey
  }
});

// Helper to check and create public read-only bucket
export const ensureBucket = async (bucketName) => {
  try {
    // Check if bucket exists
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    console.log(`MinIO bucket "${bucketName}" already exists`);
  } catch (err) {
    // Bucket does not exist, let's create it
    console.log(`MinIO bucket "${bucketName}" not found. Creating...`);
    try {
      await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
      
      // Define public read-only policy for access outside the server
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PublicRead',
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucketName}/*`]
          }
        ]
      };

      await s3Client.send(new PutBucketPolicyCommand({
        Bucket: bucketName,
        Policy: JSON.stringify(policy)
      }));
      console.log(`MinIO bucket "${bucketName}" created and public read-only policy applied successfully`);
    } catch (createErr) {
      console.error(`Failed to create MinIO bucket "${bucketName}":`, createErr.message);
    }
  }
};

// Initialize default buckets
export const initMinioBuckets = async () => {
  if (process.env.NODE_ENV === 'test') return;
  try {
    console.log('Initializing MinIO buckets...');
    await ensureBucket('qrcodes');
    await ensureBucket('menu-images');
  } catch (err) {
    console.error('Failed to initialize MinIO buckets:', err.message);
  }
};

export const getMinioPublicUrl = (bucketName, filename) => {
  const externalUrl = process.env.MINIO_EXTERNAL_URL;
  if (externalUrl) {
    const normalized = externalUrl.replace(/\/$/, '');
    return `${normalized}/${bucketName}/${filename}`;
  }
  const minioEndpoint = process.env.MINIO_ENDPOINT || '127.0.0.1';
  const minioPort = process.env.MINIO_PORT || 9000;
  return `http://${minioEndpoint}:${minioPort}/${bucketName}/${filename}`;
};

export default s3Client;
