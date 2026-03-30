const Project = require('../models/Project');
const User = require('../models/User');
const Integration = require('../models/Integration');
const { queueNotification } = require('./emailQueue');
const { sendSlackNotification } = require('./slackNotifier');
const { sendDiscordNotification } = require('./discordNotifier');
const { createJiraIssue } = require('./jiraSync');

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
 * Queue email notifications to all project members (except actor).
 * Events are batched per recipient — rapid actions become a single digest email.
 * Fire-and-forget — does not throw.
 */
async function emailProjectMembers(type, { projectId, actorUserId, actorName, projectName, pin, comment, excludeUserIds }) {
  try {
    const recipients = await getRecipients(projectId, actorUserId);
    const link = buildPinLink(projectId, pin._id);
    const excludeSet = new Set((excludeUserIds || []).map(String));

    for (const recipient of recipients) {
      if (excludeSet.has(recipient._id.toString())) continue;

      const event = {
        projectId,
        projectName,
        type,
        actorName,
        link,
        pinNumber: pin.pinNumber || null,
      };

      if (type === 'pin') {
        event.pinPageUrl = pin.pageUrl;
      } else if (type === 'comment') {
        event.commentBody = comment.body;
      } else if (type === 'status') {
        event.pinStatus = pin.status;
      }

      queueNotification(recipient.email, event);
    }
  } catch (err) {
    console.error(`Failed to queue ${type} email notifications:`, err.message);
  }
}

/**
 * Queue mention notification emails to specifically mentioned users.
 * Fire-and-forget — does not throw.
 */
async function emailMentionedUsers({ mentionedUserIds, actorUserId, actorName, projectName, pin, comment }) {
  try {
    if (!mentionedUserIds || mentionedUserIds.length === 0) return;
    const actorStr = actorUserId.toString();
    const users = await User.find({ _id: { $in: mentionedUserIds } }).select('name email');
    const link = buildPinLink(pin.project.toString(), pin._id);
    const projectId = pin.project.toString();

    for (const user of users) {
      if (user._id.toString() === actorStr) continue;
      queueNotification(user.email, {
        projectId,
        projectName,
        type: 'mention',
        actorName,
        commentBody: comment.body,
        link,
      });
    }
  } catch (err) {
    console.error('Failed to queue mention email notifications:', err.message);
  }
}

/**
 * Notify external integrations (Slack, Discord, Jira) for a project event.
 * Fire-and-forget — does not throw.
 *
 * @param {string} projectId
 * @param {string} orgId
 * @param {object} eventData - { action, actorName, projectName, pinNumber, pinId, pageUrl, comment }
 */
async function notifyIntegrations(projectId, orgId, eventData) {
  try {
    if (!orgId) return;

    const integrations = await Integration.find({
      organization: orgId,
      enabled: true,
      $or: [{ project: projectId }, { project: null }],
    });

    for (const integration of integrations) {
      const notifyOn = integration.config?.notifyOn;
      if (notifyOn && !notifyOn.includes(eventData.action)) continue;

      try {
        if (integration.type === 'slack' && integration.config?.webhookUrl) {
          await sendSlackNotification(integration.config.webhookUrl, eventData);
        } else if (integration.type === 'discord' && integration.config?.webhookUrl) {
          await sendDiscordNotification(integration.config.webhookUrl, eventData);
        } else if (integration.type === 'jira' && integration.config?.syncPins && eventData.action === 'pin.created') {
          await createJiraIssue(integration.config, eventData);
        }
      } catch (err) {
        console.error(`Failed to notify ${integration.type} integration ${integration._id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Failed to notify integrations:', err.message);
  }
}

module.exports = { emitToProject, emailProjectMembers, emailMentionedUsers, notifyIntegrations };
