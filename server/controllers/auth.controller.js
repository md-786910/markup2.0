const crypto = require("crypto");
const Notification = require('../models/Notification');
const { deleteProjectCascade } = require('../utils/cascade');
const { DELETION_LOCK_REASON } = require('../utils/orgUtils');
const { deleteStoredFiles } = require('../utils/storage');

const jwt = require("jsonwebtoken");
const geoip = require("geoip-lite");
const User = require("../models/User");
const Organization = require("../models/Organization");
const Project = require("../models/Project");
const Pin = require("../models/Pin");
const Comment = require("../models/Comment");
const Invitation = require("../models/Invitation");
const Invoice = require("../models/Invoice");
const asyncHandler = require("../utils/asyncHandler");
const { sendPasswordResetEmail } = require("../utils/mailer");
const { ROLE_HIERARCHY } = require("../middleware/roles");
const { getLimitsForPlanAsync, getNewSignupPlanMode, getSupportForPlan } = require("../config/plans");
const { generateCsrfToken, CSRF_COOKIE } = require("../middleware/csrf");
const { validatePassword } = require("../utils/passwordPolicy");
const { logOrgActivity, logActivity } = require("../utils/activityLogger");
const { metric } = require("../instrument");
const { createProjectNotifications, createSingleNotification } = require("../utils/notificationHelper");
const { URLS, SECURE_COOKIES } = require('../config/env');

// Build the plan-related fields for a freshly-created Organization.
// When admin has flipped Free as the default for new signups, skip the trial
// and start the org on Free with an active subscription. Otherwise fall
// through to schema defaults (plan='trial', trialEndsAt=+30d).
async function buildSignupPlanFields() {
  const mode = await getNewSignupPlanMode();
  if (mode === 'free') {
    return {
      plan: 'free',
      trialEndsAt: null,
      subscription: { status: 'active', currentPeriodEnd: null },
    };
  }
  return {};
}

const generateSessionToken = () => crypto.randomBytes(32).toString("hex");

const getLocationFromIp = (ip) => {
  const geo = geoip.lookup(ip);
  if (!geo) return { city: null, region: null, country: null };
  return { city: geo.city || null, region: geo.region || null, country: geo.country || null };
};

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, sessionToken: user.sessionToken },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d", algorithm: "HS256" },
  );
};

const userResponse = (user, org, dynamicLimits) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar || null,
  organization: user.organization || null,
  orgLocked: org ? org.isLocked : false,
  orgLockedReason: org ? org.lockedReason : null,
  orgDeletionScheduledAt: org ? org.deletionScheduledAt || null : null,
  orgPlan: org ? org.plan : null,
  orgName: org ? org.name : null,
  orgLogo: org ? org.logo || null : null,
  orgTrialEndsAt: org ? org.trialEndsAt : null,
  orgTrialDays: org ? org.trialDays : null,
  orgLimits: dynamicLimits || (org ? org.limits : null),
  orgSubscription: org ? org.subscription : null,
  // Attached by callers via attachPendingInvoice(org) before calling userResponse.
  // null when the org has no pending invoice.
  orgPendingInvoice: org && org._pendingInvoice ? org._pendingInvoice : null,
  mutedProjectEmails: (user.mutedProjectEmails || []).map((id) => id.toString()),
  emailNotificationsEnabled: user.emailNotificationsEnabled !== false,
  // Support channels of the plan (config/plans.js)
  orgSupport: org ? getSupportForPlan(org.plan, org.trialEndsAt) : null,
});

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Fetch the most recent pending invoice for the org and attach a minimal
 * projection to org._pendingInvoice. Safe to call with a null org (no-op).
 */
