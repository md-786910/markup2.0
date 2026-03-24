const {
  sendPinNotificationEmail,
  sendCommentNotificationEmail,
  sendMentionNotificationEmail,
  sendPinStatusEmail,
  sendDigestEmail,
} = require('./mailer');

const FLUSH_DELAY = parseInt(process.env.EMAIL_BATCH_DELAY_MS || '300000', 10); // default 5 minutes

// Map<"email::projectId", { events: [], timer: Timeout }>
const queue = new Map();

/**
 * Queue a notification event for batching.
 * Events for the same recipient + project are grouped into one digest email.
 */
function queueNotification(recipientEmail, event) {
  const key = `${recipientEmail}::${event.projectId}`;

  if (!queue.has(key)) {
    queue.set(key, { events: [], timer: null });
  }

  const bucket = queue.get(key);
  bucket.events.push(event);

  // Start flush timer on first event in this bucket
  if (!bucket.timer) {
    bucket.timer = setTimeout(() => flush(key, recipientEmail), FLUSH_DELAY);
  }
}

/**
 * Flush all queued events for a recipient+project into one email.
 */
async function flush(key, recipientEmail) {
  const bucket = queue.get(key);
  if (!bucket) return;
  queue.delete(key);

  const { events } = bucket;
  if (events.length === 0) return;

  try {
    if (events.length === 1) {
      // Single event — send the original specific email (no digest wrapper)
      await sendSingleEmail(recipientEmail, events[0]);
    } else {
      // Multiple events — send digest
      const projectName = events[0].projectName;
      await sendDigestEmail(recipientEmail, projectName, events);
    }
  } catch (err) {
    console.error(`Failed to send batched email to ${recipientEmail}:`, err.message);
  }
}

/**
 * Send an individual email using the original mailer functions.
 */
async function sendSingleEmail(toEmail, event) {
  switch (event.type) {
    case 'pin':
      await sendPinNotificationEmail(toEmail, event.actorName, event.projectName, event.pinPageUrl, event.link);
      break;
    case 'comment':
      await sendCommentNotificationEmail(toEmail, event.actorName, event.projectName, event.commentBody, event.link);
      break;
    case 'mention':
      await sendMentionNotificationEmail(toEmail, event.actorName, event.projectName, event.commentBody, event.link);
      break;
    case 'status':
      await sendPinStatusEmail(toEmail, event.actorName, event.projectName, event.pinStatus, event.link);
      break;
    default:
      console.warn(`Unknown email event type: ${event.type}`);
  }
}

module.exports = { queueNotification };
