import db from '../models/index.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} from '../utils/jwt.js';
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
  errorResponse
} from '../utils/ResponseHelper.js';
import { StatusCodes } from 'http-status-codes';

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const staff = await db.Staff.findOne({
      where: { username },
      include: [{
        model: db.Restaurant,
        as: 'restaurant',
        attributes: ['id', 'name', 'slug', 'isActive']
      }]
    })
    if (!staff) {
      return notFoundResponse(res, 'User not found');
    }
    if (!staff.isActive) {
      return unauthorizedResponse(res, 'User is inactive');
    }
    const isPasswordValid = await staff.comparePassword(password);
    if (!isPasswordValid) {
      return unauthorizedResponse(res, 'Invalid password');
    }

    const tokenPayload = {
      id: staff.id,
      username: staff.username,
      restaurantId: staff.restaurantId,
      role: staff.role
    }
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const session = await db.Session.create({
      staffId: staff.id,
      refreshToken,
      expiresAt: new Date(Date.now() + parseInt(process.env.JWT_REFRESH_EXPIRE) * 24 * 60 * 60 * 1000)
    })

    await staff.update({ lastLogin: new Date() });

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 15  * 1000
    })

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    const staffData = staff.toJSON()
    return successResponse(res, {
      staff: staffData
    }, 'Login successful');

  } catch (error) {
    console.error('Login error:', error);
    return errorResponse(res, 'An error occurred during login', StatusCodes.INTERNAL_SERVER_ERROR);
  }
}

const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      await db.Session.destroy({
        where: {
          refreshToken,
          staffId: req.staff.id
        }
      });
    }

    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict'
    })

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict'
    })
    return successResponse(res, null, 'Logout successful');
  } catch (error) {
    console.error('Logout error:', error);
    return errorResponse(res, 'An error occurred during logout', StatusCodes.INTERNAL_SERVER_ERROR);
  }
}

const refreshAccessToken = async (req, res) => {
  try {
    
    const refreshToken = 
      (req.cookies && req.cookies.refreshToken)

    console.log('   RefreshToken extracted:', refreshToken ? 'Yes' : 'No');
    if (!refreshAccessToken) {
      return unauthorizedResponse(res, 'No refresh token provided');
    }
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict'
      })
      return unauthorizedResponse(res, 'Invalid refresh token');
    }
    const session = await db.Session.findOne({
      where: {
        refreshToken,
        staffId: decoded.id
      }
    })
    if (!session) {
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict'
      })
      return unauthorizedResponse(res, 'Refresh token not found');
    }
    if (session.isExpired()) {
      await session.destroy();
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict'
      })
      return unauthorizedResponse(res, 'Refresh token expired');
    }
    const staff = await db.Staff.findByPk(decoded.id);
    if (!staff) {
      return notFoundResponse(res, 'User not found');
    }
    if (!staff.isActive) {
      return unauthorizedResponse(res, 'User is inactive');
    }
    const tokenPayload = {
      id: staff.id,
      username: staff.username,
      restaurantId: staff.restaurantId,
      role: staff.role
    };
    const newAccessToken = generateAccessToken(tokenPayload);

    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 15  * 1000
    })

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    return successResponse(res, {
      tokenType: 'Bearer',
      expiresIn: process.env.JWT_EXPIRES_IN
    }, 'Access token refreshed successfully');
  } catch (error) {
    console.error('Refresh token error:', error);
    return errorResponse(res, 'An error occurred while refreshing access token', StatusCodes.INTERNAL_SERVER_ERROR);
  }
}

const getCurStaff = async (req, res) => {
  try {
    const staff = await db.Staff.findByPk(req.staff.id, {
      attributes: { exclude: ['passwordHash'] },
      include: [{
        model: db.Restaurant,
        as: 'restaurant',
        attributes: ['id', 'name', 'slug', 'address', 'phone', 'email', 'logoUrl']
      }]
    })
    if (!staff) {
      return notFoundResponse(res, 'User not found');
    }
    return successResponse(res, staff, 'Current staff retrieved successfully');
  } catch (error) {
    console.error('Get current staff error:', error);
    return errorResponse(res, 'An error occurred while retrieving current staff', StatusCodes.INTERNAL_SERVER_ERROR);
  }
}

const getSessions = async (req, res) => {
  try {
    const sessions = await db.Session.findAll({
      where: {
        staffId: req.staff.id,
        expiresAt: { [db.Sequelize.Op.gt]: new Date() }
      },
      attributes: ['id', 'refreshToken', 'expiresAt', 'created_at'],
      order: [['created_at', 'DESC']]
    })
    return successResponse(res, sessions, 'Sessions retrieved successfully');
  } catch (error) {
    console.error('Get sessions error:', error);
    return errorResponse(res, 'An error occurred while retrieving sessions', StatusCodes.INTERNAL_SERVER_ERROR);
  }
}

const revokeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await db.Session.findOne({
      where: {
        id: sessionId,
        staffId: req.staff.id
      }
    })
    if (!session) {
      return notFoundResponse(res, 'Session not found');
    }
    await session.destroy();
    return successResponse(res, null, 'Session revoked successfully');
  } catch (error) {
    console.error('Revoke session error:', error);
    return errorResponse(res, 'An error occurred while revoking session', StatusCodes.INTERNAL_SERVER_ERROR);
  }
}

export default {
  login,
  logout,
  refreshAccessToken,
  getCurStaff,
  getSessions,
  revokeSession
}