async function attachPendingInvoice(org) {
  if (!org) return;
  // Only auto-billing cycle invoices (billingMonth set) drive the banner.
  // Pending one-off checkout sessions the user abandoned are NOT real unpaid
  // bills — they're stale orders and should be ignored here. Same filter as
  // getInvoices so the banner and the invoices tab stay consistent.
  const inv = await Invoice.findOne({
    organization: org._id,
    status: 'pending',
    billingMonth: { $type: 'string' },
  })
    .sort({ createdAt: -1 })
    .lean();
  if (!inv) {
    org._pendingInvoice = null;
    return;
  }
  const dueAt = inv.dueAt ? new Date(inv.dueAt) : null;
  const daysUntilDue = dueAt
    ? Math.ceil((dueAt.getTime() - Date.now()) / DAY_MS)
    : null;
  org._pendingInvoice = {
    _id: inv._id,
    amount: inv.amount,
    currency: inv.currency,
    dueAt: inv.dueAt || null,
    daysUntilDue,
    provider: inv.provider || 'razorpay',
    razorpayOrderId: inv.razorpayOrderId || null,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || null,
    paypalOrderId: inv.paypalOrderId || null,
    paypalClientId: process.env.PAYPAL_CLIENT_ID || null,
    plan: inv.plan,
  };
}

// Exported for reuse in billing controller
exports.userResponse = userResponse;
exports.attachPendingInvoice = attachPendingInvoice;

