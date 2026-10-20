const Activity = require('../models/Activity');
const Project = require('../models/Project');

// Cache projectId → organizationId so the fire-and-forget logger doesn't hit
// the Project collection on every call. Capped LRU-ish; oldest entry evicted
// when full.
const projectOrgCache = new Map();
const PROJECT_ORG_CACHE_MAX = 500;

async function resolveOrganizationForProject(projectId) {
  if (!projectId) return null;
  const key = String(projectId);
  if (projectOrgCache.has(key)) return projectOrgCache.get(key);
  try {
    const proj = await Project.findById(projectId).select('organization').lean();
    const orgId = proj?.organization || null;
    if (projectOrgCache.size >= PROJECT_ORG_CACHE_MAX) {
      const firstKey = projectOrgCache.keys().next().value;
      projectOrgCache.delete(firstKey);
    }
    projectOrgCache.set(key, orgId);
    return orgId;
  } catch (_) {
    return null;
  }
}

/**
 * Log an activity event for a project.
 * Fire-and-forget — never throws. The project's organization is resolved so
 * the entry surfaces in the org-wide Activity feed too.
 *
 * @param {string} projectId - Project ObjectId
 * @param {string|null} actorId - User ObjectId (null for guest actions)
 * @param {string} action - Activity action enum value
 * @param {object} [metadata={}] - Extra context (pinNumber, memberName, etc.)
 */
function logActivity(projectId, actorId, action, metadata = {}) {
  resolveOrganizationForProject(projectId)
    .then((organization) =>
      Activity.create({
        organization,
        project: projectId,
        actor: actorId,
        action,
        metadata,
      })
    )
    .catch((err) => {
      console.error('Failed to log activity:', err.message);
    });
}

/**
 * Log a guest activity event.
 */
function logGuestActivity(projectId, guestName, guestEmail, action, metadata = {}) {
  resolveOrganizationForProject(projectId)
    .then((organization) =>
      Activity.create({
        organization,
        project: projectId,
        actor: null,
        actorGuest: { name: guestName, email: guestEmail },
        action,
        metadata,
      })
    )
    .catch((err) => {
      console.error('Failed to log guest activity:', err.message);
    });
}

/**
 * Log an org-scoped activity event (no project context). Fire-and-forget.
 *
 * @param {string} organizationId - Organization ObjectId
 * @param {string|null} actorId - User ObjectId (null for system-driven events)
 * @param {string} action - Activity action enum value (one of the org.* / integration.* / billing.* values)
 * @param {object} [metadata={}]
 */
function logOrgActivity(organizationId, actorId, action, metadata = {}) {
  if (!organizationId) return;
  Activity.create({
    organization: organizationId,
    project: null,
    actor: actorId,
    action,
    metadata,
  }).catch((err) => {
    console.error('Failed to log org activity:', err.message);
  });
}

module.exports = { logActivity, logGuestActivity, logOrgActivity };
