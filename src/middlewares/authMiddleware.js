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
    const userRole = (req.user?.role || '').toUpperCase();
    const normalizedRoles = roles.map((r) => String(r).toUpperCase());
    
    if (!req.user || (!normalizedRoles.includes(userRole) && !roles.includes(req.user.role))) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: User role '${req.user?.role || 'unknown'}' is not authorized to access this resource.`,
        errorCode: 'ROLE_FORBIDDEN',
      });
    }
    next();
  };
};

const authorizeAdmin = authorize('ADMIN', 'SUPER_ADMIN', 'admin');

const requireDepartmentOfficer = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Authentication required.',
      errorCode: 'UNAUTHORIZED',
    });
  }

  const role = (req.user.role || '').toUpperCase();
  if (role !== 'DEPARTMENT_OFFICER' && role !== 'OFFICER') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Access restricted to Department Officers.',
      errorCode: 'DEPARTMENT_OFFICER_REQUIRED',
    });
  }

  if (!req.user.departmentId) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: No municipal department associated with this officer account.',
      errorCode: 'NO_DEPARTMENT_ASSIGNED',
    });
  }

  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Authentication required.',
      errorCode: 'UNAUTHORIZED',
    });
  }

  const role = (req.user.role || '').toUpperCase();
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Admin authorization required.',
      errorCode: 'ADMIN_REQUIRED',
    });
  }

  next();
};

module.exports = {
  authenticate,
  authorize,
  authorizeAdmin,
  requireDepartmentOfficer,
  requireAdmin,
};