const setCookieAndRespond = async (res, user, org, statusCode = 200, extra = {}) => {
  const token = generateToken(user);
  res.cookie("markup_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: SECURE_COOKIES,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });

  // CSRF double-submit token: non-httpOnly so the SPA can read it from
  // document.cookie and echo it back in the X-CSRF-Token header.
  const csrfToken = generateCsrfToken();
  res.cookie(CSRF_COOKIE, csrfToken, {
    httpOnly: false,
    sameSite: "lax",
    secure: SECURE_COOKIES,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });

  let dynamicLimits = null;
  if (org) {
    dynamicLimits = await getLimitsForPlanAsync(org.plan);
    await attachPendingInvoice(org);
  }

  res
    .status(statusCode)
    .json({ token, user: userResponse(user, org, dynamicLimits), ...extra });
};

exports.signup = asyncHandler(async (req, res) => {
  const { name, email, password, invitationToken } = req.body;

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ message: "Name, email, and password are required" });
  }

  const policy = validatePassword(password);
  if (!policy.ok) {
    return res.status(400).json({ message: policy.message });
  }

  const emailNorm = email.toLowerCase().trim();

  const existing = await User.findOne({ email: emailNorm });
  if (existing) {
    return res.status(400).json({ message: "Email already registered" });
  }

  const now = new Date();
  let invitationForSignup = null;
  if (invitationToken) {
    invitationForSignup = await Invitation.findOne({
      token: invitationToken,
      email: emailNorm,
      status: "pending",
      expiresAt: { $gt: now },
    });

    if (!invitationForSignup) {
      return res
        .status(400)
        .json({ message: "Invitation not found, expired, or does not match this email." });
    }
  }

  // Email must have been verified via OTP within the past 10 minutes.
  // The first-user case bypasses this gate so a fresh deploy isn't bricked
  // when SMTP isn't configured yet. A valid invitation token also proves
  // control of the invited inbox because it was delivered to that address.
  const userCountForGate = await User.countDocuments();
  if (userCountForGate > 0 && !invitationForSignup) {
    const EmailVerification = require("../models/EmailVerification");
    const verification = await EmailVerification.findOne({ email: emailNorm });
    const fresh =
      verification &&
      verification.verifiedAt &&
      Date.now() - verification.verifiedAt.getTime() < EmailVerification.TTL_MS;
    if (!fresh) {
      return res
        .status(400)
        .json({ message: "Email not verified. Please verify the OTP first." });
    }
  }

  const userCount = await User.countDocuments();
  const isFirstUser = userCount === 0;
  const sessionToken = generateSessionToken();

  // Determine role and organization
  let role = "member";
  let organizationId = null;
  let org = null;

  if (isFirstUser) {
    // First user becomes owner and creates the organization
    role = "owner";
  }

  const clientIp = req.ip;
  const location = getLocationFromIp(clientIp);

  const user = await User.create({
    name,
    email,
    passwordHash: password,
    role,
    sessionToken,
    signupIp: clientIp,
    signupLocation: location,
    lastLoginIp: clientIp,
    lastLoginLocation: location,
  });

  if (isFirstUser) {
    // Create organization for the first user
    const planFields = await buildSignupPlanFields();
    org = await Organization.create({
      name: name + "'s Workspace",
      owner: user._id,
      ...planFields,
    });
    user.organization = org._id;
    await user.save({ validateBeforeSave: false });
  }

  // Auto-accept any pending invitations for this email
  const pendingInvites = await Invitation.find({
    email: emailNorm,
    status: "pending",
    expiresAt: { $gt: new Date() },
  });
  let acceptedProjectId = null;
  let acceptedWorkspaceId = null;
  if (pendingInvites.length > 0) {
    // Assign the highest role from invitations (for non-first users)
    if (!isFirstUser) {
      let bestRole = "member";
      let inviteOrg = null;
      for (const invite of pendingInvites) {
        if (
          invite.role &&
          ROLE_HIERARCHY[invite.role] < ROLE_HIERARCHY[bestRole]
        ) {
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
    const io = req.app.get('io');
    for (const invite of pendingInvites) {
      // Workspace invitation: join the workspace (every project in it)
      if (invite.workspace) {
        const { capForRole } = require("../utils/access");
        await require("../models/Workspace").updateOne(
          { _id: invite.workspace, organization: invite.organization, "members.user": { $ne: user._id } },
          { $push: { members: { user: user._id, level: capForRole(invite.level || "comment", user.role) } } },
        );
        if (!acceptedWorkspaceId) acceptedWorkspaceId = invite.workspace;
        invite.status = "accepted";
        await invite.save();
        continue;
      }
      await Project.findByIdAndUpdate(invite.project, {
        $addToSet: { members: user._id },
      });
      if (invite.level) {
        await Project.updateOne(
          { _id: invite.project, "memberAccess.user": { $ne: user._id } },
          { $push: { memberAccess: { user: user._id, level: require("../utils/access").capForRole(invite.level, user.role) } } },
        );
      }
      if (!acceptedProjectId) {
        acceptedProjectId = invite.project;
      }
      invite.status = "accepted";
      await invite.save();

      const invProj = await Project.findById(invite.project);
      if (invProj) {
        logActivity(invProj._id, user._id, 'member.joined', {
          memberName: user.name,
          memberEmail: user.email,
        });

        createSingleNotification({
          io,
          recipientId: user._id,
          actor: invite.invitedBy,
          projectId: invProj._id,
          type: 'member_invited',
          title: `Welcome to ${invProj.name}!`,
          message: `You have joined the project.`,
          metadata: { projectName: invProj.name },
        });

        createProjectNotifications({
          io,
          projectId: invProj._id,
          actor: user,
          type: 'member_invited',
          message: `${user.name} joined the project.`,
          metadata: {
            projectName: invProj.name,
            targetMemberName: user.name,
            targetMemberEmail: user.email,
          },
          excludeRecipientIds: [user._id.toString()],
        });
      }
    }
  }

  metric('user.signup', { kind: acceptedProjectId || acceptedWorkspaceId ? 'invited' : (isFirstUser ? 'new_org' : 'joined') });
  await setCookieAndRespond(res, user, org, 201, {
    isNewOrg: isFirstUser,
    invitedProjectId: acceptedProjectId ? acceptedProjectId.toString() : undefined,
    invitedWorkspaceId: acceptedWorkspaceId ? acceptedWorkspaceId.toString() : undefined,
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    "+passwordHash",
  );
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  await startSession(req, res, user);
});

// New session for a fully signed-in user (invalidates all other sessions)
async function startSession(req, res, user) {
  user.sessionToken = generateSessionToken();
  const clientIp = req.ip;
  user.lastLoginIp = clientIp;
  user.lastLoginLocation = getLocationFromIp(clientIp);
  await user.save({ validateBeforeSave: false });

  const org = user.organization
    ? await Organization.findById(user.organization)
    : null;
  await setCookieAndRespond(res, user, org);
}

exports.getMe = asyncHandler(async (req, res) => {
  const org = req.organization || null;
  let dynamicLimits = null;
  if (org) {
    dynamicLimits = await getLimitsForPlanAsync(org.plan);
    await attachPendingInvoice(org);
  }
  res.json({ user: userResponse(req.user, org, dynamicLimits) });
});

// Update profile (name, email)
exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, email, currentPassword, emailNotificationsEnabled } = req.body;
  const user = req.user;

  if (typeof emailNotificationsEnabled === "boolean") {
    user.emailNotificationsEnabled = emailNotificationsEnabled;
  }

  if (name !== undefined) {
    if (!name.trim()) {
      return res.status(400).json({ message: "Name cannot be empty" });
    }
    user.name = name.trim();
  }

  if (email !== undefined) {
    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email cannot be empty" });
    }
    if (normalizedEmail !== user.email) {
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        return res.status(400).json({ message: "Email already in use" });
      }
      // Changing the login email needs the current password and proof of the
      // new inbox (OTP from /auth/send-otp + /auth/verify-otp, as at signup)
      const withHash = await User.findById(user._id).select("+passwordHash");
      if (!currentPassword || !(await withHash.comparePassword(currentPassword))) {
        return res.status(401).json({ message: "Enter your current password to change your email.", code: "PASSWORD_REQUIRED" });
      }
      const EmailVerification = require("../models/EmailVerification");
      const verification = await EmailVerification.findOne({ email: normalizedEmail });
      const fresh = verification && verification.verifiedAt
        && Date.now() - verification.verifiedAt.getTime() < EmailVerification.TTL_MS;
      if (!fresh) {
        return res.status(400).json({ message: "Verify the new email address with the code we sent it.", code: "EMAIL_NOT_VERIFIED" });
      }
      await EmailVerification.deleteOne({ email: normalizedEmail });
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
    return res
      .status(400)
      .json({ message: "Current password and new password are required" });
  }

  const policy = validatePassword(newPassword, { role: req.user.role });
  if (!policy.ok) {
    return res.status(400).json({ message: policy.message });
  }

  const user = await User.findById(req.user._id).select("+passwordHash");
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    // 400, not 401: a typo must not look like an expired session to the apps
    return res.status(400).json({ message: "Current password is incorrect" });
  }

  user.passwordHash = newPassword;
  user.sessionToken = generateSessionToken(); // Invalidate other sessions
  await user.save();

  // A fresh token keeps this device signed in; every other session ends
  await setCookieAndRespond(res, user, req.organization || null, 200, { message: "Password changed successfully" });
});

