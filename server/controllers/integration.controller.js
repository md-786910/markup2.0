const Integration = require('../models/Integration');
const Project = require('../models/Project');
const asyncHandler = require('../utils/asyncHandler');
const { sendSlackNotification } = require('../utils/slackNotifier');
const { sendDiscordNotification } = require('../utils/discordNotifier');
const { sendTeamsNotification } = require('../utils/teamsNotifier');
const { logOrgActivity } = require('../utils/activityLogger');
const { isPublicUrl } = require('../utils/ssrfGuard');

// Integration targets are called server-side, so they must be public HTTPS
// endpoints (no internal hosts). Returns an error message, or null when valid.
async function validateIntegrationTarget(type, config) {
  if (!config) return null;
  if ((type === 'slack' || type === 'discord' || type === 'teams') && config.webhookUrl !== undefined) {
    const url = String(config.webhookUrl);
    if (!url.startsWith('https://') || !(await isPublicUrl(url))) {
      return 'Webhook URL must be a public https:// URL.';
    }
  }
  if (type === 'jira' && config.domain !== undefined) {
    const domain = String(config.domain);
    if (!/^[a-z0-9.-]+(:\d+)?$/i.test(domain) || !(await isPublicUrl(`https://${domain}/`))) {
      return 'Jira domain must be a public hostname, e.g. yourcompany.atlassian.net.';
    }
  }
  return null;
}

// Jira API tokens are credentials: responses only show the last 4 characters.
// A masked or empty token sent back on update means "keep the stored token".
const TOKEN_MASK = '••••';

function maskIntegration(doc) {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  if (obj.config && obj.config.apiToken) {
    obj.config = { ...obj.config, apiToken: `${TOKEN_MASK}${String(obj.config.apiToken).slice(-4)}` };
  }
  return obj;
}

function isMaskedOrEmptyToken(value) {
  return value === '' || (typeof value === 'string' && value.startsWith(TOKEN_MASK));
}

// A project-scoped integration may only target a project of the same organization.
async function isOrgProject(projectId, orgId) {
  if (!projectId) return true;
  return !!(await Project.exists({ _id: projectId, organization: orgId }));
}

/**
 * GET /api/integrations
 * List all integrations for the user's organization.
 */
exports.getIntegrations = asyncHandler(async (req, res) => {
  const orgId = req.user.organization;
  if (!orgId) {
    return res.status(400).json({ message: 'No organization found' });
  }

  const integrations = await Integration.find({ organization: orgId })
    .populate('project', 'name')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  res.json({ integrations: integrations.map(maskIntegration) });
});

/**
 * POST /api/integrations
 * Create a new integration.
 */
exports.createIntegration = asyncHandler(async (req, res) => {
  const orgId = req.user.organization;
  if (!orgId) {
    return res.status(400).json({ message: 'No organization found' });
  }

  const { type, config, project, enabled } = req.body;

  if (!type || !['slack', 'jira', 'discord', 'teams'].includes(type)) {
    return res.status(400).json({ message: 'Invalid integration type. Must be slack, jira, discord, or teams.' });
  }

  // Validate required config fields
  if (type === 'slack' || type === 'discord' || type === 'teams') {
    if (!config?.webhookUrl) {
      return res.status(400).json({ message: 'Webhook URL is required.' });
    }
  }
  if (type === 'jira') {
    if (!config?.domain || !config?.email || !config?.apiToken || !config?.projectKey) {
      return res.status(400).json({ message: 'Jira domain, email, API token, and project key are required.' });
    }
  }

  const targetError = await validateIntegrationTarget(type, config);
  if (targetError) {
    return res.status(400).json({ message: targetError });
  }
  if (!(await isOrgProject(project, orgId))) {
    return res.status(400).json({ message: 'Project not found in your organization.' });
  }

  const integration = await Integration.create({
    organization: orgId,
    project: project || null,
    type,
    enabled: enabled !== false,
    config,
    createdBy: req.user._id,
  });

  const populated = await Integration.findById(integration._id)
    .populate('project', 'name')
    .populate('createdBy', 'name email');

  logOrgActivity(orgId, req.user._id, 'integration.connected', {
    type: integration.type,
    integrationId: String(integration._id),
    projectName: populated.project?.name || null,
  });

  res.status(201).json({ integration: maskIntegration(populated) });
});

/**
 * PATCH /api/integrations/:id
 * Update an integration.
 */
exports.updateIntegration = asyncHandler(async (req, res) => {
  const integration = await Integration.findById(req.params.id);
  if (!integration) {
    return res.status(404).json({ message: 'Integration not found' });
  }

  if (integration.organization.toString() !== req.user.organization?.toString()) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  const { enabled, project } = req.body;
  let { config } = req.body;
  // Keep the stored Jira token when the client sends back the masked value
  if (config && isMaskedOrEmptyToken(config.apiToken)) {
    const { apiToken, ...rest } = config;
    config = rest;
  }
  const targetError = await validateIntegrationTarget(integration.type, config);
  if (targetError) {
    return res.status(400).json({ message: targetError });
  }
  if (project !== undefined && !(await isOrgProject(project, integration.organization))) {
    return res.status(400).json({ message: 'Project not found in your organization.' });
  }
  if (config !== undefined) integration.config = { ...integration.config, ...config };
  if (enabled !== undefined) integration.enabled = enabled;
  if (project !== undefined) integration.project = project || null;

  await integration.save();

  const populated = await Integration.findById(integration._id)
    .populate('project', 'name')
    .populate('createdBy', 'name email');

  res.json({ integration: maskIntegration(populated) });
});

/**
 * DELETE /api/integrations/:id
 * Remove an integration.
 */
exports.deleteIntegration = asyncHandler(async (req, res) => {
  const integration = await Integration.findById(req.params.id);
  if (!integration) {
    return res.status(404).json({ message: 'Integration not found' });
  }

  if (integration.organization.toString() !== req.user.organization?.toString()) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  await Integration.findByIdAndDelete(req.params.id);

  logOrgActivity(integration.organization, req.user._id, 'integration.disconnected', {
    type: integration.type,
    integrationId: String(integration._id),
  });

  res.json({ message: 'Integration deleted' });
});

/**
 * POST /api/integrations/:id/test
 * Send a test notification.
 */
exports.testIntegration = asyncHandler(async (req, res) => {
  const integration = await Integration.findById(req.params.id);
  if (!integration) {
    return res.status(404).json({ message: 'Integration not found' });
  }

  if (integration.organization.toString() !== req.user.organization?.toString()) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  const testData = {
    action: 'pin.created',
    actorName: req.user.name,
    projectName: 'Test Project',
    pinNumber: 1,
    projectId: 'test',
    comment: 'This is a test notification from Feedbackly.',
  };

  try {
    if (integration.type === 'slack') {
      await sendSlackNotification(integration.config.webhookUrl, testData);
    } else if (integration.type === 'discord') {
      await sendDiscordNotification(integration.config.webhookUrl, testData);
    } else if (integration.type === 'teams') {
      await sendTeamsNotification(integration.config.webhookUrl, testData);
    } else if (integration.type === 'jira') {
      // For Jira, just test the connection by fetching the project
      const axios = require('axios');
      const { domain, email, apiToken, projectKey } = integration.config;
      await axios.get(`https://${domain}/rest/api/3/project/${projectKey}`, {
        auth: { username: email, password: apiToken },
      });
    }

    res.json({ message: 'Test notification sent successfully!' });
  } catch (err) {
    res.status(400).json({
      message: `Test failed: ${err.response?.data?.message || err.message}`,
    });
  }
});
