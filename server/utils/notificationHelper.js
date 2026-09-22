const Notification = require('../models/Notification');
const Project = require('../models/Project');
const { stripHtmlAndMentions } = require('./mentionHelper');

/**
 * Creates in-app notification for a single recipient and emits real-time Socket.IO event.
 */
async function createSingleNotification({
  io,
  recipientId,
  actor = null,
  actorGuest = null,
  projectId,
  pin = null,
  comment = null,
  type,
  title,
  message = '',
  metadata = {},
}) {
  try {
    if (!recipientId || !projectId) return null;
    const recipientIdStr = (recipientId._id || recipientId).toString();
    const actorIdStr = actor ? (actor._id || actor).toString() : null;
    if (recipientIdStr === actorIdStr) return null; // don't notify self

    const pinId = pin ? (pin._id || pin) : null;
    const commentId = comment ? (comment._id || comment) : null;

    const notif = await Notification.create({
      recipient: recipientIdStr,
      actor: actor ? (actor._id || actor) : null,
      actorGuest: actorGuest ? { name: actorGuest.name, email: actorGuest.email } : null,
      project: projectId,
      pin: pinId,
      comment: commentId,
      type,
      title,
      message: message ? stripHtmlAndMentions(message).substring(0, 200) : '',
      metadata: {
        ...metadata,
      },
      read: false,
      createdAt: new Date(),
    });

    const populated = await Notification.findById(notif._id)
      .populate('actor', 'name email avatar')
      .populate('project', 'name')
      .populate('pin', 'pinNumber pageUrl');

    if (io && populated) {
      const recipientRoom = `user:${recipientIdStr}`;
      io.to(recipientRoom).emit('notification:new', populated);
    }

    return populated;
  } catch (err) {
    console.error('Failed to create single notification:', err.message);
    return null;
  }
}

/**
 * Creates in-app notifications for all members of a project (except the actor and excludeRecipientIds)
 * and emits real-time Socket.IO events to each recipient.
 */
async function createProjectNotifications({
  io,
  projectId,
  actor = null,
  actorGuest = null,
  type,
  pin = null,
  comment = null,
  mentionedUserIds = [],
  excludeRecipientIds = [],
  message = '',
  metadata = {},
}) {
  try {
    if (!projectId) return [];

    const project = await Project.findById(projectId)
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar');

    if (!project) return [];

    // Collect all project members
    const allMembers = [project.owner, ...(project.members || [])].filter(Boolean);
    const actorIdStr = actor ? (actor._id || actor).toString() : null;
    const excludeSet = new Set(
      (excludeRecipientIds || []).map((id) => (id._id || id).toString())
    );

    // Filter unique member IDs excluding the actor and any explicitly excluded IDs
    const seen = new Set();
    const recipientMembers = [];

    for (const m of allMembers) {
      const mId = m._id.toString();
      if (mId === actorIdStr || seen.has(mId) || excludeSet.has(mId)) continue;
      seen.add(mId);
      recipientMembers.push(m);
    }

    if (recipientMembers.length === 0) return [];

    const pinId = pin ? (pin._id || pin) : null;
    const commentId = comment ? (comment._id || comment) : null;
    const pinNumber = pin?.pinNumber || metadata?.pinNumber || null;
    const actorName = actor?.name || actorGuest?.name || 'Someone';

    const mentionedSet = new Set((mentionedUserIds || []).map((id) => (id._id || id).toString()));

    const notificationsToCreate = [];

    for (const member of recipientMembers) {
      const memberIdStr = member._id.toString();
      const isMentioned = mentionedSet.has(memberIdStr);

      const notifType = isMentioned ? 'mention' : type;

      let title = '';
      if (notifType === 'mention') {
        title = `${actorName} mentioned you${pinNumber ? ` on pin #${pinNumber}` : ''}`;
      } else if (notifType === 'comment') {
        title = `${actorName} commented${pinNumber ? ` on pin #${pinNumber}` : ''}`;
      } else if (notifType === 'pin_created') {
        title = `${actorName} added a new pin${pinNumber ? ` #${pinNumber}` : ''}`;
      } else if (notifType === 'pin_resolved') {
        title = `${actorName} resolved pin #${pinNumber || ''}`;
      } else if (notifType === 'pin_reopened') {
        title = `${actorName} reopened pin #${pinNumber || ''}`;
      } else if (notifType === 'pin_deleted') {
        title = `${actorName} deleted pin #${pinNumber || ''}`;
      } else if (notifType === 'member_invited') {
        const targetDesc = metadata?.targetMemberName || metadata?.targetMemberEmail || 'a member';
        title = `${actorName} invited ${targetDesc} to ${project.name}`;
      } else if (notifType === 'member_removed') {
        const targetDesc = metadata?.targetMemberName || 'a member';
        title = `${actorName} removed ${targetDesc} from ${project.name}`;
      } else {
        title = `${actorName} updated project`;
      }

      notificationsToCreate.push({
        recipient: member._id,
        actor: actor ? (actor._id || actor) : null,
        actorGuest: actorGuest ? { name: actorGuest.name, email: actorGuest.email } : null,
        project: project._id,
        pin: pinId,
        comment: commentId,
        type: notifType,
        title,
        message: message ? stripHtmlAndMentions(message).substring(0, 200) : '',
        metadata: {
          pinNumber,
          pageUrl: pin?.pageUrl || metadata?.pageUrl || '',
          projectName: project.name,
          ...metadata,
        },
        read: false,
        createdAt: new Date(),
      });
    }

    if (notificationsToCreate.length === 0) return [];

    const createdDocs = await Notification.insertMany(notificationsToCreate);

    // Populate created notifications for real-time emission
    const populated = await Notification.find({
      _id: { $in: createdDocs.map((d) => d._id) },
    })
      .populate('actor', 'name email avatar')
      .populate('project', 'name')
      .populate('pin', 'pinNumber pageUrl');

    // Emit real-time notification to each recipient
    if (io) {
      for (const notif of populated) {
        const recipientRoom = `user:${notif.recipient.toString()}`;
        io.to(recipientRoom).emit('notification:new', notif);
      }
    }

    return populated;
  } catch (err) {
    console.error('Failed to create in-app notifications:', err.message);
    return [];
  }
}

module.exports = { createProjectNotifications, createSingleNotification };

