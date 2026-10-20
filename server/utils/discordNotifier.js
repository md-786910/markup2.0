const axios = require('axios');

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

const ACTION_MESSAGES = {
  'pin.created': (d) => `New feedback pin #${d.pinNumber} on **${d.projectName}** by ${d.actorName}`,
  'comment.created': (d) => `${d.actorName} commented on pin #${d.pinNumber} in **${d.projectName}**`,
  'pin.resolved': (d) => `Pin #${d.pinNumber} resolved in **${d.projectName}** by ${d.actorName}`,
  'pin.reopened': (d) => `Pin #${d.pinNumber} reopened in **${d.projectName}** by ${d.actorName}`,
};

const ACTION_COLORS = {
  'pin.created': 0x3b82f6,
  'comment.created': 0x3b82f6,
  'pin.resolved': 0x22c55e,
  'pin.reopened': 0xf59e0b,
};

/**
 * Send a notification to a Discord channel via webhook.
 */
async function sendDiscordNotification(webhookUrl, data) {
  const messageFn = ACTION_MESSAGES[data.action];
  if (!messageFn) return;

  const title = messageFn(data);
  const link = `${CLIENT_ORIGIN}/project/${data.projectId}?pin=${data.pinId || ''}`;

  await axios.post(webhookUrl, {
    embeds: [{
      title,
      description: data.comment ? stripHtml(data.comment).substring(0, 200) : '',
      url: link,
      color: ACTION_COLORS[data.action] || 0x3b82f6,
      timestamp: new Date().toISOString(),
      footer: { text: 'Feedbackly' },
    }],
  });
}

module.exports = { sendDiscordNotification };
