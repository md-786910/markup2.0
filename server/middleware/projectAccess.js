const Project = require('../models/Project');
const asyncHandler = require('../utils/asyncHandler');

const projectAccess = asyncHandler(async (req, res, next) => {
  const projectId = req.params.projectId;
  if (!projectId) {
    return res.status(400).json({ message: 'Project ID is required' });
  }

  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  const userId = req.user._id.toString();
  const isMember = project.members.some((m) => m.toString() === userId);
  const isOwner = project.owner.toString() === userId;

  if (!isMember && !isOwner) {
    return res.status(403).json({ message: 'Not a member of this project' });
  }

  req.project = project;
  next();
});

module.exports = projectAccess;
