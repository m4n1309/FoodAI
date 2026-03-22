import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../models/index.js';
import {
  generateQRToken,
  parseQRToken,
  generateQRCodeImage,
  generateQRCodeBuffer,
  generateQRScanURL,
  validateQRToken
} from '../utils/qrCodeHelper.js';
import { StatusCodes } from 'http-status-codes';
import { ServiceError } from './serviceError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const qrCodeStorageDir = path.join(__dirname, '..', '..', 'public', 'qrcodes');

const normalizeUrl = (url) => (url || '').replace(/\/$/, '');

const resolveBackendBaseUrl = ({ requestHost } = {}) => {
  const host = String(requestHost || '').trim();

  if (process.env.NODE_ENV === 'development' && host) {
    return `http://${host}`;
  }

  const configured = (process.env.BACKEND_URL || '').trim();
  if (configured) {
    return normalizeUrl(configured);
  }

  if (host) {
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    return `${protocol}://${host}`;
  }

  return `http://localhost:${process.env.PORT || 3000}`;
};

const getQRCodeFilename = (table) => `table-${table.restaurantId}-${table.tableNumber}-qr.png`;

const getQRCodePublicUrl = (table, requestHost) => `${resolveBackendBaseUrl({ requestHost })}/qrcodes/${getQRCodeFilename(table)}`;

const saveQRCodeImage = async (table, qrToken, requestHost) => {
  const scanUrl = generateQRScanURL(qrToken, resolveBackendBaseUrl({ requestHost }));
  const uploadsDir = qrCodeStorageDir;

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filename = getQRCodeFilename(table);
  const filepath = path.join(uploadsDir, filename);
  const qrCodeBuffer = await generateQRCodeBuffer(scanUrl);
  fs.writeFileSync(filepath, qrCodeBuffer);

  return {
    filename,
    scanUrl,
    publicUrl: getQRCodePublicUrl(table, requestHost)
  };
};

const formatTableResponse = (table, requestHost) => {
  const tableData = table.toJSON ? table.toJSON() : { ...table };
  const qrToken = tableData.qrCode;
  const qrPublicUrl = qrToken ? getQRCodePublicUrl(tableData, requestHost) : null;

  return {
    ...tableData,
    qrToken,
    qrCode: qrPublicUrl,
    qrCodeUrl: qrPublicUrl
  };
};

const ensureStaffRestaurantAccess = (staffRestaurantId, targetRestaurantId, message) => {
  if (String(staffRestaurantId) !== String(targetRestaurantId)) {
    throw new ServiceError(message, StatusCodes.FORBIDDEN);
  }
};

const getAllTables = async (query) => {
  const {
    restaurantId,
    status,
    location,
    isActive,
    search,
    sort = 'tableNumber',
    order = 'ASC',
    page = 1,
    limit = 6,
    requestHost
  } = query;

  const where = {};
  if (restaurantId) where.restaurantId = restaurantId;
  if (status) where.status = status;
  if (location) where.location = location;
  if (isActive !== undefined) where.isActive = isActive === 'true';
  if (search) {
    where.tableNumber = {
      [db.Sequelize.Op.iLike]: `%${String(search).trim()}%`
    };
  }

  const numericPage = Math.max(parseInt(page, 10) || 1, 1);
  const numericLimit = Math.max(parseInt(limit, 10) || 6, 1);
  const offset = (numericPage - 1) * numericLimit;

  const { count, rows: tables } = await db.Table.findAndCountAll({
    where,
    include: [{
      model: db.Restaurant,
      as: 'restaurant',
      attributes: ['id', 'name', 'slug']
    }],
    order: [[sort, String(order).toUpperCase()]],
    limit: numericLimit,
    offset
  });

  const formattedTables = tables.map((table) => formatTableResponse(table, requestHost));

  return {
    total: count,
    page: numericPage,
    limit: numericLimit,
    totalPages: Math.ceil(count / numericLimit),
    tables: formattedTables
  };
};

