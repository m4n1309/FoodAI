import { redisClient, isConnected } from '../config/redis.js';
import { errorResponse } from '../utils/ResponseHelper.js';
import { StatusCodes } from 'http-status-codes';

/**
 * Redis-based rate limiter middleware.
 * Fails open (allows request to pass) if Redis connection is offline.
 */
export const rateLimiter = (options = {}) => {
  const {
    windowMs = 60 * 1000, // 1 minute
    max = 60,            // limit each IP/Key to 'max' requests per windowMs
    message = 'Bạn đang thao tác quá nhanh. Vui lòng thử lại sau.'
  } = options;

  return async (req, res, next) => {
    if (!isConnected || !redisClient) {
      return next();
    }

    // Identify user by IP or customer session if available
    const identifier = req.headers['x-customer-session'] || req.ip;
    const key = `ratelimit:${identifier}:${req.baseUrl || ''}${req.path}`;

    try {
      const currentCount = await redisClient.incr(key);

      if (currentCount === 1) {
        await redisClient.expire(key, Math.ceil(windowMs / 1000));
      }

      if (currentCount > max) {
        return errorResponse(res, message, StatusCodes.TOO_MANY_REQUESTS);
      }

      next();
    } catch (err) {
      console.error('Rate limiter Redis error:', err.message);
      next(); // Fail open for resilience
    }
  };
};

export default rateLimiter;
