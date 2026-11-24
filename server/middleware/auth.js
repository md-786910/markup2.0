const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Organization = require('../models/Organization');
const asyncHandler = require('../utils/asyncHandler');
const { checkTrialExpiry } = require('../utils/orgUtils');
const { getEffectiveLimitsAsync } = require('../config/plans');
const { isProxyToken } = require('../utils/proxyToken');

const LAST_SEEN_INTERVAL_MS = 5 * 60 * 1000;

// Fields the User schema never selects by default (select: false)
const USER_HIDDEN = { passwordHash: 0, resetPasswordToken: 0, resetPasswordExpires: 0 };

// The user and their organization in one round trip, read fresh on every
// request (no cache: logout, a password change or removal from the org must
// take effect at once). Hydrated into normal documents, like findById's.
async function loadUserAndOrg(userId) {
  const [row] = await User.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(String(userId)) } },
    { $project: USER_HIDDEN },
    { $limit: 1 },
    {
      $lookup: {
        from: Organization.collection.name,
        localField: 'organization',
        foreignField: '_id',
        as: '__org',
      },
    },
  ]);
  if (!row) return { user: null, org: null };
  const orgRow = row.__org?.[0] || null;
  delete row.__org;
  return {
    user: User.hydrate(row, USER_HIDDEN),
    org: orgRow ? Organization.hydrate(orgRow) : null,
  };
}

const auth = asyncHandler(async (req, res, next) => {
  let token = null;

  // Bearer header only. Session tokens are never read from the query string:
  // URLs end up in logs and Referer headers (the proxy has its own
  // project-scoped token in middleware/proxyAuth.js).
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    token = header.split(' ')[1];
  }
  // No cookie fallback: a session cookie on the API host would be usable by
  // the scripts of reviewed websites, which run on this origin (proxy).

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    // Proxy tokens are only valid on /api/proxy
    if (isProxyToken(decoded)) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    const { user, org } = await loadUserAndOrg(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Single-device session enforcement: the token must carry the user's current
    // session (a user without one has been signed out everywhere)
    if (!user.sessionToken || decoded.sessionToken !== user.sessionToken) {
      return res.status(401).json({
        message: 'Session expired. You have been logged in on another device.',
        code: 'SESSION_REPLACED',
      });
    }

    req.user = user;

    // Last activity for the admin panel, written at most every 5 minutes per user
    if (!user.lastSeen || Date.now() - user.lastSeen.getTime() > LAST_SEEN_INTERVAL_MS) {
      user.lastSeen = new Date();
      User.updateOne({ _id: user._id }, { $set: { lastSeen: user.lastSeen } }).catch(() => {});
    }

    // Populate organization context if user has one
    if (user.organization) {
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
