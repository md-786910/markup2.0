const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const AdminUser = require('../models/AdminUser');
const asyncHandler = require('../utils/asyncHandler');
const { URLS } = require('../config/env');
const { signAdminToken, newSessionToken } = require('../utils/adminSession');
const { validatePassword } = require('../utils/passwordPolicy');
const { generateSecret, verifyCode, otpauthUrl } = require('../utils/totp');
const { seal, open } = require('../utils/secretBox');
const {
  issueChallenge, readChallenge, passwordFingerprint, useSecondFactor,
  generateRecoveryCodes, adminRequiresTwoFactor, SECOND_FACTOR_FIELDS,
} = require('../utils/twoFactor');
const { sendPasswordResetEmail } = require('../utils/mailer');

// Sign-in and account settings for admin panel users (AdminUser).
// Wrong passwords and codes on signed-in screens answer 400, not 401, so the
// admin app doesn't sign out on a typo.

const SCOPE = 'admin';
const RESET_TTL_MS = 30 * 60 * 1000;
const SETUP_WINDOW_MS = 15 * 60 * 1000;
const ISSUER = 'Kommently Admin';

const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');
const passwordPolicy = (pw) => validatePassword(pw, { role: 'superadmin' });
// setupTwoFactor: the 2FA rule is on and this admin still has to set it up
const mustSetUpTwoFactor = (admin) => adminRequiresTwoFactor() && !admin.twoFactor?.enabled;
const respondWithSession = (res, admin, extra = {}) => res.json({
  token: signAdminToken(admin), admin: admin.toPublic(), setupTwoFactor: mustSetUpTwoFactor(admin), ...extra,
});

// A new session for a fully verified admin (ends every other session)
async function startSession(req, res, admin, extra) {
  admin.sessionToken = newSessionToken();
  admin.lastLoginAt = new Date();
  admin.lastLoginIp = req.ip;
  admin.lastSeen = new Date();
  await admin.save({ validateBeforeSave: false });
  respondWithSession(res, admin, extra);
}

// Compared against when the email is unknown, so a wrong email takes as long
// as a wrong password (the timing doesn't reveal who is an admin)
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

// POST /admin-auth/login { email, password }
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });

  const admin = await AdminUser.findOne({ email: String(email).toLowerCase().trim() }).select('+passwordHash');
  const passwordOk = admin ? await admin.comparePassword(password) : await bcrypt.compare(String(password), DUMMY_HASH).then(() => false);
  if (!admin || admin.status !== 'active' || !passwordOk) {
    return res.status(401).json({ message: 'Wrong email or password.' });
  }
  // With 2FA on, the password alone only earns a short-lived challenge
  if (admin.twoFactor?.enabled) {
    return res.json({ twoFactorRequired: true, challengeToken: issueChallenge(admin, SCOPE) });
  }
  await startSession(req, res, admin);
});

// POST /admin-auth/login/2fa { challengeToken, code }
exports.loginTwoFactor = asyncHandler(async (req, res) => {
  const { challengeToken, code } = req.body || {};
  const expired = () => res.status(401).json({ message: 'Your sign-in expired. Enter your password again.', code: 'CHALLENGE_EXPIRED' });
  const challenge = readChallenge(challengeToken, SCOPE);
  if (!challenge) return expired();
  const admin = await AdminUser.findById(challenge.id).select(`+passwordHash ${SECOND_FACTOR_FIELDS}`);
  if (!admin || admin.status !== 'active' || challenge.pf !== passwordFingerprint(admin) || !admin.twoFactor?.enabled) return expired();

  const used = await useSecondFactor(AdminUser, admin, code);
  if (!used) return res.status(401).json({ message: "That code didn't work. Check your authenticator app and try again." });
  if (used === 'recovery') {
    req.log.warn({ adminId: String(admin._id), left: admin.twoFactor.recoveryCodes.length }, 'admin signed in with a recovery code');
  }
  await startSession(req, res, admin);
});

// GET /admin-auth/me
exports.getMe = asyncHandler(async (req, res) => {
  res.json({ admin: req.admin.toPublic(), setupTwoFactor: mustSetUpTwoFactor(req.admin) });
});

