// Access levels on workspaces and projects (the standard model: organization
// roles decide what someone can do across the org; access levels decide what
// they can do on a given workspace or project, and flow down from a workspace
// to its projects).
//   manage  — settings, sharing, inviting, versions
//   comment — pin, comment, resolve
//   view    — read only
const LEVELS = ['view', 'comment', 'manage'];
const RANK = { view: 1, comment: 2, manage: 3 };

const isLevel = (l) => LEVELS.includes(l);
const atLeast = (level, needed) => (RANK[level] || 0) >= RANK[needed];
const higher = (a, b) => ((RANK[a] || 0) >= (RANK[b] || 0) ? a : b);

// Default level for someone added to a project before levels existed
const defaultLevelForRole = (role) => (role === 'guest' ? 'view' : 'comment');

// Guests are outside collaborators: they can comment at most
function capForRole(level, role) {
  if (role === 'guest' && level === 'manage') return 'comment';
  return level;
}

const sameId = (a, b) => !!a && !!b && a.toString() === b.toString();

function isOrgAdminOf(user, orgId) {
  return (user.role === 'owner' || user.role === 'admin') && sameId(user.organization, orgId);
}

// Level from the project itself (creator or Project.members / memberAccess)
function projectGrant(user, project) {
  if (sameId(project.owner?._id || project.owner, user._id)) return 'manage';
  const uid = user._id.toString();
  const entry = (project.memberAccess || []).find((m) => sameId(m.user, uid));
  if (entry && isLevel(entry.level)) return entry.level;
  const isMember = (project.members || []).some((m) => sameId(m._id || m, uid));
  return isMember ? defaultLevelForRole(user.role) : null;
}

// Level from a workspace's member list (same organization only)
function workspaceGrant(user, workspace) {
  if (!workspace || !sameId(workspace.organization, user.organization)) return null;
  const entry = (workspace.members || []).find((m) => sameId(m.user, user._id));
  return entry && isLevel(entry.level) ? entry.level : null;
}

/**
 * Effective level of a user on a project, or null (no access).
 * `workspace` is the project's workspace (loaded by the caller when needed).
 */
function projectLevel(user, project, workspace) {
  if (isOrgAdminOf(user, project.organization)) return 'manage';
  const level = higher(projectGrant(user, project), workspaceGrant(user, workspace));
  return level ? capForRole(level, user.role) : null;
}

/** Effective level of a user on a workspace, or null. */
function workspaceLevel(user, workspace) {
  if (isOrgAdminOf(user, workspace.organization)) return 'manage';
  const level = workspaceGrant(user, workspace);
  return level ? capForRole(level, user.role) : null;
}

module.exports = {
  LEVELS, isLevel, atLeast, higher, capForRole, defaultLevelForRole,
  isOrgAdminOf, projectGrant, workspaceGrant, projectLevel, workspaceLevel,
};
