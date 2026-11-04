// Client approvals were removed; their plan switch `hasApprovals` (which also
// gated feedback deadlines) is now `hasDeadlines`. Carries stored values over:
// organization limits, per-org admin overrides and admin plan overrides.
// Idempotent: once nothing has the old field, every update matches nothing.
const Organization = require('../models/Organization');
const PlanConfig = require('../models/PlanConfig');
const Project = require('../models/Project');

async function migrateDeadlineFlag() {
  const moved = [];
  for (const path of ['limits', 'limitOverrides']) {
    const res = await Organization.collection.updateMany(
      { [`${path}.hasApprovals`]: { $exists: true } },
      { $rename: { [`${path}.hasApprovals`]: `${path}.hasDeadlines` } },
    );
    if (res.modifiedCount) moved.push(`${res.modifiedCount} organization ${path}`);
  }
  const plans = await PlanConfig.collection.updateMany(
    { 'limits.hasApprovals': { $exists: true } },
    { $rename: { 'limits.hasApprovals': 'limits.hasDeadlines' } },
  );
  if (plans.modifiedCount) moved.push(`${plans.modifiedCount} plan overrides`);
  // Project settings that only applied to approvals
  const projects = await Project.collection.updateMany(
    { $or: [{ 'review.approvalsEnabled': { $exists: true } }, { 'review.requireAllResolved': { $exists: true } }] },
    { $unset: { 'review.approvalsEnabled': '', 'review.requireAllResolved': '' } },
  );
  if (projects.modifiedCount) moved.push(`${projects.modifiedCount} projects cleaned`);
  if (moved.length) {
    // Plan overrides are cached for 5 minutes; drop the cache so the new key is read
    try { require('../config/plans').clearPlanCache?.(); } catch { /* not critical */ }
    console.log(`[migrate] hasApprovals -> hasDeadlines: ${moved.join(', ')}`);
  }
}

module.exports = { migrateDeadlineFlag };
