import customerService from '../services/customerService.js';
import { isServiceError } from '../services/serviceError.js';
import { StatusCodes } from 'http-status-codes';
import {
  successResponse,
  errorResponse
} from '../utils/ResponseHelper.js';

const bootstrap = async (req, res) => {
  try {
    const data = await customerService.bootstrap({
      qrCode: req.query.qrCode,
      sessionId: req.customerSessionId,
      isNewSession: req.isNewCustomerSession
    });

    return successResponse(res, data, 'Bootstrap data retrieved successfully');
  } catch (err) {
    if (isServiceError(err)) {
      return errorResponse(res, err.message, 'Error', err.statusCode);
    }

    return errorResponse(res, err.message, 'Error', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export default { bootstrap };