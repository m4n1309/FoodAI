import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

const generateQRToken = async (restaurantId, tableId) => {
  const timeStamp = Date.now();
  const uuid = uuidv4();

  const token = `QR_${restaurantId}_${tableId}_${timeStamp}_${uuid}`;

  return token
}

const parseQRToken = (token) => {
  try {

    const parts = token.split('_');
    if (parts.length < 4 || parts[0] !== 'QR') {
      throw new Error('Invalid QR code format');
    }

    return {
      restaurantId: parseInt(parts[1]),
      tableId: parseInt(parts[2]),
      timeStamp: parseInt(parts[3]),
    }

  } catch (error) {
    throw new Error('Error parsing QR code');
  }
}

const generateQRCodeImage = async (qrToken, options = {}) => {
  try {

    const defaultOptions = {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    }

    const qrOptions = { ...defaultOptions, ...options };

    const qrCodeDataURL = await QRCode.toDataURL(qrToken, qrOptions);
    return qrCodeDataURL;

  } catch (error) {
    throw new Error('Error generating QR code image');
  }
}

const generateQRCodeBuffer = async (qrToken) => {
  try {

    const buffer = await QRCode.toBuffer(qrToken, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 2,
      width: 600,
    });
    return buffer;

  } catch (error) {
    throw new Error('Error generating QR code buffer');
  }
}

const generateQRScanURL = (qrToken, baseUrl) => {
  const normalizedBaseUrl = (baseUrl || '').replace(/\/$/, '');
  return `${normalizedBaseUrl}/tables/qr/${encodeURIComponent(qrToken)}`;
}

const validateQRToken = (token) => {
  try {
    const { restaurantId, tableId } = parseQRToken(token);

    return !!(restaurantId && tableId);
  } catch (error) {
    throw new Error('Invalid QR code token');
  }
}

export {
  generateQRToken,
  parseQRToken,
  generateQRCodeImage,
  generateQRCodeBuffer,
  generateQRScanURL,
  validateQRToken
}