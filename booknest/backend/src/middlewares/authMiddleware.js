    const jwt = require('jsonwebtoken');
const User = require('../models/user');

// Protect routes: verifies token from cookie or Authorization header
const protect = async (req, res, next) => {
  let token;

  if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Access denied: No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ message: 'User no longer exists.' });
    }

    if (!req.user.cardNumber) {
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      req.user.cardNumber = `BN-${randomSuffix}`;
      await req.user.save();
    }

    if (req.user.membershipStatus === 'suspended') {
      return res.status(403).json({ message: 'Your BookNest account is suspended. Contact administration.' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden: Access restricted to [${roles.join(', ')}] roles.`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };