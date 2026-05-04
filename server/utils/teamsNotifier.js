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
  'pin.created': 'accent',
  'comment.created': 'accent',
  'pin.resolved': 'good',
  'pin.reopened': 'warning',
};

async function sendTeamsNotification(webhookUrl, data) {
  const messageFn = ACTION_MESSAGES[data.action];
  if (!messageFn) return;

  const title = messageFn(data);
  const link = `${CLIENT_ORIGIN}/project/${data.projectId}?pin=${data.pinId || ''}`;
  const color = ACTION_COLORS[data.action] || 'accent';

  const body = [
    {
      type: 'TextBlock',
      text: title,
      weight: 'Bolder',
      wrap: true,
      size: 'Medium',
      color,
    },
  ];

  if (data.comment) {
    body.push({
      type: 'TextBlock',
      text: stripHtml(data.comment).substring(0, 200),
      wrap: true,
      isSubtle: true,
    });
  }

  await axios.post(webhookUrl, {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body,
          actions: [
            {
              type: 'Action.OpenUrl',
              title: 'View in Feedbackly',
              url: link,
            },
          ],
        },
      },
    ],
  });
}

module.exports = { sendTeamsNotification };