// POST /admin-auth/logout: ends the session everywhere it's used
exports.logout = asyncHandler(async (req, res) => {
  await AdminUser.updateOne({ _id: req.admin._id }, { $set: { sessionToken: newSessionToken() } });
  res.json({ message: 'Signed out.' });
});

// PATCH /admin-auth/profile { name }
exports.updateProfile = asyncHandler(async (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Name cannot be empty.' });
  req.admin.name = name.slice(0, 80);
  await req.admin.save({ validateBeforeSave: false });
  res.json({ admin: req.admin.toPublic() });
});

// PATCH /admin-auth/password { currentPassword, newPassword }
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const policy = passwordPolicy(newPassword);
  if (!policy.ok) return res.status(400).json({ message: policy.message });
  const admin = await AdminUser.findById(req.admin._id).select('+passwordHash');
  if (!(await admin.comparePassword(currentPassword))) {
    return res.status(400).json({ message: 'Current password is incorrect.' });
  }
  admin.passwordHash = newPassword;
  await startSession(req, res, admin, { message: 'Password changed.' });
});

// POST /admin-auth/forgot-password { email }
exports.forgotPassword = asyncHandler(async (req, res) => {
  const email = String(req.body?.email || '').toLowerCase().trim();
  if (!email) return res.status(400).json({ message: 'Email is required.' });
  const admin = await AdminUser.findOne({ email, status: 'active' });
  if (admin) {
    const raw = crypto.randomBytes(32).toString('hex');
    admin.resetPasswordToken = hashToken(raw);
    admin.resetPasswordExpires = new Date(Date.now() + RESET_TTL_MS);
    await admin.save({ validateBeforeSave: false });
    // Not awaited: waiting for the send would make real admins answer slower
    sendPasswordResetEmail(admin.email, `${URLS.admin}/reset-password/${raw}`, '30 minutes')
      .catch((err) => req.log.error({ err }, 'admin password reset email failed to send'));
  }
  // Same answer either way, so the form doesn't reveal who is an admin
  res.json({ message: 'If that is an admin account, we sent a reset link.' });
});

// POST /admin-auth/reset-password/:token { password }
// Also sets the first password of an invited admin (same link format).
exports.resetPassword = asyncHandler(async (req, res) => {
  const admin = await AdminUser.findOne({
    resetPasswordToken: hashToken(String(req.params.token || '')),
    resetPasswordExpires: { $gt: new Date() },
    status: { $in: ['active', 'invited'] },
  }).select('+resetPasswordToken +resetPasswordExpires');
  if (!admin) return res.status(400).json({ message: 'This link is invalid or has expired.' });

  const policy = passwordPolicy(req.body?.password);
  if (!policy.ok) return res.status(400).json({ message: policy.message });

  const wasInvite = admin.status === 'invited';
  admin.passwordHash = req.body.password;
  admin.status = 'active';
  admin.resetPasswordToken = undefined;
  admin.resetPasswordExpires = undefined;
  admin.sessionToken = newSessionToken(); // signs out every session
  await admin.save({ validateBeforeSave: false });
  res.json({ message: wasInvite ? 'Your admin account is ready. Sign in.' : 'Password changed. Sign in with it.', invited: wasInvite });
});

// ── Two-step sign-in ────────────────────────────────────────────

const loadWithSecrets = (req, extra = '') => AdminUser.findById(req.admin._id).select(`+passwordHash ${SECOND_FACTOR_FIELDS} ${extra}`.trim());

// GET /admin-auth/2fa
exports.getTwoFactor = asyncHandler(async (req, res) => {
  const admin = await loadWithSecrets(req);
  res.json({
    enabled: !!admin.twoFactor?.enabled,
    enabledAt: admin.twoFactor?.enabledAt || null,
    recoveryCodesLeft: admin.twoFactor?.recoveryCodes?.length || 0,
    required: adminRequiresTwoFactor(),
  });
});

