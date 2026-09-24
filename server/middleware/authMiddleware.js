const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * @desc    Verify JWT token validity and attach user payload to request
 */
const protect = async (req, res, next) => {
  let token;

  // 1. Extract Bearer token from headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  // 2. Fallback: Check token in HTTP-only Cookies
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 3. Fallback: Check token in query params (useful for sockets/downloads/media streams)
  else if (req.query && req.query.token) {
    token = req.query.token;
  }

  // If no token is found in headers, cookies, or query parameters
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized, no token provided.',
      message: 'Access denied. Authentication token is missing.'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback_secret_key'
    );

    // Attach user record excluding password
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User no longer exists.',
        message: 'The account associated with this token has been removed.'
      });
    }

    // Check account status
    if (user.accountStatus === 'suspended' || user.accountStatus === 'banned') {
      return res.status(403).json({
        success: false,
        error: `Account is ${user.accountStatus}.`,
        message: `Your account is currently ${user.accountStatus}. Please contact support.`
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('JWT Middleware Error:', error.message);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired.',
        message: 'Your session has expired. Please log in again.'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Not authorized, invalid token.',
      message: 'Token verification failed.'
    });
  }
};

/**
 * @desc    Optional Auth Middleware - populates req.user if valid token exists, proceeds regardless
 */
const optionalAuth = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback_secret_key'
    );

    const user = await User.findById(decoded.id).select('-password');
    if (user && user.accountStatus === 'active') {
      req.user = user;
    }
  } catch (err) {
    // Token invalid or expired; proceed unauthenticated
    req.user = null;
  }

  next();
};

/**
 * @desc    Restrict routes to specified roles (e.g. restrictTo('superadmin', 'admin'))
 * @param   {...String} roles - Allowed user roles
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
        message: 'Please authenticate before requesting this resource.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied.',
        message: `Role '${req.user.role}' does not have access to this resource.`
      });
    }

    next();
  };
};

module.exports = {
  protect,
  optionalAuth,
  restrictTo,
  authorize: restrictTo // Alias for consistent import syntax
};