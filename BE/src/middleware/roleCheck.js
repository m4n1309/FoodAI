import { forbiddenResponse } from '../utils/ResponseHelper.js';

const roleCheck = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.staff) {
        return forbiddenResponse(res, 'User not authenticated');
      }

      const userRole = req.staff.role;
      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      const hasPermission = roles.includes(userRole);

      if (!hasPermission) {
        return forbiddenResponse(
          res,
          `Bạn không có quyền truy cập. Yêu cầu vai trò: ${roles.join(' hoặc ')}`
        );
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      return forbiddenResponse(res, 'Kiểm tra quyền thất bại');
    }
  };
};

const adminOnly = roleCheck(['admin']);

const staffOnly = roleCheck(['staff']);

const kitchenOnly = roleCheck(['kitchen']);

const checkRestaurantAccess = (req, res, next) => {
  const requestedRestaurantId = parseInt(req.params.restaurantId || req.body.restaurantId);
  const userRestaurantId = req.staff.restaurantId;

  if (requestedRestaurantId !== userRestaurantId) {
    return forbiddenResponse(res, 'Access denied to this restaurant');
  }

  if (req.staff.role === 'admin') {
    return next();
  }
  next();
}

export {
  roleCheck,
  adminOnly,
  staffOnly,
  kitchenOnly,
  checkRestaurantAccess
}