// POST /admin-auth/2fa/setup { password }
exports.startTwoFactorSetup = asyncHandler(async (req, res) => {
  const admin = await loadWithSecrets(req);
  if (admin.twoFactor?.enabled) return res.status(400).json({ message: 'Two-step sign-in is already on.' });
  if (!(await admin.comparePassword(req.body?.password))) return res.status(400).json({ message: 'That password is not correct.' });

  const secret = generateSecret();
  admin.twoFactor.pendingSecret = seal(secret);
  admin.twoFactor.pendingCreatedAt = new Date();
  await admin.save({ validateBeforeSave: false });
  const url = otpauthUrl({ secret, account: admin.email, issuer: ISSUER });
  res.json({
    otpauthUrl: url,
    secret: secret.match(/.{1,4}/g).join(' '),
    qr: await QRCode.toDataURL(url, { margin: 1, width: 220, errorCorrectionLevel: 'M' }),
  });
});

// POST /admin-auth/2fa/enable { code }
exports.enableTwoFactor = asyncHandler(async (req, res) => {
  const admin = await loadWithSecrets(req, '+twoFactor.pendingSecret +twoFactor.pendingCreatedAt');
  const tf = admin.twoFactor;
  const expired = () => res.status(400).json({ message: 'The setup expired. Start again to get a new QR code.', code: 'SETUP_EXPIRED' });
  if (tf?.enabled) return res.status(400).json({ message: 'Two-step sign-in is already on.' });
  if (!tf?.pendingSecret || !tf.pendingCreatedAt || Date.now() - tf.pendingCreatedAt.getTime() > SETUP_WINDOW_MS) return expired();
  let secret;
  try { secret = open(tf.pendingSecret); } catch { return expired(); }
  const step = verifyCode(secret, req.body?.code);
  if (step == null) return res.status(400).json({ message: "That code didn't match. Use the current code from your authenticator app." });

  const { codes, hashes } = generateRecoveryCodes();
  Object.assign(tf, {
    enabled: true, enabledAt: new Date(), secret: tf.pendingSecret,
    pendingSecret: null, pendingCreatedAt: null, lastUsedStep: step, recoveryCodes: hashes,
  });
  req.log.info({ adminId: String(admin._id) }, 'admin turned on two-step sign-in');
  // Turning it on ends every other session
  await startSession(req, res, admin, { recoveryCodes: codes });
});

// Password and a current code (or recovery code), for turning off / new codes
async function confirmIdentity(req, res, admin) {
  if (!(await admin.comparePassword(req.body?.password))) {
    res.status(400).json({ message: 'That password is not correct.' });
    return false;
  }
  if (!(await useSecondFactor(AdminUser, admin, req.body?.code))) {
    res.status(400).json({ message: "That code didn't work. Use a current code from your authenticator app or a recovery code." });
    return false;
  }
  return true;
}

const TWO_FACTOR_OFF = { enabled: false, enabledAt: null, secret: null, pendingSecret: null, pendingCreatedAt: null, lastUsedStep: 0, recoveryCodes: [] };

// POST /admin-auth/2fa/disable { password, code }
exports.disableTwoFactor = asyncHandler(async (req, res) => {
  if (adminRequiresTwoFactor()) return res.status(400).json({ message: 'Admin accounts must keep two-step sign-in on.' });
  const admin = await loadWithSecrets(req);
  if (!admin.twoFactor?.enabled) return res.status(400).json({ message: 'Two-step sign-in is already off.' });
  if (!(await confirmIdentity(req, res, admin))) return;
  admin.twoFactor = { ...TWO_FACTOR_OFF };
  await admin.save({ validateBeforeSave: false });
  req.log.warn({ adminId: String(admin._id) }, 'admin turned off two-step sign-in');
  res.json({ message: 'Two-step sign-in is off.' });
});

// POST /admin-auth/2fa/recovery-codes { password, code }
exports.regenerateRecoveryCodes = asyncHandler(async (req, res) => {
  const admin = await loadWithSecrets(req);
  if (!admin.twoFactor?.enabled) return res.status(400).json({ message: 'Turn on two-step sign-in first.' });
  if (!(await confirmIdentity(req, res, admin))) return;
  const { codes, hashes } = generateRecoveryCodes();
  admin.twoFactor.recoveryCodes = hashes;
  await admin.save({ validateBeforeSave: false });
  res.json({ recoveryCodes: codes });
});

exports.TWO_FACTOR_OFF = TWO_FACTOR_OFF;
exports.hashToken = hashToken;
