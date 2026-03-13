import db from '../models/index.js';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  forbiddenResponse
} from '../utils/ResponseHelper.js'
import { StatusCodes } from 'http-status-codes';
import {
  generateQRToken,
  parseQRToken,
  generateQRCodeImage,
  generateQRCodeBuffer,
  generateQRScanURL,
  validateQRToken
} from '../utils/qrCodeHelper.js'
import fs from 'fs';
import path from 'path';

const getBackendBaseUrl = () => {
  return process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
};

const getQRCodeFilename = (table) => {
  return `table-${table.restaurantId}-${table.tableNumber}-qr.png`;
};

const getQRCodePublicUrl = (table) => {
  return `${getBackendBaseUrl()}/qrcodes/${getQRCodeFilename(table)}`;
};

const saveQRCodeImage = async (table, qrToken) => {
  const scanUrl = generateQRScanURL(qrToken, process.env.FRONTEND_URL);
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
    qrCodeUrl: qrToken ? getQRCodePublicUrl(tableData) : null,
  };
};

const getAllTables = async (req, res) => {
  try {

    const {
      restaurantId,
      status,
      location,
      isActive,
      sort = 'tableNumber',
      order = 'ASC',
    } = req.query;

    const where = {};

    if (restaurantId) where.restaurantId = restaurantId;
    if (status) where.status = status;
    if (location) where.location = location;
    if (isActive) where.isActive = isActive === 'true';

    const tables = await db.Table.findAll({
      where,
      include: [{
        model: db.Restaurant,
        as: 'restaurant',
        attributes: ['id', 'name', 'slug']
      }],
      order: [[sort, order.toUpperCase()]]
    })

    const formattedTables = tables.map(formatTableResponse);

    return successResponse(res, {
      total: formattedTables.length,
      tables: formattedTables
    }, 'Tables retrieved successfully');

  } catch (error) {
    return errorResponse(res, error.message, StatusCodes.INTERNAL_SERVER_ERROR);
  }
}

const getTableById = async (req, res) => {
  try {
    const { id } = req.params;

    const table = await db.Table.findByPk(id, {
      include: [{
        model: db.Restaurant,
        as: 'restaurant',
        attributes: ['id', 'name', 'slug', 'address', 'phone']
      }]
    })
    if (!table) return notFoundResponse(res, 'Table not found');

    const isOccupied = await table.isOccupied();
    const currentOrder = isOccupied ? await table.getCurrentOrder() : null;

    const tableData = formatTableResponse(table);
    tableData.isOccupied = isOccupied;
    tableData.currentOrder = currentOrder;

    return successResponse(res, tableData, 'Table retrieved successfully');
  } catch (error) {
    return errorResponse(res, error.message, StatusCodes.INTERNAL_SERVER_ERROR);
  }
}

const createTable = async (req, res) => {
  try {

    const {
      restaurantId,
      tableNumber,
      capacity,
      location,
    } = req.body;

    if (!restaurantId || !tableNumber) return errorResponse(res, 'Restaurant ID and table number are required', StatusCodes.BAD_REQUEST);

    if (req.staff.restaurantId !== restaurantId) return forbiddenResponse(res, 'You do not have permission to create a table for this restaurant');

    const existingTable = await db.Table.findOne({
      where: {
        restaurantId,
        tableNumber
      }
    })
    if (existingTable) return errorResponse(res, 'A table with this number already exists in the restaurant', StatusCodes.CONFLICT);

    const tempToken = `QR_${restaurantId}_TEMP_${Date.now()}`;

    const table = await db.Table.create({
      restaurantId,
      tableNumber,
      qrCode: tempToken,
      capacity,
      location,
    })

    const qrToken = await generateQRToken(restaurantId, table.id);

    await table.update({ qrCode: qrToken });

    const createdTable = await db.Table.findByPk(table.id, {
      include: [{
        model: db.Restaurant,
        as: 'restaurant',
        attributes: ['id', 'name', 'slug']
      }]
    })

    await saveQRCodeImage(createdTable, qrToken);

    return successResponse(res, formatTableResponse(createdTable), 'Table created successfully');
  } catch (error) {
    return errorResponse(res, error.message, StatusCodes.INTERNAL_SERVER_ERROR);
  }
}

const updateTable = async (req, res) => {
  try {
    const { id } = req.params;

    const updateData = req.body;

    const table = await db.Table.findByPk(id);
    if (!table) return notFoundResponse(res, 'Table not found');

    if (req.staff.restaurantId !== table.restaurantId) return forbiddenResponse(res, 'You do not have permission to update this table');

    if (updateData.tableNumber && updateData.tableNumber !== table.tableNumber) {
      const existingTable = await db.Table.findOne({
        where: {
          restaurantId: table.restaurantId,
          tableNumber: updateData.tableNumber,
          id: { [db.Sequelize.Op.ne]: id }
        }
      })
      if (existingTable) return errorResponse(res, 'A table with this number already exists in the restaurant', StatusCodes.CONFLICT);
    }

    delete updateData.qrCode;
    delete updateData.restaurantId;

    await table.update(updateData);

    const updatedTable = await db.Table.findByPk(id, {
      include: [{
        model: db.Restaurant,
        as: 'restaurant',
        attributes: ['id', 'name', 'slug']
      }]
    })

    await saveQRCodeImage(updatedTable, table.qrCode);

    return successResponse(res, formatTableResponse(updatedTable), 'Table updated successfully');
  } catch (error) {
    return errorResponse(res, error.message, StatusCodes.INTERNAL_SERVER_ERROR);
  }
}

