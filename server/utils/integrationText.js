// User-supplied text (names, project names, comments, browser strings) goes
// into chat messages as plain text: it must not ping a channel (<!channel>,
// @everyone) or render as a disguised link ([Log in](https://evil), <url|text>).

function stripHtml(html) {
  if (!html) return '';
  return String(html).replace(/<[^>]*>/g, '').trim();
}

// Slack mrkdwn: &, < and > are its control characters
function escapeSlack(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Discord and Teams Markdown: escape the characters that start formatting,
// links and mentions (and angle brackets, used for autolinks)
function escapeMarkdown(value) {
  return String(value == null ? '' : value)
    .replace(/([\\`*_~|[\]()<>#!])/g, '\\$1')
    .replace(/@/g, '@​');
}

module.exports = { stripHtml, escapeSlack, escapeMarkdown };
