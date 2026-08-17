const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const authenticate = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    // Demo citizen fallback if no token provided
    req.user = {
      _id: '000000000000000000000001',
      name: 'Demo Citizen',
      email: 'demo@citymind.org',
      role: 'citizen'
    };
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      req.user = {
        _id: decoded.id || '000000000000000000000001',
        name: 'Demo Citizen',
        email: 'demo@citymind.org',
        role: 'citizen'
      };
    }

    next();
  } catch (error) {
    // If token invalid, still fall back to demo citizen for citizen app operations
    req.user = {
      _id: '000000000000000000000001',
      name: 'Demo Citizen',
      email: 'demo@citymind.org',
      role: 'citizen'
    };
    next();
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: User role '${req.user?.role || 'unknown'}' is not authorized to access this resource.`,
      });
    }
    next();
  };
};

const authorizeAdmin = authorize('admin');

module.exports = { authenticate, authorize, authorizeAdmin };