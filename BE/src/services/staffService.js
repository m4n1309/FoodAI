import db from '../models/index.js';
import { Op } from 'sequelize';
import { StatusCodes } from 'http-status-codes';
import { ServiceError } from './serviceError.js';

const getAllStaffs = async ({ restaurantId, page = 1, limit = 10, search, role, isActive }) => {
  const numericPage = Math.max(parseInt(page, 10) || 1, 1);
  const numericLimit = Math.max(parseInt(limit, 10) || 10, 1);
  const offset = (numericPage - 1) * numericLimit;

  const where = { restaurantId };

  if (role && role !== 'all') {
    where.role = role;
  }

  if (isActive !== undefined && isActive !== 'all') {
    where.isActive = isActive === 'true' || isActive === '1';
  }

  if (search) {
    where[Op.or] = [
      { username: { [Op.like]: `%${search}%` } },
      { fullName: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } }
    ];
  }

  const { count, rows } = await db.Staff.findAndCountAll({
    where,
    limit: numericLimit,
    offset,
    order: [['created_at', 'DESC']],
    attributes: { exclude: ['passwordHash'] }
  });

  return {
    total: count,
    page: numericPage,
    limit: numericLimit,
    totalPages: Math.ceil(count / numericLimit),
    staffs: rows
  };
};

const getStaffById = async (restaurantId, id) => {
  const staff = await db.Staff.findOne({
    where: { id, restaurantId },
    attributes: { exclude: ['passwordHash'] }
  });

  if (!staff) {
    throw new ServiceError('Không tìm thấy tài khoản nhân viên', StatusCodes.NOT_FOUND);
  }

  return staff;
};

const createStaff = async (restaurantId, data) => {
  const { username, password, fullName, email, phone, role, isActive } = data;

  if (!username || !password || !fullName || !role) {
    throw new ServiceError('Thiếu các trường bắt buộc (username, password, fullName, role)', StatusCodes.BAD_REQUEST);
  }

  // Check if username already exists
  const existing = await db.Staff.findOne({ where: { username: username.trim() } });
  if (existing) {
    throw new ServiceError('Tên đăng nhập đã tồn tại trên hệ thống.', StatusCodes.BAD_REQUEST);
  }

  const newStaff = await db.Staff.create({
    restaurantId,
    username: username.trim(),
    passwordHash: password, // hooks will automatically hash this
    fullName: fullName.trim(),
    email: email ? email.trim() : null,
    phone: phone ? phone.trim() : null,
    role,
    isActive: isActive !== undefined ? isActive : true
  });

  return newStaff.toJSON();
};

const updateStaff = async (restaurantId, id, data) => {
  const { username, password, fullName, email, phone, role, isActive } = data;

  const staff = await db.Staff.findOne({
    where: { id, restaurantId }
  });

  if (!staff) {
    throw new ServiceError('Không tìm thấy tài khoản nhân viên', StatusCodes.NOT_FOUND);
  }

  // Check username uniqueness if modified
  if (username && username.trim() !== staff.username) {
    const existing = await db.Staff.findOne({
      where: {
        username: username.trim(),
        id: { [Op.ne]: id }
      }
    });
    if (existing) {
      throw new ServiceError('Tên đăng nhập đã tồn tại.', StatusCodes.BAD_REQUEST);
    }
    staff.username = username.trim();
  }

  if (fullName) staff.fullName = fullName.trim();
  if (email !== undefined) staff.email = email ? email.trim() : null;
  if (phone !== undefined) staff.phone = phone ? phone.trim() : null;
  if (role) staff.role = role;
  if (isActive !== undefined) staff.isActive = isActive;

  // Update password if provided
  if (password && password.trim()) {
    staff.passwordHash = password; // triggers hook to hash
  }

  await staff.save();
  return staff.toJSON();
};

const deleteStaff = async (restaurantId, currentStaffId, id) => {
  // Prevent self-deletion
  if (String(id) === String(currentStaffId)) {
    throw new ServiceError('Bạn không thể tự xóa tài khoản của chính mình!', StatusCodes.BAD_REQUEST);
  }

  const staff = await db.Staff.findOne({
    where: { id, restaurantId }
  });

  if (!staff) {
    throw new ServiceError('Không tìm thấy tài khoản nhân viên', StatusCodes.NOT_FOUND);
  }

  await staff.destroy();
};

export default {
  getAllStaffs,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff
};
