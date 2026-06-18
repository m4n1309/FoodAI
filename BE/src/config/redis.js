import { createClient } from 'redis';
import dotenv from 'dotenv';
dotenv.config();

const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = process.env.REDIS_PORT || 6379;

let redisClient = null;
let isConnected = false;

if (process.env.NODE_ENV !== 'test') {
  redisClient = createClient({
    url: `redis://${redisHost}:${redisPort}`
  });

  redisClient.on('error', (err) => {
    console.error('Redis client error:', err.message);
    isConnected = false;
  });

  redisClient.on('connect', () => {
    console.log('Redis client connecting...');
  });

  redisClient.on('ready', () => {
    console.log('Redis client connected and ready');
    isConnected = true;
  });

  redisClient.connect().catch((err) => {
    console.error('Failed to connect to Redis:', err.message);
    isConnected = false;
  });
}

export const getCache = async (key) => {
  if (!isConnected || !redisClient) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error(`Error getting cache for key ${key}:`, err.message);
    return null;
  }
};

export const setCache = async (key, value, ttlSeconds = 300) => {
  if (!isConnected || !redisClient) return false;
  try {
    const serialized = JSON.stringify(value);
    await redisClient.set(key, serialized, {
      EX: ttlSeconds
    });
    return true;
  } catch (err) {
    console.error(`Error setting cache for key ${key}:`, err.message);
    return false;
  }
};

export const deleteCache = async (key) => {
  if (!isConnected || !redisClient) return false;
  try {
    await redisClient.del(key);
    return true;
  } catch (err) {
    console.error(`Error deleting cache for key ${key}:`, err.message);
    return false;
  }
};

export const deleteCachePattern = async (pattern) => {
  if (!isConnected || !redisClient) return false;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    return true;
  } catch (err) {
    console.error(`Error deleting cache pattern ${pattern}:`, err.message);
    return false;
  }
};

export { redisClient, isConnected };
