const AdminUser = require('../models/AdminUser');
const asyncHandler = require('../utils/asyncHandler');
const { verifyAdminToken } = require('../utils/adminSession');
const { adminRequiresTwoFactor } = require('../utils/twoFactor');

const LAST_SEEN_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Signed-in admin (AdminUser) from the Bearer token; sets req.admin.
 * requireTwoFactor: with the admin 2FA rule on, answers 403
 * TWO_FACTOR_SETUP_REQUIRED until the admin has turned it on (the account
 * routes pass false so the setup itself stays reachable).
 */
function adminAuth({ requireTwoFactor = true } = {}) {
  return asyncHandler(async (req, res, next) => {
    const header = req.headers.authorization || '';
    const decoded = header.startsWith('Bearer ') ? verifyAdminToken(header.slice(7)) : null;
    if (!decoded) return res.status(401).json({ message: 'Sign in to the admin panel.' });

    const admin = await AdminUser.findById(decoded.id).select('+sessionToken');
    if (!admin || admin.status !== 'active') {
      return res.status(401).json({ message: 'This admin account is not active.' });
    }
    if (!admin.sessionToken || decoded.st !== admin.sessionToken) {
      return res.status(401).json({ message: 'Your session ended. Sign in again.', code: 'SESSION_REPLACED' });
    }
    if (requireTwoFactor && adminRequiresTwoFactor() && !admin.twoFactor?.enabled) {
      return res.status(403).json({ message: 'Turn on two-step sign-in to use the admin panel.', code: 'TWO_FACTOR_SETUP_REQUIRED' });
    }

    if (!admin.lastSeen || Date.now() - admin.lastSeen.getTime() > LAST_SEEN_INTERVAL_MS) {
      admin.lastSeen = new Date();
      AdminUser.updateOne({ _id: admin._id }, { $set: { lastSeen: admin.lastSeen } }).catch(() => {});
    }
    req.admin = admin;
    next();
  });
}

module.exports = adminAuth;
