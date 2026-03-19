const Project = require('../models/Project');
const User = require('../models/User');
const { sendPinNotificationEmail, sendCommentNotificationEmail, sendMentionNotificationEmail } = require('./mailer');

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

function buildPinLink(projectId, pinId) {
  return `${CLIENT_ORIGIN}/project/${projectId}?pin=${pinId}`;
}

/**
 * Get all project members (owner + members) except the actor.
 * Returns array of { _id, name, email }.
 */
async function getRecipients(projectId, excludeUserId) {
  const project = await Project.findById(projectId)
    .populate('owner', 'name email')
    .populate('members', 'name email');
  if (!project) return [];

  const all = [project.owner, ...project.members].filter(Boolean);
  const excludeStr = excludeUserId.toString();
  const seen = new Set();
  return all.filter((u) => {
    const id = u._id.toString();
    if (id === excludeStr || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/**
 * Emit a Socket.IO event to a project room.
 */
function emitToProject(io, projectId, event, data) {
  if (!io) return;
  io.to(`project:${projectId}`).emit(event, data);
}

/**
 * Send email notifications to all project members (except actor).
 * Fire-and-forget — does not throw.
 */
async function emailProjectMembers(type, { projectId, actorUserId, actorName, projectName, pin, comment }) {
  try {
    const recipients = await getRecipients(projectId, actorUserId);
    const link = buildPinLink(projectId, pin._id);

    for (const recipient of recipients) {
      try {
        if (type === 'pin') {
          await sendPinNotificationEmail(recipient.email, actorName, projectName, pin.pageUrl, link);
        } else if (type === 'comment') {
          await sendCommentNotificationEmail(recipient.email, actorName, projectName, comment.body, link);
        }
      } catch (emailErr) {
        console.error(`Failed to send ${type} notification to ${recipient.email}:`, emailErr.message);
      }
    }
  } catch (err) {
    console.error(`Failed to send ${type} email notifications:`, err.message);
  }
}

/**
 * Send mention notification emails to specifically mentioned users.
 * Fire-and-forget — does not throw.
 */
async function emailMentionedUsers({ mentionedUserIds, actorUserId, actorName, projectName, pin, comment }) {
  try {
    if (!mentionedUserIds || mentionedUserIds.length === 0) return;
    const actorStr = actorUserId.toString();
    const users = await User.find({ _id: { $in: mentionedUserIds } }).select('name email');
    const link = buildPinLink(pin.project.toString(), pin._id);
    for (const user of users) {
      if (user._id.toString() === actorStr) continue;
      try {
        await sendMentionNotificationEmail(user.email, actorName, projectName, comment.body, link);
      } catch (emailErr) {
        console.error(`Failed to send mention notification to ${user.email}:`, emailErr.message);
      }
    }
  } catch (err) {
    console.error('Failed to send mention email notifications:', err.message);
  }
}

module.exports = { emitToProject, emailProjectMembers, emailMentionedUsers };
