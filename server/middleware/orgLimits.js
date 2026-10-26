const User = require('../models/User');
const Project = require('../models/Project');
const Invitation = require('../models/Invitation');
const asyncHandler = require('../utils/asyncHandler');

const TEAM_ROLES = ['owner', 'admin', 'member'];

/**
 * Seats used in an org: existing users plus pending (unexpired) invitations,
 * so a limit can't be bypassed by sending many invitations at once.
 * kind: 'member' (owner/admin/member — matches the billing page) or 'guest'.
 */
async function countSeats(orgId, kind) {
  const isGuest = kind === 'guest';
  const [users, invites] = await Promise.all([
    User.countDocuments({ organization: orgId, role: isGuest ? 'guest' : { $in: TEAM_ROLES } }),
    Invitation.countDocuments({
      organization: orgId,
      status: 'pending',
      expiresAt: { $gt: new Date() },
      role: isGuest ? 'guest' : { $ne: 'guest' },
    }),
  ]);
  return users + invites;
}

/**
 * Returns a 403 body when adding one more seat of `role` would exceed the
 * org's limit, else null. Used by invites and role changes.
 */
async function seatLimitError(org, role) {
  if (!org) return null;
  if (role === 'guest') {
    if ((await countSeats(org._id, 'guest')) >= org.limits.maxGuests) {
      return { message: `Guest limit reached (${org.limits.maxGuests}). Upgrade your plan to invite more guests.`, code: 'GUEST_LIMIT' };
    }
    return null;
  }
  if ((await countSeats(org._id, 'member')) >= org.limits.maxMembers) {
    return { message: `Member limit reached (${org.limits.maxMembers}). Upgrade your plan to invite more members.`, code: 'MEMBER_LIMIT' };
  }
  return null;
}

/**
 * Block write operations when the organization is locked (trial expired / payment overdue).
 * Attach after auth middleware so req.user and req.organization are available.
 */
const checkOrgNotLocked = asyncHandler(async (req, res, next) => {
  const org = req.organization;
  if (!org) {
    return res.status(500).json({ message: 'Organization context missing' });
  }
  if (org.isLocked) {
    return res.status(403).json({
      message: 'Your organization is locked. Please activate a subscription to continue.',
      code: 'ORG_LOCKED',
    });
  }
  next();
});

/**
 * Block member invitations when organization has reached its member limit
 * (owner/admin/member users plus pending non-guest invitations).
 */
const checkMemberLimit = asyncHandler(async (req, res, next) => {
  const { role } = req.body;
  // Only enforce for non-guest invites
  if (role === 'guest') return next();
  const error = await seatLimitError(req.organization, role);
  if (error) return res.status(403).json(error);
  next();
});

/**
 * Block guest invitations when organization has reached its guest limit
 * (guest users plus pending guest invitations).
 */
const checkGuestLimit = asyncHandler(async (req, res, next) => {
  const { role } = req.body;
  if (role !== 'guest') return next();
  const error = await seatLimitError(req.organization, 'guest');
  if (error) return res.status(403).json(error);
  next();
});

/**
 * Guest review links are a paid-plan feature (Starter and up, and trials).
 */
const checkShareLinksAllowed = asyncHandler(async (req, res, next) => {
  const org = req.organization;
  if (org && org.plan === 'free') {
    return res.status(403).json({
      message: 'Guest review links are not available on the Free plan. Upgrade your plan to share reviews with clients.',
      code: 'FEATURE_NOT_AVAILABLE',
    });
  }
  next();
});

/**
 * Block project creation when organization has reached its project limit.
 */
const checkProjectLimit = asyncHandler(async (req, res, next) => {
  const org = req.organization;
  if (!org) return next();

  const projectCount = await Project.countDocuments({ organization: org._id });

  if (projectCount >= org.limits.maxProjects) {
    return res.status(403).json({
      message: `Project limit reached (${org.limits.maxProjects}). Upgrade your plan to create more projects.`,
      code: 'PROJECT_LIMIT',
    });
  }
  next();
});

/**
 * Block workspace creation when the organization has reached its workspace limit
 * (the default workspace counts).
 */
const checkWorkspaceLimit = asyncHandler(async (req, res, next) => {
  const org = req.organization;
  if (!org) return next();
  const max = org.limits.maxWorkspaces;
  if (max == null) return next();
  const count = await require('../models/Workspace').countDocuments({ organization: org._id });
  if (count >= max) {
    return res.status(403).json({
      message: `Workspace limit reached (${max}). Upgrade your plan to create more workspaces.`,
      code: 'WORKSPACE_LIMIT',
    });
  }
  next();
});

/**
 * Block integration creation if plan does not allow it.
 */
const checkIntegrationsLimit = asyncHandler(async (req, res, next) => {
  const org = req.organization;
  if (!org) return next();

  if (org.limits.hasIntegrations === false) {
    return res.status(403).json({
      message: 'Integrations are not available on your current plan. Upgrade your plan to enable integrations.',
      code: 'FEATURE_NOT_AVAILABLE',
    });
  }
  next();
});

/**
 * Block activity log viewing if plan does not allow it.
 */
const checkActivityLogsLimit = asyncHandler(async (req, res, next) => {
  const org = req.organization;
  if (!org) return next();

  if (org.limits.hasActivityLogs === false) {
    return res.status(403).json({
      message: 'Activity logs are not available on your current plan. Upgrade your plan to view activity logs.',
      code: 'FEATURE_NOT_AVAILABLE',
    });
  }
  next();
});

/**
 * Block version history access if plan does not allow it.
 */
const checkVersionHistoryLimit = asyncHandler(async (req, res, next) => {
  const org = req.organization;
  if (!org) return next();

  if (org.limits.hasVersionHistory === false) {
    return res.status(403).json({
      message: 'Version history is not available on your current plan. Upgrade your plan to enable version history.',
      code: 'FEATURE_NOT_AVAILABLE',
    });
  }
  next();
});

module.exports = {
  checkWorkspaceLimit,
  seatLimitError,
  checkShareLinksAllowed,
  checkOrgNotLocked,
  checkMemberLimit,
  checkGuestLimit,
  checkProjectLimit,
  checkIntegrationsLimit,
  checkActivityLogsLimit,
  checkVersionHistoryLimit,
};
