import { body, validationResult } from 'express-validator';

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation Error',
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg
      }))
    });
  }
  
  next();
};

export const validateLogin = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username không được để trống')
    .isLength({ min: 3, max: 100 }).withMessage('Username phải từ 3-100 ký tự'),
  
  body('password')
    .notEmpty().withMessage('Password không được để trống')
    .isLength({ min: 6 }).withMessage('Password phải ít nhất 6 ký tự'),
  
  handleValidationErrors
];

export const validateRefreshToken = [
  body('refreshToken')
    .optional()
    .notEmpty().withMessage('Refresh token không được để trống'),
  
  handleValidationErrors
]