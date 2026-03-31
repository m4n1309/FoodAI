import { validationResult } from 'express-validator';
import { errorResponse } from '../utils/ResponseHelper.js';
import { StatusCodes } from 'http-status-codes';

const validationMiddleware = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, errors.array()[0].msg, StatusCodes.BAD_REQUEST, errors.array());
  }
  next();
};

export default validationMiddleware;
