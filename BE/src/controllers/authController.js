import authService from '../services/authService.js';
import { isServiceError } from '../services/serviceError.js';
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  errorResponse
} from '../utils/ResponseHelper.js';
import { StatusCodes } from 'http-status-codes';

const isProduction = process.env.NODE_ENV === 'production';

const getCookieBaseOptions = () => ({
  httpOnly: true,
  secure: isProduction,
  // HTTP LAN/dev cannot use SameSite=None because it requires secure=true (HTTPS).
  sameSite: isProduction ? 'none' : 'lax',
  path: '/'
});

const getAccessTokenCookieOptions = () => ({
  ...getCookieBaseOptions(),
  maxAge: 15 * 60 * 1000
});

const getRefreshTokenCookieOptions = () => ({
  ...getCookieBaseOptions(),
  maxAge: 7 * 24 * 60 * 60 * 1000
});

const handleServiceError = (res, error, fallbackMessage) => {
  if (!isServiceError(error)) {
    return errorResponse(res, fallbackMessage, 'Error', StatusCodes.INTERNAL_SERVER_ERROR);
  }

  if (error.statusCode === StatusCodes.UNAUTHORIZED) {
    return unauthorizedResponse(res, error.message);
  }
  if (error.statusCode === StatusCodes.FORBIDDEN) {
    return forbiddenResponse(res, error.message);
  }
  if (error.statusCode === StatusCodes.NOT_FOUND) {
    return notFoundResponse(res, error.message);
  }

  return errorResponse(res, error.message, 'Error', error.statusCode);
};

const login = async (req, res) => {
  try {
    const { accessToken, refreshToken, staff } = await authService.login(req.body);

    res.cookie('accessToken', accessToken, getAccessTokenCookieOptions())
    res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions())

    return successResponse(res, {
      staff
    }, 'Login successful');

  } catch (error) {
    console.error('Login error:', error);
    return handleServiceError(res, error, 'An error occurred during login');
  }
}

const logout = async (req, res) => {
  try {
    await authService.logout({
      staffId: req.staff.id,
      refreshToken: req.cookies?.refreshToken
    });

    res.clearCookie('accessToken', getCookieBaseOptions())
    res.clearCookie('refreshToken', getCookieBaseOptions())

    return successResponse(res, null, 'Logout successful');
  } catch (error) {
    console.error('Logout error:', error);
    return handleServiceError(res, error, 'An error occurred during logout');
  }
}

const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    const refreshed = await authService.refreshAccessToken({ refreshToken });

    res.cookie('accessToken', refreshed.accessToken, getAccessTokenCookieOptions())
    res.cookie('refreshToken', refreshed.refreshToken, getRefreshTokenCookieOptions())

    return successResponse(res, {
      tokenType: 'Bearer',
      expiresIn: refreshed.expiresIn
    }, 'Access token refreshed successfully');
  } catch (error) {
    if (isServiceError(error) && error.statusCode === StatusCodes.UNAUTHORIZED) {
      res.clearCookie('refreshToken', getCookieBaseOptions())
    }

    console.error('Refresh token error:', error);
    return handleServiceError(res, error, 'An error occurred while refreshing access token');
  }
}

const getCurStaff = async (req, res) => {
  try {
    const staff = await authService.getCurrentStaff({ staffId: req.staff.id });
    return successResponse(res, staff, 'Current staff retrieved successfully');
  } catch (error) {
    console.error('Get current staff error:', error);
    return handleServiceError(res, error, 'An error occurred while retrieving current staff');
  }
}

const getSessions = async (req, res) => {
  try {
    const sessions = await authService.getSessions({ staffId: req.staff.id });
    return successResponse(res, sessions, 'Sessions retrieved successfully');
  } catch (error) {
    console.error('Get sessions error:', error);
    return handleServiceError(res, error, 'An error occurred while retrieving sessions');
  }
}

const revokeSession = async (req, res) => {
  try {
    await authService.revokeSession({
      staffId: req.staff.id,
      sessionId: req.params.sessionId
    });

    return successResponse(res, null, 'Session revoked successfully');
  } catch (error) {
    console.error('Revoke session error:', error);
    return handleServiceError(res, error, 'An error occurred while revoking session');
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