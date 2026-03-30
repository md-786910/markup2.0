const axios = require('axios');

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

const ACTION_MESSAGES = {
  'pin.created': (d) => `New feedback pin #${d.pinNumber} on *${d.projectName}* by ${d.actorName}`,
  'comment.created': (d) => `${d.actorName} commented on pin #${d.pinNumber} in *${d.projectName}*`,
  'pin.resolved': (d) => `Pin #${d.pinNumber} resolved in *${d.projectName}* by ${d.actorName}`,
  'pin.reopened': (d) => `Pin #${d.pinNumber} reopened in *${d.projectName}* by ${d.actorName}`,
};

/**
 * Send a notification to a Slack channel via webhook.
 */
async function sendSlackNotification(webhookUrl, data) {
  const messageFn = ACTION_MESSAGES[data.action];
  if (!messageFn) return;

  const text = messageFn(data);
  const link = `${CLIENT_ORIGIN}/project/${data.projectId}?pin=${data.pinId || ''}`;

  const blocks = [
    {
      type: 'section',
      text: { type: 'mrkdwn', text },
    },
  ];

  if (data.comment) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `> ${stripHtml(data.comment).substring(0, 200)}` },
    });
  }

  blocks.push({
    type: 'actions',
    elements: [{
      type: 'button',
      text: { type: 'plain_text', text: 'View in Feedbackly' },
      url: link,
    }],
  });

  await axios.post(webhookUrl, { blocks });
}

module.exports = { sendSlackNotification };
