import db from '../models/index.js';
import { unauthorizedResponse } from '../utils/ResponseHelper.js';
import { extractTokenFromHeader, verifyAccesssToken } from '../utils/jwt.js';


const authenticate = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if(!token) {
      return unauthorizedResponse(res, 'No token provided');
    }

    let decoded;
    try {
      decoded = verifyAccesssToken(token);
    } catch (error) {
      if (error.message === 'Access token expired') {
        return unauthorizedResponse(res, 'Access token expired');
      }
      return unauthorizedResponse(res, 'Invalid access token');
    }
    const staff = await db.Staff.findByPk(decoded.id , {
      attributes: { exclude : ['passwordHash']},
      include: [{
         model: db.Restaurant, as: 'restaurant', attributes: ['id', 'name', 'slug', 'isActive'] }]
    })
    if(!staff){
      return unauthorizedResponse(res, 'User not found')
    }
    if(!staff.isActive){
      return unauthorizedResponse(res, 'User is inactive')
    }
    req.staff = staff
    next();

  } catch (error) {
    console.error('Authentication error:', error);
    return unauthorizedResponse(res, 'Authentication failed');
  }
}

export default authenticate;