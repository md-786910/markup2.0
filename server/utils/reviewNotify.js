// A client (or member) approved a review round or asked for changes: email the
// project's managers and post to the org's Slack/Teams/Discord. Fire-and-forget.
const Project = require('../models/Project');
const User = require('../models/User');
const { URLS } = require('../config/env');
const { projectLevel } = require('./access');
const { workspaceOfProject } = require('./workspaces');
const { notifyIntegrations } = require('./notifier');

// People with manage access on the project (org owners/admins, its creator,
// manage grants on the project or its workspace) who still want these emails
async function managerRecipients(project, excludeUserId) {
  const workspace = await workspaceOfProject(project);
  const candidateIds = [
    project.owner,
    ...(project.members || []),
    ...(project.memberAccess || []).map((m) => m.user),
    ...(workspace?.members || []).map((m) => m.user),
  ].filter(Boolean);
  const users = await User.find({
    organization: project.organization,
    $or: [{ _id: { $in: candidateIds } }, { role: { $in: ['owner', 'admin'] } }],
  }).select('name email role organization emailNotificationsEnabled mutedProjectEmails');
  const projectId = String(project._id);
  return users.filter((u) => {
    if (excludeUserId && String(u._id) === String(excludeUserId)) return false;
    if (u.emailNotificationsEnabled === false) return false;
    if ((u.mutedProjectEmails || []).some((p) => String(p) === projectId)) return false;
    const isCreator = String(project.owner) === String(u._id);
    return isCreator || projectLevel(u, project, workspace) === 'manage';
  });
}

function notifyReviewDecision({ project, actorUserId = null, actorName, decision, note, openPinsAtDecision }) {
  (async () => {
    const full = await Project.findById(project._id).select('name owner members memberAccess organization workspace').lean();
    if (!full) return;
    const mailer = require('./mailer');
    const data = {
      actorName,
      projectName: full.name,
      decision,
      note: (note || '').slice(0, 500),
      openPins: openPinsAtDecision,
      projectUrl: `${URLS.app}/project/${full._id}`,
    };
    for (const u of await managerRecipients(full, actorUserId)) {
      mailer.sendReviewDecisionEmail(u.email, data).catch((err) => console.error(`[review] decision email to ${u._id} failed: ${err.message}`));
    }
    notifyIntegrations(full._id, full.organization, {
      action: 'review.decision',
      projectId: full._id,
      projectName: full.name,
      actorName,
      decision,
      comment: note || null,
    });
  })().catch((err) => console.error('[review] decision notifications failed:', err.message));
}

// An approval as the team's browsers may see it (no reviewer IP or browser)
function publicApproval(approval) {
  const a = approval.toObject ? approval.toObject() : { ...approval };
  delete a.ip;
  delete a.userAgent;
  return a;
}

module.exports = { notifyReviewDecision, publicApproval, managerRecipients };
