const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Organization = require('../models/Organization');
const asyncHandler = require('../utils/asyncHandler');
const { checkTrialExpiry } = require('../utils/orgUtils');
const { getEffectiveLimitsAsync } = require('../config/plans');
const { isProxyToken } = require('../utils/proxyToken');

const auth = asyncHandler(async (req, res, next) => {
  let token = null;

  // Check query param first (used by proxy routes where the proxied app may send
  // its own Authorization header that would conflict with our JWT verification)
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
    // Proxy tokens are only valid on /api/proxy
    if (isProxyToken(decoded)) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Single-device session enforcement
    if (decoded.sessionToken && user.sessionToken && decoded.sessionToken !== user.sessionToken) {
      return res.status(401).json({
        message: 'Session expired. You have been logged in on another device.',
        code: 'SESSION_REPLACED',
      });
    }

    req.user = user;

    // Populate organization context if user has one
    if (user.organization) {
      const org = await Organization.findById(user.organization);
      if (org) {
        await checkTrialExpiry(org);
        // Plan limits (with admin plan config) plus per-org superadmin overrides
        org.limits = { ...org.limits.toObject(), ...(await getEffectiveLimitsAsync(org)) };
        req.organization = org;
      }
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = auth;
