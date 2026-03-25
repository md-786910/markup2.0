const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Project = require('../models/Project');
const Pin = require('../models/Pin');
const Comment = require('../models/Comment');
const Invitation = require('../models/Invitation');
const asyncHandler = require('../utils/asyncHandler');
const { sendPasswordResetEmail } = require('../utils/mailer');

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const userResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar || null,
});

exports.signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(400).json({ message: 'Email already registered' });
  }

  // First user becomes admin automatically
  const userCount = await User.countDocuments();
  const role = userCount === 0 ? 'admin' : 'member';

  const user = await User.create({
    name,
    email,
    passwordHash: password, // pre-save hook will hash it
    role,
  });

  // Auto-accept any pending invitations for this email
  const pendingInvites = await Invitation.find({ email: email.toLowerCase(), status: 'pending' });
  for (const invite of pendingInvites) {
    await Project.findByIdAndUpdate(invite.project, { $addToSet: { members: user._id } });
    invite.status = 'accepted';
    await invite.save();
  }

  const token = generateToken(user);

  res.cookie('markup_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  res.status(201).json({
    token,
    user: userResponse(user),
  });
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

  const token = generateToken(user);

  res.cookie('markup_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  res.json({
    token,
    user: userResponse(user),
  });
});

exports.getMe = asyncHandler(async (req, res) => {
  res.json({ user: userResponse(req.user) });
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
  res.json({ user: userResponse(user) });
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

  user.passwordHash = newPassword; // pre-save hook will hash it
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

  res.json({ user: userResponse(user) });
});

// Delete account
exports.deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.user._id;

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

  // Always return success to prevent email enumeration
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

  user.passwordHash = password; // pre-save hook will hash it
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({ message: 'Password has been reset successfully' });
});
