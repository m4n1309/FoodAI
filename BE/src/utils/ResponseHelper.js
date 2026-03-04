import statusCode from 'http-status-codes';

const successResponse = (res, data, message = 'Seccess', statusCode = statusCode.OK) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

const errorResponse = (res, error, message = 'Error', statusCode = statusCode.INTERNAL_SERVER_ERROR) => {
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
  return res.status(statusCode.UNAUTHORIZED).json({
    success: false,
    message
  });
};

const forbiddenResponse = (res, message = 'Forbidden') => {
  return res.status(statusCode.FORBIDDEN).json({
    success: false,
    message
  });
};

const notFoundResponse = (res, message = 'Not Found') => {
  return res.status(statusCode.NOT_FOUND).json({
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