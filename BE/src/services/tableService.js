import fs from 'fs';
import os from 'os';
import path from 'path';
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

const getBackendBaseUrl = () => {
  return process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
};

const getQRCodeFilename = (table) => `table-${table.restaurantId}-${table.tableNumber}-qr.png`;

const getQRCodePublicUrl = (table) => `${getBackendBaseUrl()}/qrcodes/${getQRCodeFilename(table)}`;

const getLanIPv4 = () => {
  const nets = os.networkInterfaces();

  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family !== 'IPv4' || net.internal) continue;
      return net.address;
    }
  }

  return null;
};

const normalizeUrl = (url) => (url || '').replace(/\/$/, '');

const resolveFrontendBaseUrl = ({ requestHost }) => {
  const configured = (process.env.FRONTEND_URL || '').trim();

  if (configured) {
    try {
      const parsed = new URL(configured);
      const isLocalConfig = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);

      if (process.env.NODE_ENV === 'development') {
        parsed.protocol = 'http:';
      }

      if (process.env.NODE_ENV === 'development' && isLocalConfig) {
        const lanIp = getLanIPv4();
        if (lanIp) parsed.hostname = lanIp;
      }

      return normalizeUrl(parsed.toString());
    } catch {
      return normalizeUrl(configured);
    }
  }

  const hostName = String(requestHost || '').split(':')[0];
  const lanIp = hostName && !['localhost', '127.0.0.1', '::1'].includes(hostName)
    ? hostName
    : (getLanIPv4() || 'localhost');

  return `http://${lanIp}:5173`;
};

const saveQRCodeImage = async (table, qrToken, frontendBaseUrl) => {
  const scanUrl = generateQRScanURL(qrToken, frontendBaseUrl);
  const uploadsDir = path.join(process.cwd(), 'public', 'qrcodes');

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
    publicUrl: getQRCodePublicUrl(table)
  };
};

const formatTableResponse = (table) => {
  const tableData = table.toJSON ? table.toJSON() : { ...table };
  const qrToken = tableData.qrCode;

  return {
    ...tableData,
    qrToken,
    qrCode: qrToken ? getQRCodePublicUrl(tableData) : null,
    qrCodeUrl: qrToken ? getQRCodePublicUrl(tableData) : null
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
    sort = 'tableNumber',
    order = 'ASC'
  } = query;

  const where = {};
  if (restaurantId) where.restaurantId = restaurantId;
  if (status) where.status = status;
  if (location) where.location = location;
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const tables = await db.Table.findAll({
    where,
    include: [{
      model: db.Restaurant,
      as: 'restaurant',
      attributes: ['id', 'name', 'slug']
    }],
    order: [[sort, String(order).toUpperCase()]]
  });

  const formattedTables = tables.map(formatTableResponse);

  return {
    total: formattedTables.length,
    tables: formattedTables
  };
};

const getTableById = async (id) => {
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

  const data = formatTableResponse(table);
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

  await saveQRCodeImage(createdTable, qrToken, resolveFrontendBaseUrl({ requestHost }));

  return formatTableResponse(createdTable);
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

  await saveQRCodeImage(updatedTable, table.qrCode, resolveFrontendBaseUrl({ requestHost }));

  return formatTableResponse(updatedTable);
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
    resolveFrontendBaseUrl({ requestHost })
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
