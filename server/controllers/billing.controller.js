const User = require('../models/User');
const Project = require('../models/Project');
const asyncHandler = require('../utils/asyncHandler');
const { PLANS, UPGRADEABLE_PLANS, getLimitsForPlan } = require('../config/plans');
const { userResponse } = require('./auth.controller');

/**
 * GET /api/billing/plan
 * Returns current plan details, limits, usage, and trial info.
 */
exports.getPlan = asyncHandler(async (req, res) => {
  const org = req.organization;
  if (!org) {
    return res.status(500).json({ message: 'Organization context missing' });
  }

  const [projectCount, memberCount, guestCount] = await Promise.all([
    Project.countDocuments({ organization: org._id }),
    User.countDocuments({ organization: org._id, role: { $in: ['owner', 'admin', 'member'] } }),
    User.countDocuments({ organization: org._id, role: 'guest' }),
  ]);

  const planId = org.plan;
  const planDetails = PLANS[planId] || PLANS.free;

  // Trial info
  let trial = null;
  if (planId === 'trial' && org.trialEndsAt) {
    const msLeft = new Date(org.trialEndsAt).getTime() - Date.now();
    const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
    trial = {
      active: daysLeft > 0,
      endsAt: org.trialEndsAt,
      daysLeft,
      trialDays: org.trialDays,
    };
  }

  res.json({
    plan: planId,
    planDetails,
    limits: org.limits,
    usage: {
      projects: projectCount,
      members: memberCount,
      guests: guestCount,
    },
    trial,
    subscription: org.subscription,
  });
});

/**
 * POST /api/billing/upgrade
 * Upgrades the organization to a paid plan.
 * Only the org owner can upgrade. Locked orgs CAN upgrade (to unlock).
 */
exports.upgradePlan = asyncHandler(async (req, res) => {
  const org = req.organization;
  if (!org) {
    return res.status(500).json({ message: 'Organization context missing' });
  }

  // Only owner can upgrade
  if (req.user.role !== 'owner') {
    return res.status(403).json({ message: 'Only the organization owner can upgrade the plan.' });
  }

  const { plan } = req.body;
  if (!plan || !UPGRADEABLE_PLANS.includes(plan)) {
    return res.status(400).json({ message: `Invalid plan. Choose one of: ${UPGRADEABLE_PLANS.join(', ')}` });
  }

  // Prevent "upgrading" to the same or lower plan
  const currentOrder = org.plan === 'trial' ? -1 : (PLANS[org.plan]?.order ?? -1);
  const targetOrder = PLANS[plan].order;
  if (targetOrder <= currentOrder) {
    return res.status(400).json({ message: 'You can only upgrade to a higher plan.' });
  }

  // Apply the upgrade
  org.plan = plan;
  org.limits = getLimitsForPlan(plan);
  org.isLocked = false;
  org.lockedAt = null;
  org.lockedReason = null;
  org.trialEndsAt = null;
  org.subscription.status = 'active';

  await org.save();

  res.json({
    message: `Successfully upgraded to ${PLANS[plan].name}`,
    user: userResponse(req.user, org),
    plan: org.plan,
  });
});
