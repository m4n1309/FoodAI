import { Op } from 'sequelize';
import db from '../models/index.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} from '../utils/jwt.js';
import { StatusCodes } from 'http-status-codes';
import { ServiceError } from './serviceError.js';

const getRefreshSessionExpiryMs = () => {
  const raw = String(process.env.JWT_REFRESH_EXPIRE || '7d').trim();

  const dayMatch = raw.match(/^(\d+)d$/i);
  if (dayMatch) {
    return Number(dayMatch[1]) * 24 * 60 * 60 * 1000;
  }

  const numericDays = Number(raw);
  if (Number.isFinite(numericDays) && numericDays > 0) {
    return numericDays * 24 * 60 * 60 * 1000;
  }

  return 7 * 24 * 60 * 60 * 1000;
};

const buildTokenPayload = (staff) => ({
  id: staff.id,
  username: staff.username,
  restaurantId: staff.restaurantId,
  role: staff.role
});

const login = async ({ username, password }) => {
  const staff = await db.Staff.findOne({
    where: { username },
    include: [{
      model: db.Restaurant,
      as: 'restaurant',
      attributes: ['id', 'name', 'slug', 'isActive']
    }]
  });

  if (!staff) {
    throw new ServiceError('User not found', StatusCodes.NOT_FOUND);
  }
  if (!staff.isActive) {
    throw new ServiceError('User is inactive', StatusCodes.UNAUTHORIZED);
  }

  const isPasswordValid = await staff.comparePassword(password);
  if (!isPasswordValid) {
    throw new ServiceError('Invalid password', StatusCodes.UNAUTHORIZED);
  }

  const payload = buildTokenPayload(staff);
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await db.Session.create({
    staffId: staff.id,
    refreshToken,
    expiresAt: new Date(Date.now() + getRefreshSessionExpiryMs())
  });

  await staff.update({ lastLogin: new Date() });

  return {
    accessToken,
    refreshToken,
    staff: staff.toJSON()
  };
};

const logout = async ({ staffId, refreshToken }) => {
  if (!refreshToken) return;

  await db.Session.destroy({
    where: {
      refreshToken,
      staffId
    }
  });
};

const refreshAccessToken = async ({ refreshToken }) => {
  if (!refreshToken) {
    throw new ServiceError('No refresh token provided', StatusCodes.UNAUTHORIZED);
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new ServiceError('Invalid refresh token', StatusCodes.UNAUTHORIZED);
  }

  const session = await db.Session.findOne({
    where: {
      refreshToken,
      staffId: decoded.id
    }
  });

  if (!session) {
    throw new ServiceError('Refresh token not found', StatusCodes.UNAUTHORIZED);
  }

  if (session.isExpired()) {
    await session.destroy();
    throw new ServiceError('Refresh token expired', StatusCodes.UNAUTHORIZED);
  }

  const staff = await db.Staff.findByPk(decoded.id);
  if (!staff) {
    throw new ServiceError('User not found', StatusCodes.NOT_FOUND);
  }
  if (!staff.isActive) {
    throw new ServiceError('User is inactive', StatusCodes.UNAUTHORIZED);
  }

  const payload = buildTokenPayload(staff);
  const accessToken = generateAccessToken(payload);

  return {
    accessToken,
    refreshToken,
    expiresIn: process.env.JWT_EXPIRE || process.env.JWT_EXPIRES_IN || '15m'
  };
};

const getCurrentStaff = async ({ staffId }) => {
  const staff = await db.Staff.findByPk(staffId, {
    attributes: { exclude: ['passwordHash'] },
    include: [{
      model: db.Restaurant,
      as: 'restaurant',
      attributes: ['id', 'name', 'slug', 'address', 'phone', 'email', 'logoUrl']
    }]
  });

  if (!staff) {
    throw new ServiceError('User not found', StatusCodes.NOT_FOUND);
  }

  return staff;
};

const getSessions = async ({ staffId }) => {
  return db.Session.findAll({
    where: {
      staffId,
      expiresAt: { [Op.gt]: new Date() }
    },
    attributes: ['id', 'refreshToken', 'expiresAt', 'created_at'],
    order: [['created_at', 'DESC']]
  });
};

const revokeSession = async ({ staffId, sessionId }) => {
  const session = await db.Session.findOne({
    where: {
      id: sessionId,
      staffId
    }
  });

  if (!session) {
    throw new ServiceError('Session not found', StatusCodes.NOT_FOUND);
  }

  await session.destroy();
};

export default {
  login,
  logout,
  refreshAccessToken,
  getCurrentStaff,
  getSessions,
  revokeSession
};