// Upload avatar
exports.uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
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
  if (req.user.role === "owner") {
    return res
      .status(403)
      .json({
        message:
          "Organization owner cannot delete their account. Transfer ownership first.",
      });
  }

  // Projects this user owns are deleted with all their records and files
  const ownedProjects = await Project.find({ owner: userId });
  for (const project of ownedProjects) {
    await deleteProjectCascade(project);
  }

  // Remove user from member lists of other projects
  await Project.updateMany({ members: userId }, { $pull: { members: userId } });
  await Project.updateMany({ 'memberAccess.user': userId }, { $pull: { memberAccess: { user: userId } } });
  await require('../models/Workspace').updateMany({ 'members.user': userId }, { $pull: { members: { user: userId } } });

  // Delete invitations created for this user's email, and the user's notifications
  await Invitation.deleteMany({ email: req.user.email });
  await Notification.deleteMany({ recipient: userId });

  // The user's comments elsewhere stay for the team's context but no longer
  // point at a deleted account (shown as "Deleted user")
  await Comment.updateMany({ author: userId }, { $set: { author: null, authorGuest: { name: 'Deleted user', email: '' } } });

  // Avatars are stored as a bare filename under uploads/
  if (req.user.avatar) deleteStoredFiles([`uploads/${req.user.avatar}`]);

  // Delete the user
  await User.findByIdAndDelete(userId);

  // Clear auth cookie
  res.clearCookie("markup_token", { path: "/" });

  res.json({ message: "Account deleted successfully" });
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });

  if (user) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${URLS.app}/reset-password/${rawToken}`;

    try {
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch (err) {
      req.log.error({ err, smtpCode: err.code }, "password reset email failed to send");
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return res
        .status(500)
        .json({ message: "Failed to send reset email. Please try again." });
    }
  }

  res.json({
    message:
      "If an account with that email exists, a password reset link has been sent.",
  });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  }).select("+resetPasswordToken +resetPasswordExpires");

  if (!user) {
    return res.status(400).json({ message: "Invalid or expired reset token" });
  }

  const policy = validatePassword(password, { role: user.role });
  if (!policy.ok) {
    return res.status(400).json({ message: policy.message });
  }

  user.passwordHash = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.sessionToken = generateSessionToken(); // Invalidate all sessions
  await user.save();

  res.json({ message: "Password has been reset successfully" });
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
    const planFields = await buildSignupPlanFields();
    org = await Organization.create({
      name: (name && name.trim()) || req.user.name + "'s Workspace",
      owner: req.user._id,
      ...planFields,
    });
    req.user.organization = org._id;
    req.user.role = "owner";
    await req.user.save({ validateBeforeSave: false });
  } else {
    // Only owner can update existing org
    if (org.owner.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Only the organization owner can update settings" });
    }
  }

  const { name } = req.body;
  const previousName = org.name;
  let nameChanged = false;
  if (name !== undefined) {
    if (!name.trim()) {
      return res
        .status(400)
        .json({ message: "Organization name cannot be empty" });
    }
    const trimmed = name.trim();
    if (trimmed !== org.name) {
      org.name = trimmed;
      nameChanged = true;
    }
  }

  let logoChanged = false;
  if (req.file) {
    org.logo = req.file.filename;
    logoChanged = true;
  }

  await org.save();

  // Only emit activity when something actually changed AND this isn't the
  // first-time onboarding create flow (previousName would be undefined there).
  if (nameChanged && previousName) {
    logOrgActivity(org._id, req.user._id, 'org.name_updated', {
      name: org.name,
      previousName,
    });
  }
  if (logoChanged && previousName) {
    logOrgActivity(org._id, req.user._id, 'org.logo_updated', {
      logo: org.logo,
    });
  }

  res.json({ user: userResponse(req.user, org) });
});

exports.validateEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ valid: false, message: "Email is required" });
  }

  // Format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res
      .status(400)
      .json({ valid: false, message: "Invalid email format" });
  }

  // Check if email already registered
  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return res
      .status(400)
      .json({ valid: false, message: "Email already registered" });
  }

  res.json({ valid: true });
});

// ── Email OTP verification ───────────────────────────────────────
const EmailVerification = require("../models/EmailVerification");
const { sendEmailVerificationOtp } = require("../utils/mailer");

const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_RESENDS_PER_HOUR = 5;
const MAX_VERIFY_ATTEMPTS = 5;

exports.sendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  const emailNorm = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailNorm)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  const existing = await User.findOne({ email: emailNorm });
  if (existing) {
    return res.status(400).json({ message: "Email already registered" });
  }

  const now = Date.now();
  const record = await EmailVerification.findOne({ email: emailNorm });

  // Throttle resends
  if (record) {
    if (record.lastSentAt && now - record.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((RESEND_COOLDOWN_MS - (now - record.lastSentAt.getTime())) / 1000);
      return res.status(429).json({ message: `Please wait ${wait}s before requesting a new code.` });
    }
    // Reset hourly counter if its window has lapsed
    if (record.lastSentAt && now - record.lastSentAt.getTime() > 60 * 60 * 1000) {
      record.resendCount = 0;
    }
    if (record.resendCount >= MAX_RESENDS_PER_HOUR) {
      return res.status(429).json({ message: "Too many codes requested. Try again in an hour." });
    }
  }

  const otp = EmailVerification.makeOtp();
  const otpHash = EmailVerification.hashOtp(otp);
  const expiresAt = new Date(now + EmailVerification.TTL_MS);

  await EmailVerification.findOneAndUpdate(
    { email: emailNorm },
    {
      $set: {
        otpHash,
        expiresAt,
        lastSentAt: new Date(now),
        attempts: 0,
        verifiedAt: null,
      },
      $inc: { resendCount: 1 },
    },
    { upsert: true, returnDocument: "after" },
  );

  try {
    await sendEmailVerificationOtp(emailNorm, otp);
  } catch (err) {
    req.log.error({ err, smtpCode: err.code }, "verification email failed to send");
    return res.status(500).json({ message: "Failed to send verification email." });
  }

  res.json({ sent: true, cooldownSec: RESEND_COOLDOWN_MS / 1000 });
});

exports.verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: "Email and code are required" });

  const emailNorm = email.toLowerCase().trim();
  const record = await EmailVerification.findOne({ email: emailNorm });
  if (!record) {
    return res.status(400).json({ message: "No verification code found. Please request a new one." });
  }
  if (record.expiresAt.getTime() < Date.now()) {
    return res.status(400).json({ message: "Code expired. Please request a new one." });
  }
  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    return res.status(429).json({ message: "Too many attempts. Please request a new code." });
  }

  const incomingHash = EmailVerification.hashOtp(String(otp).trim());
  if (incomingHash !== record.otpHash) {
    record.attempts += 1;
    await record.save();
    return res.status(400).json({ message: "Incorrect code." });
  }

  record.verifiedAt = new Date();
  await record.save();
  res.json({ verified: true });
});

// ── Org-wide activity feed ────────────────────────────────────────
const Activity = require('../models/Activity');

// Excluded from the org feed: pin/comment/mention/guest noise.
const EXCLUDED_ORG_ACTIONS = [
  'pin.created', 'pin.resolved', 'pin.reopened', 'pin.deleted',
  'comment.created', 'comment.deleted',
  'guest.commented', 'guest.pin_created',
];

exports.getOrgActivity = asyncHandler(async (req, res) => {
  const org = req.organization;
  if (!org) {
    return res.status(500).json({ message: 'Organization context missing' });
  }

  // Activity feed is owner/admin only — members and guests can't see it.
  if (req.user.role !== 'owner' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only owners and admins can view workspace activity.' });
  }

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 30));
  const skip = (page - 1) * limit;

  const filter = {
    organization: org._id,
    action: { $nin: EXCLUDED_ORG_ACTIONS },
  };

  const [activities, total] = await Promise.all([
    Activity.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('actor', 'name email avatar')
      .populate('project', 'name')
      .lean(),
    Activity.countDocuments(filter),
  ]);

  res.json({
    activities,
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

// ── Organization data export & deletion (GDPR Art. 17 / 20) ─────────────────

const ORG_DELETION_GRACE_DAYS = 7;

/**
 * GET /api/auth/organization/export
 * Everything the workspace stores, as one JSON download (owner/admin).
 */
exports.exportOrganization = asyncHandler(async (req, res) => {
  const org = req.organization;
  if (!org) return res.status(400).json({ message: "No organization found" });
  if (req.user.role !== "owner" && req.user.role !== "admin") {
    return res.status(403).json({ message: "Only the owner or an admin can export workspace data." });
  }
  const Version = require("../models/Version");
  const Activity = require("../models/Activity");
  const Invoice = require("../models/Invoice");

  const projects = await Project.find({ organization: org._id }).lean();
  const workspaces = await require("../models/Workspace").find({ organization: org._id }).select("name isDefault createdAt").lean();
  const projectIds = projects.map((p) => p._id);
  const pins = await Pin.find({ project: { $in: projectIds } }).lean();
  const [users, comments, versions, activity, invoices] = await Promise.all([
    User.find({ organization: org._id }).select("name email role createdAt lastSeen").lean(),
    Comment.find({ pin: { $in: pins.map((p) => p._id) } }).lean(),
    Version.find({ project: { $in: projectIds } }).lean(),
    Activity.find({ $or: [{ organization: org._id }, { project: { $in: projectIds } }] }).lean(),
    Invoice.find({ organization: org._id, status: { $in: ["paid", "refunded"] } })
      .select("invoiceNumber plan amount currency status paidAt periodStart periodEnd refundAmount").lean(),
  ]);
  // Support requests as the customer sees them (no internal notes)
  const { forCustomer } = require("./supportTicket.controller");
  const supportRequests = (await require("../models/SupportTicket").find({ organization: org._id }).lean()).map(forCustomer);

  // Share passwords/tokens are credentials, not customer content
  for (const p of projects) {
    if (p.shareSettings) {
      delete p.shareSettings.passwordHash;
      delete p.shareSettings.password;
      delete p.shareSettings.token;
    }
  }

  const exportedAt = new Date();
  const data = {
    exportedAt,
    organization: {
      _id: org._id, name: org.name, plan: org.plan, createdAt: org.createdAt, billingDetails: org.billingDetails,
    },
    users, workspaces, projects, pins, comments, versions, activity, invoices, supportRequests,
    files: "Uploaded files (documents, screenshots, attachments) are referenced by their path in each record and can be downloaded from the app.",
  };
  logOrgActivity(org._id, req.user._id, "org.data_exported", {});
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="workspace-export-${exportedAt.toISOString().slice(0, 10)}.json"`);
  res.send(JSON.stringify(data, null, 2));
});

