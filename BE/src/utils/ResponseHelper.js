import { StatusCodes } from 'http-status-codes';

const successResponse = (res, data, message = 'Success', statusCode = StatusCodes.OK) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

const errorResponse = (res, error, message = 'Error', statusCode = StatusCodes.INTERNAL_SERVER_ERROR) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error
  });
};

const validationErrorResponse = (res, errors) => {
  return res.status(422).json({
    success: false,
    message: 'Validation Error',
    errors
  });
};

const unauthorizedResponse = (res, message = 'Unauthorized') => {
  return res.status(StatusCodes.UNAUTHORIZED).json({
    success: false,
    message
  });
};

const forbiddenResponse = (res, message = 'Forbidden') => {
  return res.status(StatusCodes.FORBIDDEN).json({
    success: false,
    message
  });
};

const notFoundResponse = (res, message = 'Not Found') => {
  return res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message
  });
};

export {
  successResponse,
  errorResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse
}