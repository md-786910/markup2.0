const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

const superadmin = asyncHandler(async (req, res, next) => {
  let token = null;

  const header = req.headers.authorization;
  if (req.query && req.query.token) {
    token = req.query.token;
  } else if (header && header.startsWith('Bearer ')) {
    token = header.split(' ')[1];
  } else if (req.cookies && req.cookies.markup_token) {
    token = req.cookies.markup_token;
  }

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (decoded.sessionToken && user.sessionToken && decoded.sessionToken !== user.sessionToken) {
      return res.status(401).json({
        message: 'Session expired. You have been logged in on another device.',
        code: 'SESSION_REPLACED',
      });
    }

    if (user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Superadmin access required' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = superadmin;
