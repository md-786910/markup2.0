const User = require('../models/User');
const Project = require('../models/Project');
const asyncHandler = require('../utils/asyncHandler');

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
 * Block member invitations when organization has reached its member limit.
 * Counts users with role admin or member (not guests) in the org.
 */
const checkMemberLimit = asyncHandler(async (req, res, next) => {
  const org = req.organization;
  if (!org) return next();

  const { role } = req.body;
  // Only enforce for non-guest invites
  if (role === 'guest') return next();

  const memberCount = await User.countDocuments({
    organization: org._id,
    role: { $in: ['admin', 'member'] },
  });

  if (memberCount >= org.limits.maxMembers) {
    return res.status(403).json({
      message: `Member limit reached (${org.limits.maxMembers}). Upgrade your plan to invite more members.`,
      code: 'MEMBER_LIMIT',
    });
  }
  next();
});

/**
 * Block guest invitations when organization has reached its guest limit.
 */
const checkGuestLimit = asyncHandler(async (req, res, next) => {
  const org = req.organization;
  if (!org) return next();

  const { role } = req.body;
  if (role !== 'guest') return next();

  const guestCount = await User.countDocuments({
    organization: org._id,
    role: 'guest',
  });

  if (guestCount >= org.limits.maxGuests) {
    return res.status(403).json({
      message: `Guest limit reached (${org.limits.maxGuests}). Upgrade your plan to invite more guests.`,
      code: 'GUEST_LIMIT',
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

module.exports = {
  checkOrgNotLocked,
  checkMemberLimit,
  checkGuestLimit,
  checkProjectLimit,
};
