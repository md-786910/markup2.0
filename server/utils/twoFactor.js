const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { verifyCode } = require('./totp');
const { open } = require('./secretBox');

// Shared pieces of two-step sign-in: the short-lived challenge issued after a
// correct password, recovery codes, and the admin policy.

const CHALLENGE_TTL = '5m';
const RECOVERY_CODE_COUNT = 10;
const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I

// Signed with its own key per scope ('admin' for the admin panel), so a
// challenge can never pass as a session token or cross between the two apps
const challengeKey = (scope) => `${process.env.JWT_SECRET}:2fa-challenge:${scope}`;

// Ties a challenge to the current password: a reset invalidates open challenges
const passwordFingerprint = (user) => crypto.createHash('sha256').update(String(user.passwordHash)).digest('hex').slice(0, 16);

function issueChallenge(user, scope) {
  return jwt.sign({ id: String(user._id), purpose: '2fa', pf: passwordFingerprint(user) }, challengeKey(scope), { expiresIn: CHALLENGE_TTL, algorithm: 'HS256' });
}

// The decoded challenge, or null; the caller still checks pf against the user
function readChallenge(token, scope) {
  try {
    const decoded = jwt.verify(String(token || ''), challengeKey(scope), { algorithms: ['HS256'] });
    return decoded.purpose === '2fa' ? decoded : null;
  } catch {
    return null;
  }
}

const normalizeRecoveryCode = (code) => String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const hashRecoveryCode = (code) => crypto.createHash('sha256').update(normalizeRecoveryCode(code)).digest('hex');

// Plain codes for the user (shown once) and their hashes for the database
function generateRecoveryCodes() {
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, () => {
    const bytes = crypto.randomBytes(10);
    const chars = Array.from(bytes, (b) => RECOVERY_ALPHABET[b % RECOVERY_ALPHABET.length]).join('');
    return `${chars.slice(0, 5)}-${chars.slice(5)}`;
  });
  return { codes, hashes: codes.map(hashRecoveryCode) };
}

/**
 * Check an authenticator code or a recovery code for an account loaded with
 * SECOND_FACTOR_FIELDS. On success it records the use on `user` (the caller
 * saves) and returns 'totp' or 'recovery'; otherwise null.
 */
function checkSecondFactor(user, code) {
  const tf = user.twoFactor || {};
  if (!tf.enabled || !tf.secret) return null;
  const raw = String(code || '').trim();
  if (/^\d{3}\s?\d{3}$/.test(raw)) {
    let secret;
    try { secret = open(tf.secret); } catch { return null; }
    const step = verifyCode(secret, raw, { afterStep: tf.lastUsedStep || 0 });
    if (step == null) return null;
    user.twoFactor.lastUsedStep = step;
    return 'totp';
  }
  const hash = hashRecoveryCode(raw);
  const codes = tf.recoveryCodes || [];
  const index = codes.findIndex((h) => h.length === hash.length && crypto.timingSafeEqual(Buffer.from(h), Buffer.from(hash)));
  if (index === -1) return null;
  user.twoFactor.recoveryCodes = codes.filter((_, i) => i !== index);
  return 'recovery';
}

/**
 * checkSecondFactor, then records the use in the database atomically, so the
 * same code (or recovery code) can't pass for two requests sent at once.
 * Model is the account's model (e.g. AdminUser).
 */
async function useSecondFactor(Model, user, code) {
  const previousStep = user.twoFactor?.lastUsedStep || 0;
  const used = checkSecondFactor(user, code);
  if (used === 'totp') {
    const step = user.twoFactor.lastUsedStep;
    const claimed = await Model.updateOne(
      { _id: user._id, $or: [{ 'twoFactor.lastUsedStep': { $lt: step } }, { 'twoFactor.lastUsedStep': null }] },
      { $set: { 'twoFactor.lastUsedStep': step } },
    );
    if (!claimed.modifiedCount) { user.twoFactor.lastUsedStep = previousStep; return null; }
    user.unmarkModified('twoFactor.lastUsedStep');
  } else if (used === 'recovery') {
    const hash = hashRecoveryCode(code);
    const claimed = await Model.updateOne({ _id: user._id, 'twoFactor.recoveryCodes': hash }, { $pull: { 'twoFactor.recoveryCodes': hash } });
    if (!claimed.modifiedCount) return null;
    user.unmarkModified('twoFactor.recoveryCodes');
  }
  return used;
}

// Admin accounts must use two-step sign-in; only ADMIN_REQUIRE_2FA=false
// (e.g. on a local machine) turns the rule off
function adminRequiresTwoFactor() {
  return process.env.ADMIN_REQUIRE_2FA !== 'false';
}

const SECOND_FACTOR_FIELDS = '+twoFactor.secret +twoFactor.lastUsedStep +twoFactor.recoveryCodes';

module.exports = {
  issueChallenge,
  readChallenge,
  passwordFingerprint,
  generateRecoveryCodes,
  checkSecondFactor,
  useSecondFactor,
  adminRequiresTwoFactor,
  SECOND_FACTOR_FIELDS,
};