const getTableById = async (id, requestHost) => {
  const table = await db.Table.findByPk(id, {
    include: [{
      model: db.Restaurant,
      as: 'restaurant',
      attributes: ['id', 'name', 'slug', 'address', 'phone']
    }]
  });

  if (!table) {
    throw new ServiceError('Table not found', StatusCodes.NOT_FOUND);
  }

  const isOccupied = await table.isOccupied();
  const currentOrder = isOccupied ? await table.getCurrentOrder() : null;

  const data = formatTableResponse(table, requestHost);
  data.isOccupied = isOccupied;
  data.currentOrder = currentOrder;

  return data;
};

const createTable = async ({ body, staffRestaurantId, requestHost }) => {
  const { restaurantId, tableNumber, capacity, location } = body;

  if (!restaurantId || !tableNumber) {
    throw new ServiceError('Restaurant ID and table number are required', StatusCodes.BAD_REQUEST);
  }

  ensureStaffRestaurantAccess(
    staffRestaurantId,
    restaurantId,
    'You do not have permission to create a table for this restaurant'
  );

  const existingTable = await db.Table.findOne({
    where: { restaurantId, tableNumber }
  });
  if (existingTable) {
    throw new ServiceError('A table with this number already exists in the restaurant', StatusCodes.CONFLICT);
  }

  const tempToken = `QR_${restaurantId}_TEMP_${Date.now()}`;

  const table = await db.Table.create({
    restaurantId,
    tableNumber,
    qrCode: tempToken,
    capacity,
    location
  });

  const qrToken = await generateQRToken(restaurantId, table.id);
  await table.update({ qrCode: qrToken });

  const createdTable = await db.Table.findByPk(table.id, {
    include: [{
      model: db.Restaurant,
      as: 'restaurant',
      attributes: ['id', 'name', 'slug']
    }]
  });

  await saveQRCodeImage(
    createdTable,
    qrToken,
    requestHost
  );

  return formatTableResponse(createdTable, requestHost);
};

const updateTable = async ({ id, updateData, staffRestaurantId, requestHost }) => {
  const table = await db.Table.findByPk(id);
  if (!table) {
    throw new ServiceError('Table not found', StatusCodes.NOT_FOUND);
  }

  ensureStaffRestaurantAccess(
    staffRestaurantId,
    table.restaurantId,
    'You do not have permission to update this table'
  );

  if (updateData.tableNumber && updateData.tableNumber !== table.tableNumber) {
    const existingTable = await db.Table.findOne({
      where: {
        restaurantId: table.restaurantId,
        tableNumber: updateData.tableNumber,
        id: { [db.Sequelize.Op.ne]: id }
      }
    });

    if (existingTable) {
      throw new ServiceError('A table with this number already exists in the restaurant', StatusCodes.CONFLICT);
    }
  }

  const payload = { ...updateData };
  delete payload.qrCode;
  delete payload.restaurantId;

  await table.update(payload);

  const updatedTable = await db.Table.findByPk(id, {
    include: [{
      model: db.Restaurant,
      as: 'restaurant',
      attributes: ['id', 'name', 'slug']
    }]
  });

  await saveQRCodeImage(
    updatedTable,
    table.qrCode,
    requestHost
  );

  return formatTableResponse(updatedTable, requestHost);
};

const deleteTable = async ({ id, staffRestaurantId }) => {
  const table = await db.Table.findByPk(id);
  if (!table) {
    throw new ServiceError('Table not found', StatusCodes.NOT_FOUND);
  }

  ensureStaffRestaurantAccess(
    staffRestaurantId,
    table.restaurantId,
    'You do not have permission to delete this table'
  );

  const occupied = await table.isOccupied();
  if (occupied) {
    throw new ServiceError('Cannot delete an occupied table', StatusCodes.BAD_REQUEST);
  }

  await table.destroy();
};

