const axios = require('axios');

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

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

  const response = await axios.post(
    `https://${domain}/rest/api/3/issue`,
    {
      fields: {
        project: { key: projectKey },
        summary: `[Feedbackly] Pin #${data.pinNumber} — ${data.projectName}`,
        description: {
          type: 'doc',
          version: 1,
          content: [
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
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: `View in Feedbackly: ${link}` },
              ],
            },
          ],
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