const deleteTable = async (req, res) => {
  try {
    const { id } = req.params;

    const table = await db.Table.findByPk(id);
    if (!table) return notFoundResponse(res, 'Table not found');

    if (req.staff.restaurantId !== table.restaurantId) return forbiddenResponse(res, 'You do not have permission to delete this table');

    const isOccupied = await table.isOccupied();
    if (isOccupied) return errorResponse(res, 'Cannot delete an occupied table', StatusCodes.BAD_REQUEST);

    await table.destroy();

    return successResponse(res, null, 'Table deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message, StatusCodes.INTERNAL_SERVER_ERROR);
  }
}

const updateTableStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['available', 'occupied', 'reserved', 'maintenance'].includes(status)) return errorResponse(res, 'Invalid status value', StatusCodes.BAD_REQUEST);

    const table = await db.Table.findByPk(id);
    if (!table) return notFoundResponse(res, 'Table not found');

    if (req.staff.restaurantId !== table.restaurantId) return forbiddenResponse(res, 'You do not have permission to update this table');

    await table.update({ status });

    return successResponse(res, formatTableResponse(table), 'Table status updated successfully');
  } catch (error) {
    return errorResponse(res, error.message, StatusCodes.INTERNAL_SERVER_ERROR);
  }
}

const generateTableQRCode = async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'url', regenerate = false } = req.body || {};

    console.log('🔲 Generate QR code for table:', id);

    const table = await db.Table.findByPk(id);

    if (!table) {
      return notFoundResponse(res, 'Bàn không tồn tại');
    }

    if (req.staff.restaurantId !== table.restaurantId) {
      return forbiddenResponse(res, 'Bạn không có quyền tạo QR code cho bàn này');
    }

    let qrToken = table.qrCode;

    if (regenerate) {
      qrToken = await generateQRToken(table.restaurantId, table.id);
      await table.update({ qrCode: qrToken });
      console.log('✅ QR token regenerated');
    }
    const { filename, scanUrl, publicUrl } = await saveQRCodeImage(table, qrToken);

    if (format === 'buffer' || format === 'download') {
      const qrCodeBuffer = await generateQRCodeBuffer(scanUrl);

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(qrCodeBuffer);

    } else {
      const qrCodeImage = format === 'both' ? await generateQRCodeImage(scanUrl) : null;

      return successResponse(res, {
        tableId: table.id,
        tableNumber: table.tableNumber,
        qrToken,
        qrCode: publicUrl,
        qrCodeUrl: publicUrl,        // ← Public URL to access QR image
        qrCodeImage: qrCodeImage,     // ← Base64 (if format='both')
        scanUrl,                      // ← Frontend scan URL
        filename                      // ← Filename for reference
      }, 'Tạo QR code thành công');
    }

  } catch (error) {
    console.error('❌ Generate QR code error:', error);
    return errorResponse(res, error.message || 'Tạo QR code thất bại', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

const getTableByQRCode = async (req, res) => {
  try {
    const { qrCode } = req.params;

    if (!validateQRToken(qrCode)) return errorResponse(res, 'Invalid QR code token', StatusCodes.BAD_REQUEST);

    const { restaurantId, tableId } = parseQRToken(qrCode);

    const table = await db.Table.findOne({
      where: {
        id: tableId,
        restaurantId,
        qrCode
      },
      include: [{
        model: db.Restaurant,
        as: 'restaurant',
        attributes: ['id', 'name', 'slug', 'address', 'phone', 'logoUrl', 'openingHours']
      }]
    });

    if (!table) return notFoundResponse(res, 'Table not found');

    if (!table.isActive) return errorResponse(res, 'Table is not active', StatusCodes.BAD_REQUEST);

    const isOccupied = await table.isOccupied();
    const currentOrder = isOccupied ? await table.getCurrentOrder() : null;

    const tableData = formatTableResponse(table);
    tableData.isOccupied = isOccupied;
    tableData.currentOrder = currentOrder ? {
      id: currentOrder.id,
      orderStatus: currentOrder.orderStatus,
      orderNumber: currentOrder.orderNumber,
    } : null;

    return successResponse(res, tableData, 'Table found successfully');
  } catch (error) {
    return errorResponse(res, error.message, StatusCodes.INTERNAL_SERVER_ERROR);
  }
}

const getTableStatusSummary = async (req, res) => {
  try {
    const { restaurantId } = req.query;

    if (!restaurantId) return errorResponse(res, 'Restaurant ID is required', StatusCodes.BAD_REQUEST);
    const summary = await db.Table.findAll({
      where: { restaurantId, isActive: true },
      attributes: ['status', [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']],
      group: ['status'],
      raw: true,
    })

    const statusCounts = {
      available: 0,
      occupied: 0,
      reserved: 0,
      maintenance: 0,
      total: 0
    }

    summary.forEach(item => {
      statusCounts[item.status] = parseInt(item.count);
      statusCounts.total += parseInt(item.count);
    });

    return successResponse(res, statusCounts, 'Table status summary retrieved successfully');
  } catch (error) {
    return errorResponse(res, error.message, StatusCodes.INTERNAL_SERVER_ERROR);
  }
}

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
}