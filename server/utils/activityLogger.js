const Activity = require('../models/Activity');

/**
 * Log an activity event for a project.
 * Fire-and-forget — never throws.
 *
 * @param {string} projectId - Project ObjectId
 * @param {string|null} actorId - User ObjectId (null for guest actions)
 * @param {string} action - Activity action enum value
 * @param {object} [metadata={}] - Extra context (pinNumber, memberName, etc.)
 */
function logActivity(projectId, actorId, action, metadata = {}) {
  Activity.create({
    project: projectId,
    actor: actorId,
    action,
    metadata,
  }).catch((err) => {
    console.error('Failed to log activity:', err.message);
  });
}

/**
 * Log a guest activity event.
 */
function logGuestActivity(projectId, guestName, guestEmail, action, metadata = {}) {
  Activity.create({
    project: projectId,
    actor: null,
    actorGuest: { name: guestName, email: guestEmail },
    action,
    metadata,
  }).catch((err) => {
    console.error('Failed to log guest activity:', err.message);
  });
}

module.exports = { logActivity, logGuestActivity };
