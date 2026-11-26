const Project = require('../models/Project');

// A review token is a project's own share token. It resolves to the project
// plus the share settings that govern it (password, expiry, comments).
// Workspace review links ("<workspace token>.<project id>") were retired:
// those tokens are simply not found (utils/retireWorkspaceLinks.js turned
// the stored links off).

function isExpired(share) {
  return !!(share.expiresAt && new Date(share.expiresAt) < new Date());
}

// Review links are a paid-plan feature (paid plans and trials): links made
// before a move to the free plan stop working with it. Cached briefly, since
// one review page makes many guest and proxy requests.
const planCache = new Map();
const PLAN_TTL = 60 * 1000;
const PLAN_UNAVAILABLE = { status: 403, message: 'Review links are not available on the current plan of this organization.' };

async function orgAllowsShareLinks(orgId) {
  if (!orgId) return true;
  const key = String(orgId);
  const hit = planCache.get(key);
  if (hit && Date.now() - hit.at < PLAN_TTL) return hit.ok;
  const org = await require('../models/Organization').findById(orgId).select('plan trialEndsAt').lean();
  // An expired trial is not a paid plan or a running trial
  const trialExpired = !!org && org.plan === 'trial' && !!org.trialEndsAt && new Date(org.trialEndsAt) < new Date();
  const ok = !!org && org.plan !== 'free' && !trialExpired;
  if (planCache.size > 5000) planCache.clear();
  planCache.set(key, { ok, at: Date.now() });
  return ok;
}

/**
 * Returns { project, share, scope } or { status, message } when not found/expired.
 * scope is { projectId } (what a guest access token is bound to).
 */
async function findShared(token, select) {
  const raw = String(token || '');
  // Project tokens are plain (hex); a workspace token has a '.' and is refused
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(raw)) return { status: 404, message: 'Review link not found.' };

  let query = Project.findOne({ 'shareSettings.token': raw, 'shareSettings.enabled': true });
  if (select) query = query.select(`${select} organization status`);
  const project = await query;
  if (!project) return { status: 404, message: 'Review link not found.' };
  // An archived project is closed for review, through its own link too
  if (project.status === 'archived') return { status: 404, message: 'Review link not found.' };
  if (isExpired(project.shareSettings)) return { status: 410, message: 'This review link has expired.' };
  if (!(await orgAllowsShareLinks(project.organization))) return PLAN_UNAVAILABLE;
  return { project, share: project.shareSettings, scope: { projectId: project._id.toString() } };
}

// For guest proxy requests: is the project reviewable through its own link
// right now?
async function isProjectShared(project) {
  if (project.status === 'archived') return false;
  if (!project.shareSettings?.enabled || isExpired(project.shareSettings)) return false;
  return orgAllowsShareLinks(project.organization);
}

module.exports = { findShared, isExpired, isProjectShared, orgAllowsShareLinks, clearSharePlanCache: () => planCache.clear() };
