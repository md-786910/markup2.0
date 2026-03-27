const crypto = require('crypto');

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Project = require('../models/Project');
const Pin = require('../models/Pin');
const Comment = require('../models/Comment');
const Invitation = require('../models/Invitation');
const asyncHandler = require('../utils/asyncHandler');
const { sendPasswordResetEmail } = require('../utils/mailer');
const { ROLE_HIERARCHY } = require('../middleware/roles');

const generateSessionToken = () => crypto.randomBytes(32).toString('hex');

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, sessionToken: user.sessionToken },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const userResponse = (user, org) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar || null,
  organization: user.organization || null,
  orgLocked: org ? org.isLocked : false,
  orgPlan: org ? org.plan : null,
  orgName: org ? org.name : null,
  orgTrialEndsAt: org ? org.trialEndsAt : null,
});

const setCookieAndRespond = (res, user, org, statusCode = 200, extra = {}) => {
  const token = generateToken(user);
  res.cookie('markup_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
  res.status(statusCode).json({ token, user: userResponse(user, org), ...extra });
};

exports.signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(400).json({ message: 'Email already registered' });
  }

  const userCount = await User.countDocuments();
  const isFirstUser = userCount === 0;
  const sessionToken = generateSessionToken();

  // Determine role and organization
  let role = 'member';
  let organizationId = null;
  let org = null;

  if (isFirstUser) {
    // First user becomes owner and creates the organization
    role = 'owner';
  }

  const user = await User.create({
    name,
    email,
    passwordHash: password,
    role,
    sessionToken,
  });

  if (isFirstUser) {
    // Create organization for the first user
    org = await Organization.create({
      name: name + "'s Workspace",
      owner: user._id,
    });
    user.organization = org._id;
    await user.save({ validateBeforeSave: false });
  }

  // Auto-accept any pending invitations for this email
  const pendingInvites = await Invitation.find({ email: email.toLowerCase(), status: 'pending' });
  if (pendingInvites.length > 0) {
    // Assign the highest role from invitations (for non-first users)
    if (!isFirstUser) {
      let bestRole = 'member';
      let inviteOrg = null;
      for (const invite of pendingInvites) {
        if (invite.role && ROLE_HIERARCHY[invite.role] < ROLE_HIERARCHY[bestRole]) {
          bestRole = invite.role;
        }
        if (invite.organization) {
          inviteOrg = invite.organization;
        }
      }
      user.role = bestRole;
      if (inviteOrg) {
        user.organization = inviteOrg;
        org = await Organization.findById(inviteOrg);
      }
      await user.save({ validateBeforeSave: false });
    }

    // Add user to all invited projects
    for (const invite of pendingInvites) {
      await Project.findByIdAndUpdate(invite.project, { $addToSet: { members: user._id } });
      invite.status = 'accepted';
      await invite.save();
    }
  }

  setCookieAndRespond(res, user, org, 201, { isNewOrg: isFirstUser });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Generate new session token (invalidates all other sessions)
  user.sessionToken = generateSessionToken();
  await user.save({ validateBeforeSave: false });

  const org = user.organization ? await Organization.findById(user.organization) : null;
  setCookieAndRespond(res, user, org);
});

exports.getMe = asyncHandler(async (req, res) => {
  const org = req.organization || null;
  res.json({ user: userResponse(req.user, org) });
});

// Update profile (name, email)
exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  const user = req.user;

  if (name !== undefined) {
    if (!name.trim()) {
      return res.status(400).json({ message: 'Name cannot be empty' });
    }
    user.name = name.trim();
  }

  if (email !== undefined) {
    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Email cannot be empty' });
    }
    if (normalizedEmail !== user.email) {
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      user.email = normalizedEmail;
    }
  }

  await user.save({ validateBeforeSave: true });
  const org = req.organization || null;
  res.json({ user: userResponse(user, org) });
});

// Change password (requires current password)
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current password and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters' });
  }

  const user = await User.findById(req.user._id).select('+passwordHash');
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return res.status(401).json({ message: 'Current password is incorrect' });
  }

  user.passwordHash = newPassword;
  user.sessionToken = generateSessionToken(); // Invalidate other sessions
  await user.save();

  res.json({ message: 'Password changed successfully' });
});

// Upload avatar
exports.uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const user = req.user;
  user.avatar = req.file.filename;
  await user.save({ validateBeforeSave: false });

  const org = req.organization || null;
  res.json({ user: userResponse(user, org) });
});

// Delete account
exports.deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Prevent owner from deleting their account (must transfer ownership first)
  if (req.user.role === 'owner') {
    return res.status(403).json({ message: 'Organization owner cannot delete their account. Transfer ownership first.' });
  }

  // Find projects owned by this user
  const ownedProjects = await Project.find({ owner: userId });
  const ownedProjectIds = ownedProjects.map((p) => p._id);

  // Delete pins and comments for owned projects
  if (ownedProjectIds.length > 0) {
    const pins = await Pin.find({ project: { $in: ownedProjectIds } });
    const pinIds = pins.map((p) => p._id);
    await Comment.deleteMany({ pin: { $in: pinIds } });
    await Pin.deleteMany({ project: { $in: ownedProjectIds } });
    await Project.deleteMany({ owner: userId });
  }

  // Remove user from member lists of other projects
  await Project.updateMany(
    { members: userId },
    { $pull: { members: userId } }
  );

  // Delete invitations created for this user's email
  await Invitation.deleteMany({ email: req.user.email });

  // Delete the user
  await User.findByIdAndDelete(userId);

  // Clear auth cookie
  res.clearCookie('markup_token', { path: '/' });

  res.json({ message: 'Account deleted successfully' });
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  const user = await User.findOne({ email });

  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_ORIGIN || 'http://localhost:3000'}/reset-password/${rawToken}`;

    try {
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ message: 'Failed to send reset email. Please try again.' });
    }
  }

  res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: 'Password is required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  }).select('+resetPasswordToken +resetPasswordExpires');

  if (!user) {
    return res.status(400).json({ message: 'Invalid or expired reset token' });
  }

  user.passwordHash = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.sessionToken = generateSessionToken(); // Invalidate all sessions
  await user.save();

  res.json({ message: 'Password has been reset successfully' });
});

// Update organization (name, logo) — also creates org if missing
exports.updateOrganization = asyncHandler(async (req, res) => {
  let org = null;

  if (req.user.organization) {
    org = await Organization.findById(req.user.organization);
  }

  // If no org exists yet (e.g. first-time setup), create one and promote user to owner
  if (!org) {
    const { name } = req.body;
    org = await Organization.create({
      name: (name && name.trim()) || req.user.name + "'s Workspace",
      owner: req.user._id,
    });
    req.user.organization = org._id;
    req.user.role = 'owner';
    await req.user.save({ validateBeforeSave: false });
  } else {
    // Only owner can update existing org
    if (org.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the organization owner can update settings' });
    }
  }

  const { name } = req.body;
  if (name !== undefined) {
    if (!name.trim()) {
      return res.status(400).json({ message: 'Organization name cannot be empty' });
    }
    org.name = name.trim();
  }

  if (req.file) {
    org.logo = req.file.filename;
  }

  await org.save();

  res.json({ user: userResponse(req.user, org) });
});

exports.validateEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ valid: false, message: 'Email is required' });
  }

  // Format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ valid: false, message: 'Invalid email format' });
  }

  // Check if email already registered
  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return res.status(400).json({ valid: false, message: 'Email already registered' });
  }

  res.json({ valid: true });
});
