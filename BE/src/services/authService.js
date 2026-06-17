import { Op } from 'sequelize';
import db from '../models/index.js';
import emailHelper from '../utils/emailHelper.js';
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

// In-memory cache for forgot password OTPs
const otpCache = new Map();

const forgotPassword = async ({ email }) => {
  if (!email) {
    throw new ServiceError('Email is required', StatusCodes.BAD_REQUEST);
  }

  // Find staff with email
  const staff = await db.Staff.findOne({
    where: { email }
  });

  if (!staff) {
    throw new ServiceError('Không tìm thấy tài khoản nhân viên nào liên kết với email này.', StatusCodes.NOT_FOUND);
  }

  if (!staff.isActive) {
    throw new ServiceError('Tài khoản này hiện đang bị khóa.', StatusCodes.UNAUTHORIZED);
  }

  // Generate 6-digit OTP code
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  // Store in cache
  otpCache.set(email, {
    otp: otpCode,
    expiresAt
  });

  // Send email
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #1e3a8a; text-align: center;">Yêu Cầu Lấy Lại Mật Khẩu</h2>
      <p>Xin chào <strong>${staff.fullName}</strong>,</p>
      <p>Chúng tôi nhận được yêu cầu lấy lại mật khẩu cho tài khoản nhân viên của bạn tại hệ thống nhà hàng. Mã xác minh OTP của bạn là:</p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #dc2626; background-color: #fef2f2; padding: 10px 20px; border-radius: 8px; border: 1px dashed #fca5a5;">
          ${otpCode}
        </span>
      </div>
      <p style="color: #4b5563; font-size: 14px;">Mã xác minh này có hiệu lực trong vòng <strong>5 phút</strong>. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
      <p style="color: #4b5563; font-size: 14px;">Nếu bạn không yêu cầu hành động này, vui lòng bỏ qua email hoặc liên hệ với quản trị viên.</p>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="font-size: 12px; color: #9ca3af; text-align: center;">Hệ Thống Quản Lý Nhà Hàng Smart KDS</p>
    </div>
  `;

  await emailHelper.sendEmail({
    to: email,
    subject: `[KDS] Mã OTP Lấy Lại Mật Khẩu: ${otpCode}`,
    html: htmlContent
  });

  return { email };
};

const resetPassword = async ({ email, otp, newPassword }) => {
  if (!email || !otp || !newPassword) {
    throw new ServiceError('Tất cả thông tin (email, mã OTP, mật khẩu mới) là bắt buộc.', StatusCodes.BAD_REQUEST);
  }

  // Find staff with email
  const staff = await db.Staff.findOne({
    where: { email }
  });

  if (!staff) {
    throw new ServiceError('Không tìm thấy tài khoản nhân viên nào liên kết với email này.', StatusCodes.NOT_FOUND);
  }

  // Verify OTP
  const cachedData = otpCache.get(email);
  if (!cachedData) {
    throw new ServiceError('Mã OTP không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu mã mới.', StatusCodes.BAD_REQUEST);
  }

  if (cachedData.otp !== String(otp).trim()) {
    throw new ServiceError('Mã OTP không chính xác.', StatusCodes.BAD_REQUEST);
  }

  if (Date.now() > cachedData.expiresAt) {
    otpCache.delete(email);
    throw new ServiceError('Mã OTP đã quá hạn sử dụng (5 phút). Vui lòng yêu cầu mã mới.', StatusCodes.BAD_REQUEST);
  }

  // Update password hash via hooks
  await staff.update({
    passwordHash: newPassword
  });

  // Remove OTP from cache
  otpCache.delete(email);

  // Revoke sessions
  await db.Session.destroy({
    where: { staffId: staff.id }
  });

  return { success: true };
};

export default {
  login,
  logout,
  refreshAccessToken,
  getCurrentStaff,
  getSessions,
  revokeSession,
  forgotPassword,
  resetPassword
};
