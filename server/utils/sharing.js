const mongoose = require('mongoose');
const Project = require('../models/Project');
const Workspace = require('../models/Workspace');

// Review tokens are either a project's own share token, or
// "<workspace share token>.<project id>" for a project reached through a
// workspace review link. Both resolve to the project plus the share settings
// that govern it (password, expiry, comments).
const WS_SEPARATOR = '.';

function composeWorkspaceToken(workspaceToken, projectId) {
  return `${workspaceToken}${WS_SEPARATOR}${projectId}`;
}

function isExpired(share) {
  return !!(share.expiresAt && new Date(share.expiresAt) < new Date());
}

// Projects reachable through a workspace link (archived ones are hidden)
function workspaceProjectsQuery(workspace) {
  return {
    organization: workspace.organization,
    workspace: workspace.isDefault ? { $in: [workspace._id, null] } : workspace._id,
    status: { $ne: 'archived' },
  };
}

async function findSharedWorkspace(token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{16,64}$/i.test(token)) return null;
  return Workspace.findOne({ 'shareSettings.token': token, 'shareSettings.enabled': true });
}

/**
 * Returns { project, share, scope } or { status, message } when not found/expired.
 * scope is { projectId } or { workspaceId } (what a guest access token is bound to).
 */
async function findShared(token, select) {
  const raw = String(token || '');
  const sep = raw.indexOf(WS_SEPARATOR);
  if (sep > 0) {
    const workspace = await findSharedWorkspace(raw.slice(0, sep));
    const projectId = raw.slice(sep + 1);
    if (!workspace || !mongoose.isValidObjectId(projectId)) return { status: 404, message: 'Review link not found.' };
    if (isExpired(workspace.shareSettings)) return { status: 410, message: 'This review link has expired.' };
    let query = Project.findOne({ _id: projectId, ...workspaceProjectsQuery(workspace) });
    if (select) query = query.select(`${select} organization`);
    const project = await query;
    if (!project) return { status: 404, message: 'Review link not found.' };
    return { project, share: workspace.shareSettings, scope: { workspaceId: workspace._id.toString() } };
  }

  let query = Project.findOne({ 'shareSettings.token': raw, 'shareSettings.enabled': true });
  if (select) query = query.select(select);
  const project = await query;
  if (!project) return { status: 404, message: 'Review link not found.' };
  if (isExpired(project.shareSettings)) return { status: 410, message: 'This review link has expired.' };
  return { project, share: project.shareSettings, scope: { projectId: project._id.toString() } };
}

// For guest proxy requests: is the project reviewable through its own link or
// its workspace's link right now? Cached briefly (asset requests are many).
const proxyShareCache = new Map();
const PROXY_SHARE_TTL = 60 * 1000;

async function isProjectShared(project) {
  if (project.shareSettings?.enabled && !isExpired(project.shareSettings)) return true;
  if (project.status === 'archived') return false;
  const key = project._id.toString();
  const hit = proxyShareCache.get(key);
  if (hit && Date.now() - hit.at < PROXY_SHARE_TTL) return hit.ok;
  const query = project.workspace
    ? { _id: project.workspace }
    : { organization: project.organization, isDefault: true };
  const workspace = await Workspace.findOne({ ...query, 'shareSettings.enabled': true }).select('shareSettings');
  const ok = !!workspace && !isExpired(workspace.shareSettings);
  if (proxyShareCache.size > 5000) proxyShareCache.clear();
  proxyShareCache.set(key, { ok, at: Date.now() });
  return ok;
}

module.exports = { findShared, findSharedWorkspace, workspaceProjectsQuery, composeWorkspaceToken, isExpired, isProjectShared };
