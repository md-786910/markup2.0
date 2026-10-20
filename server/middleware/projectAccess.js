const Project = require('../models/Project');
const Pin = require('../models/Pin');
const asyncHandler = require('../utils/asyncHandler');

// Access rule shared by projectAccess and pinAccess: project owner, project
// members, or an admin/owner of the project's own organization.
function resolveAccess(user, project) {
  const userId = user._id.toString();
  const isMember = project.members.some((m) => m.toString() === userId);
  const isOwner = project.owner.toString() === userId;
  // Org admins/owners may access any project, but only within their own organization
  const isSameOrg = !!user.organization && !!project.organization
    && project.organization.toString() === user.organization.toString();
  const isOrgAdmin = (user.role === 'admin' || user.role === 'owner') && isSameOrg;
  return { allowed: isMember || isOwner || isOrgAdmin, isOrgAdmin };
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

  const { allowed, isOrgAdmin } = resolveAccess(req.user, project);
  if (!allowed) {
    return res.status(403).json({ message: 'Not a member of this project' });
  }

  req.project = project;
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

  const { allowed, isOrgAdmin } = resolveAccess(req.user, project);
  if (!allowed) {
    return res.status(403).json({ message: 'Not a member of this project' });
  }

  req.pin = pin;
  req.project = project;
  req.isOrgAdmin = isOrgAdmin;
  next();
});

module.exports = projectAccess;
module.exports.pinAccess = pinAccess;
module.exports.resolveAccess = resolveAccess;