const updateTableStatus = async ({ id, status, staffRestaurantId }) => {
  if (!['available', 'occupied', 'reserved', 'maintenance'].includes(status)) {
    throw new ServiceError('Invalid status value', StatusCodes.BAD_REQUEST);
  }

  const table = await db.Table.findByPk(id);
  if (!table) {
    throw new ServiceError('Table not found', StatusCodes.NOT_FOUND);
  }

  ensureStaffRestaurantAccess(
    staffRestaurantId,
    table.restaurantId,
    'You do not have permission to update this table'
  );

  await table.update({ status });
  return formatTableResponse(table);
};

const generateTableQRCode = async ({ id, format = 'url', regenerate = false, staffRestaurantId, requestHost }) => {
  const table = await db.Table.findByPk(id);
  if (!table) {
    throw new ServiceError('Bàn không tồn tại', StatusCodes.NOT_FOUND);
  }

  ensureStaffRestaurantAccess(
    staffRestaurantId,
    table.restaurantId,
    'Bạn không có quyền tạo QR code cho bàn này'
  );

  let qrToken = table.qrCode;
  if (regenerate) {
    qrToken = await generateQRToken(table.restaurantId, table.id);
    await table.update({ qrCode: qrToken });
  }

  const { filename, scanUrl, publicUrl } = await saveQRCodeImage(
    table,
    qrToken,
    requestHost
  );

  if (format === 'buffer' || format === 'download') {
    const buffer = await generateQRCodeBuffer(scanUrl);
    return { type: 'buffer', filename, buffer };
  }

  const qrCodeImage = format === 'both' ? await generateQRCodeImage(scanUrl) : null;
  return {
    type: 'json',
    data: {
      tableId: table.id,
      tableNumber: table.tableNumber,
      qrToken,
      qrCode: publicUrl,
      qrCodeUrl: publicUrl,
      qrCodeImage,
      scanUrl,
      filename
    }
  };
};

const getTableByQRCode = async (qrCode) => {
  if (!validateQRToken(qrCode)) {
    throw new ServiceError('Invalid QR code token', StatusCodes.BAD_REQUEST);
  }

  const { restaurantId, tableId } = parseQRToken(qrCode);

  const table = await db.Table.findOne({
    where: { id: tableId, restaurantId, qrCode },
    include: [{
      model: db.Restaurant,
      as: 'restaurant',
      attributes: ['id', 'name', 'slug', 'address', 'phone', 'logoUrl', 'openingHours']
    }]
  });

  if (!table) {
    throw new ServiceError('Table not found', StatusCodes.NOT_FOUND);
  }
  if (!table.isActive) {
    throw new ServiceError('Table is not active', StatusCodes.BAD_REQUEST);
  }

  const isOccupied = await table.isOccupied();
  const currentOrder = isOccupied ? await table.getCurrentOrder() : null;

  const data = formatTableResponse(table);
  data.isOccupied = isOccupied;
  data.currentOrder = currentOrder
    ? { id: currentOrder.id, orderStatus: currentOrder.orderStatus, orderNumber: currentOrder.orderNumber }
    : null;

  return data;
};

const getTableStatusSummary = async (restaurantId) => {
  if (!restaurantId) {
    throw new ServiceError('Restaurant ID is required', StatusCodes.BAD_REQUEST);
  }

  const summary = await db.Table.findAll({
    where: { restaurantId, isActive: true },
    attributes: ['status', [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']],
    group: ['status'],
    raw: true
  });

  const statusCounts = {
    available: 0,
    occupied: 0,
    reserved: 0,
    maintenance: 0,
    total: 0
  };

  summary.forEach((item) => {
    statusCounts[item.status] = parseInt(item.count, 10);
    statusCounts.total += parseInt(item.count, 10);
  });

  return statusCounts;
};

export default {
  getAllTables,
  getTableById,
  createTable,
  updateTable,
  deleteTable,
  updateTableStatus,
  generateTableQRCode,
  getTableByQRCode,
  getTableStatusSummary
};
