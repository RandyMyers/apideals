const jwt = require('jsonwebtoken');
const User = require('../models/user');

/** Attach req.user when a valid Bearer token is present; never fail the request. */
const optionalAuthMiddleware = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (token && token !== 'null' && token !== 'undefined') {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user) {
        req.user = user;
        if (!req.user.id && req.user._id) {
          req.user.id = req.user._id.toString();
        }
      }
    } catch {
      // Anonymous — public route continues
    }
  }

  next();
};

module.exports = optionalAuthMiddleware;
