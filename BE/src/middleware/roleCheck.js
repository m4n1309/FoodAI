import { use } from "react";
import { forbiddenResponse } from "../utils/ResponseHelper";

const roleCheck = (...allowedRoles) => {
  return (req, res, next) => {
    if(!req.user) {
      return forbiddenResponse(res, 'User not authenticated');
    }

    const userRole = req.user.role;

    if(!allowedRoles.includes(userRole)) {
      return forbiddenResponse(res, 'Insufficient permissions');
    }
    next();
  }
}

const adminOnly = roleCheck('admin')

const staffOnly = roleCheck('staff')

const kitchenOnly = roleCheck('kitchen')

const checkRestaurantAccess = (req, res, next) => {
  const requestedRestaurantId = parseInt(req.params.restaurantId || req.body.restaurantId);
  const userRestaurantId = req.user.restaurantId;

  if(requestedRestaurantId !== userRestaurantId) {
    return forbiddenResponse(res, 'Access denied to this restaurant');
  }

  if(req.user.role === 'admin') {
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