/**
 * Live sync: after a successful change, every signed-in tab of the
 * organization gets a small `sync` event ({ topics, projectId? }) in the
 * `org:<id>` room and re-fetches what it shows through the normal API, so
 * access rules stay where they are (the event carries no data).
 *
 * Topics: projects (list / cards), pins (pin & comment counts), project (one
 * project's details), versions, workspaces, team, org (name, logo, plan,
 * lock, billing), integrations.
 *
 * The middleware maps mutating /api requests to topics; code that changes
 * data outside a request (payment webhooks) calls publish() directly.
 */
let ioRef = null;

function setIo(io) { ioRef = io; }

function publish(orgId, topics, projectId) {
  if (!ioRef || !orgId || !topics?.length) return;
  try {
    ioRef.to(`org:${orgId}`).emit('sync', { topics, ...(projectId ? { projectId: String(projectId) } : {}) });
  } catch { /* best effort */ }
}

const ID = '([a-f0-9]{24})';
// First match wins. `project: true` takes the project id from the first group.
const RULES = [
  { re: new RegExp(`^/api/projects/${ID}/pins`), topics: ['pins'], project: true },
  { re: /^\/api\/pins\//, topics: ['pins'] },
  { re: new RegExp(`^/api/projects/${ID}/versions`), topics: ['versions', 'pins'], project: true },
  { re: new RegExp(`^/api/projects/${ID}/(members|invitations)`), topics: ['projects', 'project', 'team'], project: true },
  { re: new RegExp(`^/api/projects/${ID}`), topics: ['projects', 'project'], project: true },
  { re: /^\/api\/projects\/?$/, topics: ['projects', 'workspaces'] },
  { re: /^\/api\/workspaces/, topics: ['workspaces', 'projects', 'team'] },
  { re: /^\/api\/invitations/, topics: ['team'] },
  { re: /^\/api\/auth\/(profile|avatar|account)/, topics: ['team', 'projects'] },
  { re: /^\/api\/auth\/signup/, topics: ['team', 'projects', 'workspaces'] },
  { re: /^\/api\/auth\/organization/, topics: ['org'] },
  { re: /^\/api\/billing/, topics: ['org'] },
  { re: /^\/api\/integrations/, topics: ['integrations'] },
  { re: /^\/api\/guest\//, topics: ['pins'] },
  { re: new RegExp(`^/api/admin/organizations/${ID}`), topics: ['org', 'team', 'projects'], admin: true },
];

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function middleware(req, res, next) {
  if (!MUTATING.has(req.method)) return next();
  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    const path = req.originalUrl.split('?')[0];
    const rule = RULES.find((r) => r.re.test(path));
    if (!rule) return;
    const m = path.match(rule.re);
    const hint = res.locals.liveSync || {};
    const orgId = rule.admin
      ? m[1]
      : hint.orgId || req.project?.organization || req.user?.organization;
    const projectId = rule.project ? m[1] : hint.projectId || req.project?._id;
    publish(orgId, rule.topics, projectId);
  });
  next();
}

module.exports = { setIo, publish, middleware };
