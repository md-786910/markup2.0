const Project = require('../models/Project');
const User = require('../models/User');
const Integration = require('../models/Integration');
const { queueNotification } = require('./emailQueue');
const { sendSlackNotification } = require('./slackNotifier');
const { sendDiscordNotification } = require('./discordNotifier');
const { sendTeamsNotification } = require('./teamsNotifier');
const { createJiraIssue } = require('./jiraSync');
const { URLS } = require('../config/env');

const CLIENT_ORIGIN = URLS.app;

function buildPinLink(projectId, pinId) {
  return `${CLIENT_ORIGIN}/project/${projectId}?pin=${pinId}`;
}

/**
 * Get all project members (owner + members) except the actor and those who muted the project.
 * Returns array of { _id, name, email }.
 */
// Fields of the people a project notifies, for both the in-app notifications
// (utils/notificationHelper) and the emails
const AUDIENCE_FIELDS = 'name email avatar mutedProjectEmails';

// Calls for the same project while one load is running share it (a comment
// or a status change notifies in-app and by email at the same moment). Only
// in-flight loads are shared, never cached: each new event reads membership fresh.
const audienceLoads = new Map();

/**
 * The project ({ _id, name, owner, members, workspace, organization }) and the
 * people it notifies, in order: owner, project members, then members of its
 * workspace (same organization only). Users that no longer exist are left out.
 * Three queries: project, workspace, users. Returned objects are shared
 * between concurrent callers: don't mutate them.
 */
function loadProjectAudience(projectId) {
  const key = String(projectId);
  if (audienceLoads.has(key)) return audienceLoads.get(key);
  const load = (async () => {
    const project = await Project.findById(projectId).select('name owner members workspace organization').lean();
    if (!project) return { project: null, users: [] };

    const Workspace = require('../models/Workspace');
    const workspace = project.workspace
      ? await Workspace.findById(project.workspace).select('members').lean()
      : await Workspace.findOne({ organization: project.organization, isDefault: true }).select('members').lean();

    const directIds = [project.owner, ...(project.members || [])].filter(Boolean);
    const workspaceIds = (workspace?.members || []).map((m) => m.user).filter(Boolean);
    const or = [];
    if (directIds.length) or.push({ _id: { $in: directIds } });
    if (workspaceIds.length) or.push({ _id: { $in: workspaceIds }, organization: project.organization });
    const found = or.length ? await User.find({ $or: or }).select(`${AUDIENCE_FIELDS} organization`).lean() : [];
    const byId = new Map(found.map((u) => [u._id.toString(), u]));

    // Keep the old order; a workspace member only counts when in the project's org
    const users = [];
    for (const id of directIds) if (byId.has(id.toString())) users.push(byId.get(id.toString()));
    const orgStr = project.organization ? project.organization.toString() : null;
    for (const id of workspaceIds) {
      const u = byId.get(id.toString());
      if (u && (u.organization ? u.organization.toString() : null) === orgStr) users.push(u);
    }
    return { project, users };
  })();
  audienceLoads.set(key, load);
  load.finally(() => audienceLoads.delete(key)).catch(() => {});
  return load;
}

async function getRecipients(projectId, excludeUserId) {
  const { project, users: all } = await loadProjectAudience(projectId);
  if (!project) return [];
  const excludeStr = excludeUserId ? excludeUserId.toString() : '';
  const projIdStr = projectId ? projectId.toString() : '';
  const seen = new Set();
  return all.filter((u) => {
    const id = u._id.toString();
    if (id === excludeStr || seen.has(id)) return false;
    seen.add(id);

    // Skip if user muted email notifications for this project
    if (u.mutedProjectEmails && u.mutedProjectEmails.some((p) => p.toString() === projIdStr)) {
      return false;
    }

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
    const actorStr = actorUserId ? actorUserId.toString() : '';
    const users = await User.find({ _id: { $in: mentionedUserIds } }).select('name email mutedProjectEmails');
    const projectId = (pin.project?._id || pin.project || '').toString();
    const pinId = (pin._id || '').toString();
    const link = buildPinLink(projectId, pinId);
    const senderName = actorName || comment?.author?.name || 'Someone';

    for (const user of users) {
      if (user._id.toString() === actorStr) continue;

      // Skip if user muted email notifications for this project
      if (user.mutedProjectEmails && user.mutedProjectEmails.some((p) => p.toString() === projectId)) {
        continue;
      }

      queueNotification(user.email, {
        projectId,
        projectName,
        type: 'mention',
        actorName: senderName,
        commentBody: comment.body,
        pinNumber: pin?.pinNumber || null,
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

    // Integrations stop when the org's plan no longer includes them (e.g. after a downgrade)
    const Organization = require('../models/Organization');
    const { getEffectiveLimitsAsync } = require('../config/plans');
    const org = await Organization.findById(orgId).select('plan limitOverrides');
    if (!org || (await getEffectiveLimitsAsync(org)).hasIntegrations === false) return;

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
        } else if (integration.type === 'teams' && integration.config?.webhookUrl) {
          await sendTeamsNotification(integration.config.webhookUrl, eventData);
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

module.exports = { emitToProject, emailProjectMembers, emailMentionedUsers, notifyIntegrations, getRecipients, loadProjectAudience };
