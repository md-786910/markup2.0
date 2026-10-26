const Project = require('../models/Project');
const Pin = require('../models/Pin');
const asyncHandler = require('../utils/asyncHandler');
const { atLeast, isOrgAdminOf } = require('../utils/access');

// Access to a project: its creator, its members (Project.members, with a level
// in Project.memberAccess), members of its workspace, or an admin/owner of the
// project's own organization. Sets req.access to 'manage' | 'comment' | 'view'
// (utils/access.js); requireAccess(level) gates the action.
async function resolveAccessAsync(user, project) {
  const { projectLevelFor } = require('../utils/workspaces');
  const level = await projectLevelFor(user, project);
  return { allowed: !!level, level, isOrgAdmin: isOrgAdminOf(user, project.organization) };
}

const projectAccess = asyncHandler(async (req, res, next) => {
  const projectId = req.params.projectId;
  if (!projectId) {
    return res.status(400).json({ message: 'Project ID is required' });
  }

  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  const { allowed, level, isOrgAdmin } = await resolveAccessAsync(req.user, project);
  if (!allowed) {
    return res.status(403).json({ message: 'Not a member of this project' });
  }

  req.project = project;
  req.access = level;
  req.isOrgAdmin = isOrgAdmin;
  next();
});

// For routes keyed by :pinId (comments): authorizes against the pin's project.
const pinAccess = asyncHandler(async (req, res, next) => {
  const pin = await Pin.findById(req.params.pinId);
  if (!pin) {
    return res.status(404).json({ message: 'Pin not found' });
  }

  const project = await Project.findById(pin.project);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  const { allowed, level, isOrgAdmin } = await resolveAccessAsync(req.user, project);
  if (!allowed) {
    return res.status(403).json({ message: 'Not a member of this project' });
  }

  req.pin = pin;
  req.project = project;
  req.access = level;
  req.isOrgAdmin = isOrgAdmin;
  next();
});

const NEEDS = {
  comment: 'You can view this project but not comment on it.',
  manage: 'Only people who can manage this project can do that.',
};

// After projectAccess/pinAccess: require at least this level on the project
const requireAccess = (needed) => (req, res, next) => {
  if (atLeast(req.access, needed)) return next();
  return res.status(403).json({ message: NEEDS[needed] || 'Not allowed', code: 'ACCESS_LEVEL' });
};

module.exports = projectAccess;
module.exports.pinAccess = pinAccess;
module.exports.resolveAccessAsync = resolveAccessAsync;
module.exports.requireAccess = requireAccess;
