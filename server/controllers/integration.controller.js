const Integration = require('../models/Integration');
const asyncHandler = require('../utils/asyncHandler');
const { sendSlackNotification } = require('../utils/slackNotifier');
const { sendDiscordNotification } = require('../utils/discordNotifier');

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

  res.json({ integrations });
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

  if (!type || !['slack', 'jira', 'discord'].includes(type)) {
    return res.status(400).json({ message: 'Invalid integration type. Must be slack, jira, or discord.' });
  }

  // Validate required config fields
  if (type === 'slack' || type === 'discord') {
    if (!config?.webhookUrl) {
      return res.status(400).json({ message: 'Webhook URL is required.' });
    }
  }
  if (type === 'jira') {
    if (!config?.domain || !config?.email || !config?.apiToken || !config?.projectKey) {
      return res.status(400).json({ message: 'Jira domain, email, API token, and project key are required.' });
    }
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

  res.status(201).json({ integration: populated });
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

  const { config, enabled, project } = req.body;
  if (config !== undefined) integration.config = { ...integration.config, ...config };
  if (enabled !== undefined) integration.enabled = enabled;
  if (project !== undefined) integration.project = project || null;

  await integration.save();

  const populated = await Integration.findById(integration._id)
    .populate('project', 'name')
    .populate('createdBy', 'name email');

  res.json({ integration: populated });
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
