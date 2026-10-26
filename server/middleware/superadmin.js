const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { isProxyToken } = require('../utils/proxyToken');
const { adminRequiresTwoFactor } = require('../utils/twoFactor');

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (isProxyToken(decoded)) {
      return res.status(401).json({ message: 'Invalid token' });
    }
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

    // With the policy on, the admin API stays closed until 2FA is set up
    if (adminRequiresTwoFactor() && !user.twoFactor?.enabled) {
      return res.status(403).json({ message: 'Turn on two-step sign-in to use the admin panel.', code: 'TWO_FACTOR_SETUP_REQUIRED' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = superadmin;
