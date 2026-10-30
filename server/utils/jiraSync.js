const axios = require('axios');
const { URLS } = require('../config/env');

const CLIENT_ORIGIN = URLS.app;

/**
 * Create a Jira issue from a pin.
 * Returns { id, key, self } from Jira API.
 */
async function createJiraIssue(config, data) {
  const { domain, email, apiToken, projectKey, issueType } = config;

  if (!domain || !email || !apiToken || !projectKey) {
    throw new Error('Jira integration is not fully configured');
  }

  const link = `${CLIENT_ORIGIN}/project/${data.projectId}?pin=${data.pinId || ''}`;

  const descContent = [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: `Page: ${data.pageUrl || 'N/A'}` },
      ],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: data.comment || 'No description provided' },
      ],
    },
  ];

  if (data.context) {
    const ctx = data.context;
    const parts = [];
    if (ctx.browser || ctx.os) parts.push(`Environment: ${ctx.browser || 'Unknown'} on ${ctx.os || 'Unknown'}`);
    if (ctx.screen && ctx.screen.w != null && ctx.screen.h != null) parts.push(`Screen: ${ctx.screen.w}x${ctx.screen.h} (DPR: ${ctx.screen.dpr || 1})`);
    if (ctx.pageTitle) parts.push(`Page Title: ${ctx.pageTitle}`);
    if (ctx.elementText) parts.push(`Element: ${ctx.elementText}`);
    if (Array.isArray(ctx.consoleErrors) && ctx.consoleErrors.length > 0) parts.push(`Console Errors: ${ctx.consoleErrors.length}`);
    if (Array.isArray(ctx.failedRequests) && ctx.failedRequests.length > 0) parts.push(`Failed Requests: ${ctx.failedRequests.length}`);

    if (parts.length > 0) {
      const content = [{ type: 'text', text: 'Technical Details:' }];
      parts.forEach((p) => {
        content.push({ type: 'hardBreak' });
        content.push({ type: 'text', text: p });
      });
      descContent.push({
        type: 'paragraph',
        content,
      });
    }
  }

  descContent.push({
    type: 'paragraph',
    content: [
      { type: 'text', text: `View in Kommently: ${link}` },
    ],
  });

  const response = await axios.post(
    `https://${domain}/rest/api/3/issue`,
    {
      fields: {
        project: { key: projectKey },
        summary: `[Kommently] Pin #${data.pinNumber} — ${data.projectName}`,
        description: {
          type: 'doc',
          version: 1,
          content: descContent,
        },
        issuetype: { name: issueType || 'Bug' },
      },
    },
    {
      auth: { username: email, password: apiToken },
      headers: { 'Content-Type': 'application/json' },
    }
  );

  return response.data;
}

module.exports = { createJiraIssue };
