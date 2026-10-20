const Project = require('../models/Project');
const Pin = require('../models/Pin');
const Comment = require('../models/Comment');
const Version = require('../models/Version');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const Invitation = require('../models/Invitation');
const Integration = require('../models/Integration');
const User = require('../models/User');
const { deleteStoredFiles, releaseStorage } = require('./storage');

// Deleting a project, pin or comment removes everything that belongs to it:
// child records and the uploaded files on disk, and gives the storage back to
// the org's quota. Used by the delete endpoints and by organization deletion.

function attachmentFiles(comments) {
  const paths = [];
  let bytes = 0;
  for (const c of comments) {
    for (const a of c.attachments || []) {
      paths.push(a.path);
      bytes += a.size || 0;
    }
  }
  return { paths, bytes };
}

/** Delete comments matching `filter` and their attachment files. Returns bytes freed. */
async function purgeComments(filter) {
  const comments = await Comment.find(filter).select('attachments');
  const { paths, bytes } = attachmentFiles(comments);
  await Comment.deleteMany(filter);
  deleteStoredFiles(paths);
  return bytes;
}

/** Delete pins matching `filter`, their comments and all files. Returns bytes freed. */
async function purgePins(filter) {
  const pins = await Pin.find(filter).select('_id screenshot');
  const pinIds = pins.map((p) => p._id);
  let bytes = await purgeComments({ pin: { $in: pinIds } });
  const screenshots = pins.map((p) => p.screenshot && p.screenshot.path).filter(Boolean);
  bytes += pins.reduce((sum, p) => sum + ((p.screenshot && p.screenshot.size) || 0), 0);
  await Pin.deleteMany({ _id: { $in: pinIds } });
  await Notification.deleteMany({ pin: { $in: pinIds } });
  deleteStoredFiles(screenshots);
  return bytes;
}

/** Delete a pin with its comments and files, and release the org's storage. */
async function deletePinCascade(pin, orgId) {
  const bytes = await purgePins({ _id: pin._id });
  await releaseStorage(orgId, bytes);
}

/** Delete a comment's attachment files and the comment, and release storage. */
async function deleteCommentCascade(comment, orgId) {
  const bytes = await purgeComments({ _id: comment._id });
  await releaseStorage(orgId, bytes);
}

/** Delete a project and everything in it (records + files). */
async function deleteProjectCascade(project) {
  let bytes = await purgePins({ project: project._id });

  const docs = project.documents || [];
  deleteStoredFiles(docs.map((d) => d.path));
  bytes += docs.reduce((sum, d) => sum + (d.size || 0), 0);

  await Promise.all([
    Version.deleteMany({ project: project._id }),
    Activity.deleteMany({ project: project._id }),
    Notification.deleteMany({ project: project._id }),
    Invitation.deleteMany({ project: project._id }),
    Integration.deleteMany({ project: project._id }),
    User.updateMany({ mutedProjectEmails: project._id }, { $pull: { mutedProjectEmails: project._id } }),
  ]);
  await Project.deleteOne({ _id: project._id });
  await releaseStorage(project.organization, bytes);
}

module.exports = { deleteProjectCascade, deletePinCascade, deleteCommentCascade, purgeComments };
