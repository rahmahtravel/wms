const bcrypt = require('bcryptjs');
const db = require('../config/database');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/login');
};

// Middleware to check if user is super admin
const isSuperAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.isSuperAdmin) {
    return next();
  }
  res.status(403).send('Access denied. Super Admin only.');
};

// Middleware to check user role
const hasRole = (roles) => {
  return (req, res, next) => {
    if (req.session && req.session.user) {
      if (req.session.user.isSuperAdmin) {
        return next(); // Super admin has all access
      }
      if (roles.includes(req.session.user.role_name)) {
        return next();
      }
    }
    res.status(403).send('Access denied. Insufficient permissions.');
  };
};

module.exports = {
  isAuthenticated,
  isSuperAdmin,
  hasRole
};
