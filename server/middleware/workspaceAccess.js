const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const Workspace = require('../models/Workspace');
const { workspaceLevel, atLeast } = require('../utils/access');
const { ensureDefaultWorkspace } = require('../utils/workspaces');
const { discardUploads } = require('../utils/storage');

// :workspaceId routes: loads the org's workspace and requires a level on it
// (org owners/admins manage every workspace). Sets req.workspace, req.access.
const workspaceAccess = (needed) => asyncHandler(async (req, res, next) => {
  const workspace = mongoose.isValidObjectId(req.params.workspaceId)
    ? await Workspace.findOne({ _id: req.params.workspaceId, organization: req.user.organization })
    : null;
  if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
  const level = workspaceLevel(req.user, workspace);
  if (!atLeast(level, needed)) {
    return res.status(403).json({ message: 'Only people who can manage this workspace can do that.', code: 'ACCESS_LEVEL' });
  }
  req.workspace = workspace;
  req.access = level;
  next();
});

// POST /projects (after multer, so multipart bodies are parsed): org
// owners/admins, or anyone who can manage the target workspace
const canCreateProject = asyncHandler(async (req, res, next) => {
  if (req.user.role === 'owner' || req.user.role === 'admin') return next();
  const requested = req.body?.workspace;
  const workspace = requested && mongoose.isValidObjectId(requested)
    ? await Workspace.findOne({ _id: requested, organization: req.user.organization })
    : await ensureDefaultWorkspace(req.user.organization);
  if (workspace && atLeast(workspaceLevel(req.user, workspace), 'manage')) return next();
  discardUploads(req);
  return res.status(403).json({ message: 'You need to manage a workspace to create projects in it.', code: 'ACCESS_LEVEL' });
});

module.exports = { workspaceAccess, canCreateProject };
