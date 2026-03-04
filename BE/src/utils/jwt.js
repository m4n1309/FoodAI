import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
}

const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString('hex');
}

const verifyAccesssToken = (token) => {
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
  if (token !== storedToken) {
    throw new Error('Invalid refresh token');
  }
  return true;
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
  verifyAccesssToken,
  verifyRefreshToken,
  extractTokenFromHeader
}