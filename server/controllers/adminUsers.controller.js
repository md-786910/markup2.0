const crypto = require('crypto');
const AdminUser = require('../models/AdminUser');
const asyncHandler = require('../utils/asyncHandler');
const { URLS } = require('../config/env');
const { newSessionToken } = require('../utils/adminSession');
const { logAdminAction } = require('../utils/activityLogger');
const { sendAdminInviteEmail } = require('../utils/mailer');
const { TWO_FACTOR_OFF, hashToken } = require('./adminAuth.controller');

// The admin team: every admin can invite, disable and remove other admins,
// but nobody can lock themselves out or remove the last active admin.

const INVITE_TTL_MS = 72 * 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function sendInvite(req, target) {
  const raw = crypto.randomBytes(32).toString('hex');
  target.resetPasswordToken = hashToken(raw);
  target.resetPasswordExpires = new Date(Date.now() + INVITE_TTL_MS);
  await target.save({ validateBeforeSave: false });
  await sendAdminInviteEmail(target.email, {
    name: target.name,
    inviterName: req.admin.name,
    setPasswordUrl: `${URLS.admin}/reset-password/${raw}?invite=1`,
  });
}

async function findTarget(req, res) {
  const target = await AdminUser.findById(req.params.adminId);
  if (!target) res.status(404).json({ message: 'Admin not found.' });
  return target;
}

async function isLastActiveAdmin(target) {
  if (target.status !== 'active') return false;
  return (await AdminUser.countDocuments({ status: 'active', _id: { $ne: target._id } })) === 0;
}

// GET /admin/admins
exports.listAdmins = asyncHandler(async (req, res) => {
  const admins = await AdminUser.find().sort({ createdAt: 1 }).populate('invitedBy', 'name');
  res.json({
    admins: admins.map((a) => ({ ...a.toPublic(), invitedBy: a.invitedBy?.name || null, isYou: String(a._id) === String(req.admin._id) })),
  });
});

// POST /admin/admins { name, email }
exports.inviteAdmin = asyncHandler(async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').toLowerCase().trim();
  if (!name) return res.status(400).json({ message: 'Enter their name.' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
  if (await AdminUser.exists({ email })) return res.status(400).json({ message: 'That email already has an admin account.' });

  const target = await AdminUser.create({ name: name.slice(0, 80), email, status: 'invited', invitedBy: req.admin._id });
  try {
    await sendInvite(req, target);
  } catch (err) {
    req.log.error({ err }, 'admin invite email failed to send');
    await AdminUser.deleteOne({ _id: target._id });
    return res.status(502).json({ message: 'The invitation email could not be sent. Check the email settings and try again.' });
  }
  logAdminAction(null, req.admin, 'admin.invited', { email, name: target.name });
  res.status(201).json({ admin: target.toPublic() });
});

// POST /admin/admins/:adminId/resend
exports.resendInvite = asyncHandler(async (req, res) => {
  const target = await findTarget(req, res);
  if (!target) return;
  if (target.status !== 'invited') return res.status(400).json({ message: 'This admin has already set a password.' });
  try {
    await sendInvite(req, target);
  } catch (err) {
    req.log.error({ err }, 'admin invite email failed to send');
    return res.status(502).json({ message: 'The invitation email could not be sent.' });
  }
  res.json({ message: `Invitation sent again to ${target.email}.` });
});

// PATCH /admin/admins/:adminId { status: 'active' | 'disabled' }
exports.setAdminStatus = asyncHandler(async (req, res) => {
  const target = await findTarget(req, res);
  if (!target) return;
  const status = req.body?.status;
  if (!['active', 'disabled'].includes(status)) return res.status(400).json({ message: 'Status must be active or disabled.' });
  if (String(target._id) === String(req.admin._id)) return res.status(400).json({ message: "You can't change your own access." });
  if (status === 'active' && target.status !== 'disabled') return res.status(400).json({ message: 'Only disabled admins can be turned back on.' });
  if (status === 'disabled' && (await isLastActiveAdmin(target))) return res.status(400).json({ message: "You can't disable the last active admin." });

  target.status = status;
  target.sessionToken = newSessionToken(); // signs them out right away
  await target.save({ validateBeforeSave: false });
  logAdminAction(null, req.admin, status === 'disabled' ? 'admin.disabled' : 'admin.enabled', { email: target.email, name: target.name });
  res.json({ admin: target.toPublic() });
});

// DELETE /admin/admins/:adminId
exports.removeAdmin = asyncHandler(async (req, res) => {
  const target = await findTarget(req, res);
  if (!target) return;
  if (String(target._id) === String(req.admin._id)) return res.status(400).json({ message: "You can't remove yourself." });
  if (await isLastActiveAdmin(target)) return res.status(400).json({ message: "You can't remove the last active admin." });
  await AdminUser.deleteOne({ _id: target._id });
  logAdminAction(null, req.admin, 'admin.removed', { email: target.email, name: target.name });
  res.json({ message: `${target.name} no longer has admin access.` });
});

// POST /admin/admins/:adminId/reset-2fa: for an admin who lost their phone
// and recovery codes; they set it up again at their next sign-in
exports.resetAdminTwoFactor = asyncHandler(async (req, res) => {
  const target = await findTarget(req, res);
  if (!target) return;
  if (String(target._id) === String(req.admin._id)) return res.status(400).json({ message: 'Manage your own two-step sign-in from Your account.' });
  if (!target.twoFactor?.enabled) return res.status(400).json({ message: 'Two-step sign-in is already off for this admin.' });
  target.twoFactor = { ...TWO_FACTOR_OFF };
  target.sessionToken = newSessionToken();
  await target.save({ validateBeforeSave: false });
  logAdminAction(null, req.admin, 'admin.two_factor_reset', { email: target.email, name: target.name });
  res.json({ admin: target.toPublic() });
});
