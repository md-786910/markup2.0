/**
 * Deterministically generates bullet list features for a plan from its limits,
 * flags, support SLA, and optional custom bullet points.
 *
 * Prevents marketing text and actual system limits from drifting out of sync.
 *
 * @param {object} plan - Plan object with limits, support, etc.
 * @param {string[]} [extraFeatures=[]] - Additional custom bullets
 * @returns {string[]} Bullet list of features
 */
function derivePlanFeatures(plan, extraFeatures = []) {
  if (!plan) return [];
  const limits = plan.limits || {};
  const support = plan.support || {};
  const bullets = [];

  // 1. Projects
  if (limits.maxProjects != null) {
    bullets.push(limits.maxProjects >= 999 ? 'Unlimited projects' : `${limits.maxProjects} projects`);
  }

  // 2. Workspaces
  if (limits.maxWorkspaces != null) {
    bullets.push(limits.maxWorkspaces >= 999 ? 'Unlimited workspaces' : `${limits.maxWorkspaces} ${limits.maxWorkspaces === 1 ? 'workspace' : 'workspaces'}`);
  }

  // 3. Team members
  if (limits.maxMembers != null) {
    bullets.push(limits.maxMembers >= 999 ? 'Unlimited team members' : `${limits.maxMembers} team members`);
  }

  // 4. Guest reviewers
  if (limits.maxGuests != null) {
    bullets.push(limits.maxGuests >= 999 ? 'Unlimited guest reviewers' : `${limits.maxGuests} guest reviewers`);
  }

  // 5. Storage
  if (limits.maxStorageMB != null) {
    if (limits.maxStorageMB >= 1024) {
      const gb = Math.round((limits.maxStorageMB / 1024) * 10) / 10;
      bullets.push(`${gb % 1 === 0 ? gb.toFixed(0) : gb} GB storage`);
    } else {
      bullets.push(`${limits.maxStorageMB} MB storage`);
    }
  }

  // 6. Client approvals & deadlines
  if (limits.hasApprovals) {
    bullets.push('Client approvals & feedback deadlines');
  }

  // 6b. Task workflow & Kanban board
  if (limits.hasTaskWorkflow) {
    bullets.push('Kanban task board, assignees & priorities');
  }

  // 7. Integrations
  if (limits.hasIntegrations) {
    bullets.push('Slack, Jira, Discord & Teams integrations');
  }

  // 8. Activity logs & version history
  if (limits.hasActivityLogs && limits.hasVersionHistory) {
    bullets.push('Activity log & version history');
  } else if (limits.hasActivityLogs) {
    bullets.push('Activity log');
  } else if (limits.hasVersionHistory) {
    bullets.push('Version history');
  }

  // 9. Support channel SLA
  if (support.priority === 'urgent') {
    bullets.push('Dedicated priority support (8h reply target)');
  } else if (support.chat) {
    bullets.push('Priority support and live chat');
  } else if (support.tickets) {
    bullets.push('In-app support');
  } else {
    bullets.push('Email support');
  }

  // 10. Optional extra custom bullets
  const extras = Array.isArray(extraFeatures)
    ? extraFeatures
    : (Array.isArray(plan.extraFeatures) ? plan.extraFeatures : []);

  for (const item of extras) {
    const s = String(item || '').trim();
    if (s && !bullets.includes(s)) {
      bullets.push(s);
    }
  }

  return bullets;
}

module.exports = { derivePlanFeatures };

