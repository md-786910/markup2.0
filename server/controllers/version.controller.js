const Version = require('../models/Version');
const Pin = require('../models/Pin');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity } = require('../utils/activityLogger');

/**
 * POST /api/projects/:projectId/versions
 * Create a new version snapshot.
 */
exports.createVersion = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { name, notes } = req.body;

  // Get next version number
  const lastVersion = await Version.findOne({ project: projectId })
    .sort({ versionNumber: -1 })
    .select('versionNumber')
    .lean();
  const versionNumber = (lastVersion?.versionNumber || 0) + 1;

  // Capture current pin counts
  const [totalPins, resolvedPins] = await Promise.all([
    Pin.countDocuments({ project: projectId }),
    Pin.countDocuments({ project: projectId, status: 'resolved' }),
  ]);

  const version = await Version.create({
    project: projectId,
    versionNumber,
    name: name || `Version ${versionNumber}`,
    createdBy: req.user._id,
    notes: notes || '',
    pinSnapshot: totalPins,
    resolvedSnapshot: resolvedPins,
  });

  // Tag all unversioned pins with this version
  await Pin.updateMany(
    { project: projectId, version: null },
    { version: version._id }
  );

  const populated = await Version.findById(version._id)
    .populate('createdBy', 'name email');

  // Activity log
  logActivity(projectId, req.user._id, 'project.updated', {
    versionCreated: versionNumber,
    versionName: version.name,
  });

  res.status(201).json({ version: populated });
});

/**
 * GET /api/projects/:projectId/versions
 * List all versions for a project.
 */
exports.getVersions = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const versions = await Version.find({ project: projectId })
    .populate('createdBy', 'name email')
    .sort({ versionNumber: -1 });

  res.json({ versions });
});

/**
 * PATCH /api/projects/:projectId/versions/:versionId
 * Update version name/notes.
 */
exports.updateVersion = asyncHandler(async (req, res) => {
  const { versionId } = req.params;
  const { name, notes } = req.body;

  const version = await Version.findById(versionId);
  if (!version) {
    return res.status(404).json({ message: 'Version not found' });
  }

  if (name !== undefined) version.name = name;
  if (notes !== undefined) version.notes = notes;
  await version.save();

  const populated = await Version.findById(version._id)
    .populate('createdBy', 'name email');

  res.json({ version: populated });
});

/**
 * DELETE /api/projects/:projectId/versions/:versionId
 * Delete a version (pins are unlinked, not deleted).
 */
exports.deleteVersion = asyncHandler(async (req, res) => {
  const { versionId } = req.params;

  const version = await Version.findById(versionId);
  if (!version) {
    return res.status(404).json({ message: 'Version not found' });
  }

  // Unlink pins from this version
  await Pin.updateMany({ version: versionId }, { version: null });

  await Version.findByIdAndDelete(versionId);

  res.json({ message: 'Version deleted' });
});
