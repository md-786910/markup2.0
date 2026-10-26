const crypto = require('crypto');
const QRCode = require('qrcode');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { generateSecret, verifyCode, otpauthUrl } = require('../utils/totp');
const { seal, open } = require('../utils/secretBox');
const { generateRecoveryCodes, checkSecondFactor, adminRequiresTwoFactor, SECOND_FACTOR_FIELDS } = require('../utils/twoFactor');
const { setCookieAndRespond } = require('./auth.controller');

// Two-step sign-in settings for the signed-in account (admin accounts for now).
// Wrong passwords and codes answer 400, not 401, so the apps don't sign out.

const SETUP_WINDOW_MS = 15 * 60 * 1000;
const ISSUER = 'Kommently';

async function loadUser(req, extra = '') {
  return User.findById(req.user._id).select(`+passwordHash ${SECOND_FACTOR_FIELDS} ${extra}`.trim());
}

// GET /auth/2fa
exports.getStatus = asyncHandler(async (req, res) => {
  const user = await loadUser(req);
  res.json({
    enabled: !!user.twoFactor?.enabled,
    enabledAt: user.twoFactor?.enabledAt || null,
    recoveryCodesLeft: user.twoFactor?.recoveryCodes?.length || 0,
    required: req.user.role === 'superadmin' && adminRequiresTwoFactor(),
  });
});

// POST /auth/2fa/setup { password }: a new secret to scan, kept pending until confirmed
exports.startSetup = asyncHandler(async (req, res) => {
  const user = await loadUser(req);
  if (user.twoFactor?.enabled) return res.status(400).json({ message: 'Two-step sign-in is already on.' });
  if (!(await user.comparePassword(String(req.body?.password || '')))) {
    return res.status(400).json({ message: 'That password is not correct.' });
  }
  const secret = generateSecret();
  user.twoFactor.pendingSecret = seal(secret);
  user.twoFactor.pendingCreatedAt = new Date();
  await user.save({ validateBeforeSave: false });

  const url = otpauthUrl({ secret, account: user.email, issuer: ISSUER });
  res.json({
    otpauthUrl: url,
    secret: secret.match(/.{1,4}/g).join(' '),
    qr: await QRCode.toDataURL(url, { margin: 1, width: 220, errorCorrectionLevel: 'M' }),
  });
});

// POST /auth/2fa/enable { code }: confirms the app works, then turns it on
exports.enable = asyncHandler(async (req, res) => {
  const user = await loadUser(req, '+twoFactor.pendingSecret +twoFactor.pendingCreatedAt');
  const tf = user.twoFactor;
  if (tf?.enabled) return res.status(400).json({ message: 'Two-step sign-in is already on.' });
  if (!tf?.pendingSecret || !tf.pendingCreatedAt || Date.now() - tf.pendingCreatedAt.getTime() > SETUP_WINDOW_MS) {
    return res.status(400).json({ message: 'The setup expired. Start again to get a new QR code.', code: 'SETUP_EXPIRED' });
  }
  let secret;
  try { secret = open(tf.pendingSecret); } catch {
    return res.status(400).json({ message: 'The setup expired. Start again to get a new QR code.', code: 'SETUP_EXPIRED' });
  }
  const step = verifyCode(secret, req.body?.code);
  if (step == null) return res.status(400).json({ message: "That code didn't match. Use the current code from your authenticator app." });

  const { codes, hashes } = generateRecoveryCodes();
  tf.enabled = true;
  tf.enabledAt = new Date();
  tf.secret = tf.pendingSecret;
  tf.pendingSecret = null;
  tf.pendingCreatedAt = null;
  tf.lastUsedStep = step;
  tf.recoveryCodes = hashes;
  // Turning 2FA on signs out every other session
  user.sessionToken = crypto.randomBytes(32).toString('hex');
  await user.save({ validateBeforeSave: false });
  req.log.info({ userId: String(user._id) }, 'two-step sign-in turned on');

  await setCookieAndRespond(res, user, req.organization || null, 200, { recoveryCodes: codes });
});

// Password and a current code (or recovery code), for the changes below
async function confirmIdentity(req, res, user) {
  if (!(await user.comparePassword(String(req.body?.password || '')))) {
    res.status(400).json({ message: 'That password is not correct.' });
    return false;
  }
  if (!checkSecondFactor(user, req.body?.code)) {
    res.status(400).json({ message: "That code didn't work. Use a current code from your authenticator app or a recovery code." });
    return false;
  }
  return true;
}

// POST /auth/2fa/disable { password, code }
exports.disable = asyncHandler(async (req, res) => {
  if (req.user.role === 'superadmin' && adminRequiresTwoFactor()) {
    return res.status(400).json({ message: 'Admin accounts must keep two-step sign-in on.' });
  }
  const user = await loadUser(req);
  if (!user.twoFactor?.enabled) return res.status(400).json({ message: 'Two-step sign-in is already off.' });
  if (!(await confirmIdentity(req, res, user))) return;
  user.twoFactor = { enabled: false, enabledAt: null, secret: null, pendingSecret: null, pendingCreatedAt: null, lastUsedStep: 0, recoveryCodes: [] };
  await user.save({ validateBeforeSave: false });
  req.log.warn({ userId: String(user._id) }, 'two-step sign-in turned off');
  res.json({ message: 'Two-step sign-in is off.' });
});

// POST /auth/2fa/recovery-codes { password, code }: replaces every recovery code
exports.regenerateRecoveryCodes = asyncHandler(async (req, res) => {
  const user = await loadUser(req);
  if (!user.twoFactor?.enabled) return res.status(400).json({ message: 'Turn on two-step sign-in first.' });
  if (!(await confirmIdentity(req, res, user))) return;
  const { codes, hashes } = generateRecoveryCodes();
  user.twoFactor.recoveryCodes = hashes;
  await user.save({ validateBeforeSave: false });
  res.json({ recoveryCodes: codes });
});
