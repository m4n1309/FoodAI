import { forbiddenResponse } from '../utils/ResponseHelper.js';

const roleCheck = (allowedRoles) => {
  return (req, res, next) => {
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔐 ROLE CHECK MIDDLEWARE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Check if staff exists in request (from authenticate middleware)
      if (!req.staff) {
        return forbiddenResponse(res, 'User not authenticated');
      }

      console.log('✅ req.staff exists:', {
        id: req.staff.id,
        username: req.staff.username,
        role: req.staff.role,
        roleType: typeof req.staff.role
      });

      const userRole = req.staff.role;

      console.log('📋 Role check details:');
      console.log('   User role:', userRole);
      console.log('   User role type:', typeof userRole);
      console.log('   Allowed roles:', allowedRoles);
      console.log('   Allowed roles type:', allowedRoles.map(r => typeof r));

      // Check if role is in allowed list
      const hasPermission = allowedRoles.includes(userRole);

      if (!hasPermission) {
        return forbiddenResponse(
          res,
          `Bạn không có quyền truy cập. Yêu cầu vai trò: ${allowedRoles.join(' hoặc ')}`
        );
      }
      console.log(`✅ Role check passed: ${userRole}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      next();
    } catch (error) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ CHECK ROLE ERROR');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('Error:', error);
      return forbiddenResponse(res, 'Kiểm tra quyền thất bại');
    }
  };
};

const adminOnly = roleCheck('admin')

const staffOnly = roleCheck('staff')

const kitchenOnly = roleCheck('kitchen')

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