/**
 * POST /api/auth/organization/delete  { password, confirmName }
 * Schedules permanent deletion after a grace period; the workspace is locked
 * meanwhile. The daily job (scripts/runBilling.js) purges it.
 */
exports.requestOrganizationDeletion = asyncHandler(async (req, res) => {
  const org = req.organization;
  if (!org) return res.status(400).json({ message: "No organization found" });
  if (req.user.role !== "owner") {
    return res.status(403).json({ message: "Only the organization owner can delete the workspace." });
  }
  const { password, confirmName } = req.body || {};
  const owner = await User.findById(req.user._id).select("+passwordHash");
  if (!password || !(await owner.comparePassword(password))) {
    return res.status(401).json({ message: "Incorrect password." });
  }
  if ((confirmName || "").trim() !== org.name) {
    return res.status(400).json({ message: "Type the workspace name exactly to confirm." });
  }

  org.deletionScheduledAt = new Date(Date.now() + ORG_DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);
  org.isLocked = true;
  org.lockedAt = new Date();
  org.lockedReason = DELETION_LOCK_REASON;
  if (org.subscription) org.subscription.cancelAtPeriodEnd = true;
  await org.save();
  logOrgActivity(org._id, req.user._id, "org.deletion_scheduled", { deletionScheduledAt: org.deletionScheduledAt });
  res.json({ message: "Workspace deletion scheduled", deletionScheduledAt: org.deletionScheduledAt });
});

/**
 * POST /api/auth/organization/cancel-deletion
 */
exports.cancelOrganizationDeletion = asyncHandler(async (req, res) => {
  const org = req.organization;
  if (!org) return res.status(400).json({ message: "No organization found" });
  if (req.user.role !== "owner") {
    return res.status(403).json({ message: "Only the organization owner can cancel deletion." });
  }
  if (!org.deletionScheduledAt) return res.status(400).json({ message: "Deletion is not scheduled." });
  org.deletionScheduledAt = null;
  if (org.lockedReason === DELETION_LOCK_REASON) {
    org.isLocked = false;
    org.lockedAt = null;
    org.lockedReason = null;
  }
  await org.save();
  logOrgActivity(org._id, req.user._id, "org.deletion_cancelled", {});
  res.json({ message: "Workspace deletion cancelled" });
});
