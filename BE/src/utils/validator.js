import validationResult from 'express-validator';
import { StatusCodes } from 'http-status-codes';

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
      success: false,
      message: 'Validation Error',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
}

const validateSignIn = [
  validationResult.body('username')
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
  validationResult.body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  handleValidationErrors
]

const validateRefreshToken = [
  validationResult.body('refreshToken')
    .notEmpty().withMessage('Refresh token is required'),
  handleValidationErrors
]

export {
  validateSignIn,
  validateRefreshToken
}