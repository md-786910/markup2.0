const User = require('../models/User');
const Project = require('../models/Project');
const Workspace = require('../models/Workspace');
const Pin = require('../models/Pin');
const Comment = require('../models/Comment');
const Invoice = require('../models/Invoice');
const Integration = require('../models/Integration');
const Organization = require('../models/Organization');

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Pure calculation of health score, band, and missing reasons.
 *
 * @param {object} metrics
 * @param {boolean} metrics.hasActiveMember7d
 * @param {number} metrics.activeMembers7d
 * @param {number} metrics.totalSeats
 * @param {number} metrics.pinsAndComments14d
 * @param {number} metrics.activeShareLinks
 * @param {number} metrics.guestActivity30d
 * @param {number} metrics.extraWorkspacesCount
 * @param {number} metrics.integrationsCount
 * @param {number} metrics.unpaidInvoicesCount
 * @returns {{ score: number, band: 'healthy'|'watch'|'at_risk', reasons: string[] }}
 */
function calculateHealth(metrics) {
  let score = 0;
  const reasons = [];

  // Signal 1: Any member active in last 7 days (25 pts)
  if (metrics.hasActiveMember7d) {
    score += 25;
  } else {
    reasons.push('No member active in the last 7 days');
  }

  // Signal 2: Active members / seats >= 50% (15 pts)
  const seats = Math.max(1, metrics.totalSeats || 1);
  const ratio = (metrics.activeMembers7d || 0) / seats;
  if (ratio >= 0.5) {
    score += 15;
  } else {
    reasons.push('Less than 50% of team members active this week');
  }

  // Signal 3: Pins or comments in last 14 days (20 pts)
  if ((metrics.pinsAndComments14d || 0) > 0) {
    score += 20;
  } else {
    reasons.push('No pins or comments created in the last 14 days');
  }

  // Signal 4: At least one review link on (10 pts)
  if ((metrics.activeShareLinks || 0) > 0) {
    score += 10;
  } else {
    reasons.push('No review links active');
  }

  // Signal 5: Guest reviewer activity in last 30 days (10 pts)
  if ((metrics.guestActivity30d || 0) > 0) {
    score += 10;
  } else {
    reasons.push('No client feedback received in the last 30 days');
  }

  // Signal 6: Workspaces or integrations used (10 pts)
  if ((metrics.extraWorkspacesCount || 0) > 0 || (metrics.integrationsCount || 0) > 0) {
    score += 10;
  } else {
    reasons.push('No extra workspaces or integrations connected');
  }

  // Signal 7: No unpaid invoice (10 pts)
  if ((metrics.unpaidInvoicesCount || 0) === 0) {
    score += 10;
  } else {
    reasons.push('Overdue invoice pending');
  }

  let band = 'watch';
  if (score >= 70) band = 'healthy';
  else if (score < 40) band = 'at_risk';

  return { score, band, reasons };
}

/**
 * Gather DB signals and compute health for a single organization.
 *
 * @param {string|ObjectId} orgId
 * @returns {Promise<object>} The updated health subdocument
 */
async function computeHealthForOrg(orgId) {
  const now = new Date();
  const since7 = new Date(now.getTime() - 7 * DAY_MS);
  const since14 = new Date(now.getTime() - 14 * DAY_MS);
  const since30 = new Date(now.getTime() - 30 * DAY_MS);

  // 1. Members
  const members = await User.find({ organization: orgId }).select('lastSeen role').lean();
  const totalSeats = members.length;
  const activeMembers7d = members.filter((m) => m.lastSeen && m.lastSeen >= since7).length;
  const hasActiveMember7d = activeMembers7d > 0;

  // 2. Projects & Workspaces
  const [projects, workspaces, integrations, unpaidInvoices] = await Promise.all([
    Project.find({ organization: orgId }).select('_id shareSettings status').lean(),
    Workspace.find({ organization: orgId }).select('_id isDefault shareSettings').lean(),
    Integration.countDocuments({ organization: orgId, enabled: true }),
    // Only renewal invoices past their due date: an abandoned checkout or a renewal
    // still inside its grace period isn't money owed
    Invoice.countDocuments({ organization: orgId, status: 'pending', billingMonth: { $type: 'string' }, dueAt: { $lt: new Date() } }),
  ]);

  const activeProjects = projects.filter((p) => p.status !== 'archived');
  const projectIds = activeProjects.map((p) => p._id);

  // 3. Review links on
  const sharedProjectsCount = activeProjects.filter((p) => p.shareSettings?.enabled).length;
  const sharedWorkspacesCount = workspaces.filter((w) => w.shareSettings?.enabled).length;
  const activeShareLinks = sharedProjectsCount + sharedWorkspacesCount;

  // 4. Extra workspaces
  const extraWorkspacesCount = workspaces.filter((w) => !w.isDefault).length;

  // 5. Pins and comments in last 14 days
  let pinsAndComments14d = 0;
  let guestActivity30d = 0;

  if (projectIds.length > 0) {
    const [pins14, comments14, guestPins30, guestComments30] = await Promise.all([
      Pin.countDocuments({ project: { $in: projectIds }, createdAt: { $gte: since14 } }),
      Comment.countDocuments({ pin: { $in: await Pin.distinct('_id', { project: { $in: projectIds } }) }, createdAt: { $gte: since14 } }),
      Pin.countDocuments({ project: { $in: projectIds }, createdBy: null, createdAt: { $gte: since30 } }),
      Comment.countDocuments({ pin: { $in: await Pin.distinct('_id', { project: { $in: projectIds } }) }, author: null, createdAt: { $gte: since30 } }),
    ]);

    pinsAndComments14d = pins14 + comments14;
    guestActivity30d = guestPins30 + guestComments30;
  }

  const { score, band, reasons } = calculateHealth({
    hasActiveMember7d,
    activeMembers7d,
    totalSeats,
    pinsAndComments14d,
    activeShareLinks,
    guestActivity30d,
    extraWorkspacesCount,
    integrationsCount: integrations,
    unpaidInvoicesCount: unpaidInvoices,
  });

  const health = {
    score,
    band,
    reasons,
    computedAt: now,
  };

  await Organization.updateOne({ _id: orgId }, { $set: { health } });
  return health;
}

/**
 * Batch update health for all organizations.
 *
 * @returns {Promise<{ total: number, healthy: number, watch: number, atRisk: number }>}
 */
async function computeHealthForAllOrgs() {
  const orgs = await Organization.find({ deletionScheduledAt: null }).select('_id');
  let healthy = 0, watch = 0, atRisk = 0;

  for (const org of orgs) {
    try {
      const h = await computeHealthForOrg(org._id);
      if (h.band === 'healthy') healthy++;
      else if (h.band === 'watch') watch++;
      else if (h.band === 'at_risk') atRisk++;
    } catch (err) {
      console.error(`Failed to compute health for org ${org._id}:`, err.message);
    }
  }

  return { total: orgs.length, healthy, watch, atRisk };
}

module.exports = {
  calculateHealth,
  computeHealthForOrg,
  computeHealthForAllOrgs,
};

