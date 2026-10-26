const Workspace = require('../models/Workspace');

const DEFAULT_WORKSPACE_NAME = 'General';

// The org's default workspace, created on first use (upsert, so concurrent
// requests can't create two)
async function ensureDefaultWorkspace(orgId) {
  try {
    return await Workspace.findOneAndUpdate(
      { organization: orgId, isDefault: true },
      { $setOnInsert: { name: DEFAULT_WORKSPACE_NAME } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } catch (err) {
    if (err.code === 11000) return Workspace.findOne({ organization: orgId, isDefault: true });
    throw err;
  }
}

// Query for the projects of a workspace: the default one also holds projects
// created before workspaces existed (workspace: null)
function projectsInWorkspace(workspace) {
  return workspace.isDefault ? { workspace: { $in: [workspace._id, null] } } : { workspace: workspace._id };
}

// The workspace a project belongs to (null = the org's default one)
async function workspaceOfProject(project) {
  if (project.workspace) return Workspace.findById(project.workspace);
  return Workspace.findOne({ organization: project.organization, isDefault: true });
}

// The user's effective level on a project (utils/access.js), loading the
// project's workspace only when it can matter
async function projectLevelFor(user, project) {
  const { projectLevel, isOrgAdminOf, projectGrant } = require('./access');
  if (isOrgAdminOf(user, project.organization) || projectGrant(user, project) === 'manage') {
    return projectLevel(user, project, null);
  }
  const sameOrg = user?.organization && project.organization && user.organization.toString() === project.organization.toString();
  const workspace = sameOrg ? await workspaceOfProject(project) : null;
  return projectLevel(user, project, workspace);
}

// Projects a non-admin user may list: their own memberships plus every project
// in workspaces they belong to
async function visibleProjectsQuery(user) {
  const orgId = user.organization;
  const workspaces = await Workspace.find({ organization: orgId, 'members.user': user._id }).select('_id isDefault').lean();
  const or = [{ members: user._id }];
  if (workspaces.length) {
    const ids = workspaces.map((w) => w._id);
    if (workspaces.some((w) => w.isDefault)) ids.push(null);
    or.push({ workspace: { $in: ids } });
  }
  return { organization: orgId, $or: or };
}

// Users who belong to the project's workspace (they see the project without
// being in Project.members), loaded with the given fields
async function workspaceMemberUsers(project, fields = 'name email') {
  const workspace = await workspaceOfProject(project);
  if (!workspace || !workspace.members?.length) return [];
  const User = require('../models/User');
  return User.find({ _id: { $in: workspace.members.map((m) => m.user) }, organization: project.organization }).select(fields);
}

// Levels of one user on many projects (dashboard list), with one workspace query
async function projectLevelsFor(user, projects) {
  const { projectLevel } = require('./access');
  const orgId = user.organization;
  const workspaces = orgId ? await Workspace.find({ organization: orgId }).select('organization members isDefault').lean() : [];
  const byId = new Map(workspaces.map((w) => [w._id.toString(), w]));
  const defaultWs = workspaces.find((w) => w.isDefault) || null;
  return projects.map((p) => projectLevel(user, p, p.workspace ? byId.get(p.workspace.toString()) : defaultWs));
}

module.exports = { ensureDefaultWorkspace, projectsInWorkspace, workspaceOfProject, projectLevelFor, projectLevelsFor, visibleProjectsQuery, workspaceMemberUsers, DEFAULT_WORKSPACE_NAME };
