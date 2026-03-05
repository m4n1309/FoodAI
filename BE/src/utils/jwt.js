import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const generateAccessToken = (payload) => {
  const expiresIn = process.env.JWT_EXPIRES_IN || '15m';
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}

const generateRefreshToken = (payload) => {
  const expiresIn = process.env.JWT_REFRESH_EXPIRE || '7d';
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn });
}

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Access token expired');
    } else {
      throw new Error('Invalid access token');
    }
    throw error;
  }
}

const verifyRefreshToken = (token, storedToken) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token expired');
    } else {
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
}

const extractTokenFromHeader = (header) => {
  if (!header) {
    return null;
  }
  const parts = header.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  return parts[1];
}

export {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  extractTokenFromHeader
}