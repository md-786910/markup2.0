// Smoke tests: security, tenancy, guest links, billing and trials, run against
// the real app and a throwaway MongoDB database.
//
//   npm test
//   TEST_MONGODB_URI=mongodb://localhost:27017/kommently_smoke_test npm test
//   TEST_REDIS_URL=redis://localhost:6379/15 npm test   # also exercise the Redis paths
//
// The database is DROPPED before and after, so its name must end in "_test".
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/kommently_smoke_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'smoke-test-secret-'.padEnd(48, 'x');
process.env.EMAIL_BATCH_DELAY_MS = '3600000';
process.env.SENTRY_DSN = '';
// Decide the Redis mode once: scripts loaded later call dotenv, which could set REDIS_URL from .env
const TEST_REDIS = !!process.env.TEST_REDIS_URL;
if (TEST_REDIS) process.env.REDIS_URL = process.env.TEST_REDIS_URL;
else process.env.REDIS_URL = '';

const path = require('path');
const r = (m) => require(path.join(__dirname, '..', m));
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Capture every email instead of sending it. Must run before any module that
// destructures mailer functions at load time (e.g. scripts/runBilling.js).
const mailer = r('utils/mailer');
const sentMail = [];
const sentMailArgs = []; // full arguments, for tests that follow an emailed link
for (const name of Object.keys(mailer)) {
  if (typeof mailer[name] === 'function') {
    mailer[name] = async (to, org, arg) => {
      sentMail.push(`${name}:${org}:${typeof arg === 'number' ? arg : ''}`);
      sentMailArgs.push({ name, to, args: [org, arg] });
    };
  }
}

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  [' + extra + ']' : ''}`);
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  if (!mongoose.connection.name.endsWith('_test')) throw new Error(`Refusing to drop "${mongoose.connection.name}": test database name must end in _test`);
  await mongoose.connection.dropDatabase();

  const User = r('models/User'), Organization = r('models/Organization'), Project = r('models/Project');
  const Pin = r('models/Pin'), Comment = r('models/Comment'), Invoice = r('models/Invoice'), Invitation = r('models/Invitation');
  const { settleInvoice } = r('payments/settleInvoice');

  const mkUser = (name, role, extra = {}) => User.create({ name, email: `${name}@e2e.test`, passwordHash: 'x'.repeat(60), role, sessionToken: name + '-s', ...extra });
  const ownerA = await mkUser('ownerA', 'owner');
  const adminA = await mkUser('adminA', 'admin');
  const memberA = await mkUser('memberA', 'member');
  const ownerB = await mkUser('ownerB', 'owner');
  const orgA = await Organization.create({ name: 'Org A', slug: 'org-a-e2e', owner: ownerA._id, plan: 'trial', trialEndsAt: new Date(Date.now() + 9e8) });
  const orgB = await Organization.create({ name: 'Org B', slug: 'org-b-e2e', owner: ownerB._id, plan: 'trial', trialEndsAt: new Date(Date.now() + 9e8) });
  for (const [u, o] of [[ownerA, orgA], [adminA, orgA], [memberA, orgA], [ownerB, orgB]]) { u.organization = o._id; await u.save({ validateBeforeSave: false }); }

  const PA = await Project.create({ name: 'PA', projectType: 'website', websiteUrl: 'https://example.com', owner: ownerA._id, organization: orgA._id, members: [ownerA._id, memberA._id] });
  const PB = await Project.create({ name: 'PB', projectType: 'website', websiteUrl: 'https://example.org', owner: ownerB._id, organization: orgB._id, members: [ownerB._id] });
  const pinA = await Pin.create({ project: PA._id, pageUrl: 'https://example.com/', xPercent: 1, yPercent: 1, pinNumber: 1, createdBy: memberA._id });
  const pinB = await Pin.create({ project: PB._id, pageUrl: 'https://example.org/', xPercent: 1, yPercent: 1, pinNumber: 1, createdBy: ownerB._id });
  await Comment.create({ pin: pinB._id, author: ownerB._id, body: 'secret org B comment' });

  const tok = (u) => jwt.sign({ id: u._id, role: u.role, sessionToken: u.sessionToken }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });

  const app = r('app');
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, url, { user, token, body, headers = {} } = {}) => {
    const h = { ...headers };
    if (user) h.Authorization = `Bearer ${user._adminToken || tok(user)}`;
    if (token) h.Authorization = `Bearer ${token}`;
    if (body) h['Content-Type'] = 'application/json';
    const res = await fetch(base + url, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
    let data = null; try { data = await res.json(); } catch {}
    return { status: res.status, data };
  };

  // --- #1 tenant isolation
  check('owner of org B cannot read org A project', (await call('GET', `/api/projects/${PA._id}`, { user: ownerB })).status === 403);
  check('owner of org B cannot delete org A project', (await call('DELETE', `/api/projects/${PA._id}`, { user: ownerB })).status === 403);
  const adminRead = await call('GET', `/api/projects/${PA._id}`, { user: adminA });
  check('admin of org A can read org A project', adminRead.status === 200);
  check('member can read own project', (await call('GET', `/api/projects/${PA._id}`, { user: memberA })).status === 200);

  // --- #4 proxy token
  const proxyToken = adminRead.data?.proxyToken;
  check('getProject returns a proxy token', !!proxyToken);
  check('proxy token rejected by the API', (await call('GET', '/api/projects', { token: proxyToken })).status === 401);
  const list = await call('GET', '/api/projects', { user: ownerA });
  check('project list includes proxy tokens', list.status === 200 && list.data.projects.every((p) => p.proxyToken));

  // --- #6 IDOR
  check('pin of org B cannot be resolved via own project', (await call('PATCH', `/api/projects/${PA._id}/pins/${pinB._id}`, { user: ownerA, body: { status: 'resolved' } })).status === 404);
  check('pin of org B cannot be deleted via own project', (await call('DELETE', `/api/projects/${PA._id}/pins/${pinB._id}`, { user: ownerA })).status === 404);
  check('pin still exists', !!(await Pin.findById(pinB._id)));
  check('comments of org B pin are not readable', (await call('GET', `/api/pins/${pinB._id}/comments`, { user: ownerA })).status === 403);
  check('cannot comment on org B pin', (await call('POST', `/api/pins/${pinB._id}/comments`, { user: memberA, body: { body: 'hi' } })).status === 403);
  check('own pin update still works', (await call('PATCH', `/api/projects/${PA._id}/pins/${pinA._id}`, { user: memberA, body: { status: 'resolved' } })).status === 200);

  // --- #2 XSS sanitization
  const xss = await call('POST', `/api/pins/${pinA._id}/comments`, { user: memberA, body: { body: '<p>ok <strong>b</strong><img src=x onerror="alert(1)"></p><script>alert(2)</script>' } });
  check('comment create works', xss.status === 201 || xss.status === 200, String(xss.status));
  const stored = await Comment.findOne({ pin: pinA._id }).sort({ createdAt: -1 });
  check('stored comment is sanitized', stored && !/onerror|<script|<img/i.test(stored.body) && /<strong>b<\/strong>/.test(stored.body), stored?.body);

  // --- dashboard counts (aggregation): PA has 1 resolved pin with 1 comment
  const dash = await call('GET', '/api/projects', { user: ownerA });
  const paCard = dash.data.projects.find((p) => p._id === String(PA._id));
  check('dashboard counts are correct', paCard && paCard.resolvedPinCount === 1 && paCard.openPinCount === 0 && paCard.commentCount === 1,
    paCard && `${paCard.openPinCount}/${paCard.resolvedPinCount}/${paCard.commentCount}`);

  // --- trial workspaces get Pro limits
  const { getLimitsForPlanAsync } = r('config/plans');
  // --- workspaces inside an organization
  const wsList = await call('GET', '/api/workspaces', { user: ownerA });
  const defaultWsA = wsList.data?.workspaces?.find((w) => w.isDefault);
  check('org gets a default workspace holding existing projects', wsList.status === 200 && defaultWsA && defaultWsA.projectCount === 1, JSON.stringify(wsList.data));
  check('members cannot create workspaces', (await call('POST', '/api/workspaces', { user: memberA, body: { name: 'Nope' } })).status === 403);
  const wsClient = await call('POST', '/api/workspaces', { user: adminA, body: { name: 'Client X' } });
  check('admin creates a workspace', wsClient.status === 201 && wsClient.data.workspace.name === 'Client X');
  check('duplicate workspace names are refused', (await call('POST', '/api/workspaces', { user: ownerA, body: { name: 'client x' } })).status === 400);
  const wsId = wsClient.data.workspace._id;
  const pInWs = await call('POST', '/api/projects', { user: ownerA, body: { name: 'In workspace', websiteUrl: 'https://example.net', workspace: wsId } });
  check('project is created in the chosen workspace', pInWs.status === 201 && String(pInWs.data.project.workspace) === wsId);
  const filtered = await call('GET', `/api/projects?workspace=${wsId}`, { user: ownerA });
  const filteredDefault = await call('GET', `/api/projects?workspace=${defaultWsA._id}`, { user: ownerA });
  check('projects filter by workspace (default includes legacy projects)', filtered.data.projects.length === 1 && filteredDefault.data.projects.some((p) => p._id === String(PA._id)) && !filteredDefault.data.projects.some((p) => p._id === pInWs.data.project._id));
  check('org B cannot see or delete org A workspaces', !(await call('GET', '/api/workspaces', { user: ownerB })).data.workspaces.some((w) => w._id === wsId) && (await call('DELETE', `/api/workspaces/${wsId}`, { user: ownerB })).status === 404);
  const otherOrgWs = (await call('GET', '/api/workspaces', { user: ownerB })).data.workspaces[0]._id;
  check('a project cannot be moved into another org\'s workspace', (await call('PATCH', `/api/projects/${PA._id}`, { user: ownerA, body: { workspace: otherOrgWs } })).status === 400);
  // workspace members see every project in the workspace
  const wsMember = await mkUser('wsMemberA', 'member', { organization: orgA._id });
  const wsProjId = pInWs.data.project._id;
  check('non-member cannot open a workspace project', (await call('GET', `/api/projects/${wsProjId}`, { user: wsMember })).status === 403);
  check('workspace members must belong to the organization', (await call('PUT', `/api/workspaces/${wsId}/members`, { user: ownerA, body: { userIds: [String(ownerB._id)] } })).status === 400);
  const setMembers = await call('PUT', `/api/workspaces/${wsId}/members`, { user: ownerA, body: { userIds: [String(wsMember._id)] } });
  const memberList = await call('GET', '/api/projects', { user: wsMember });
  check('workspace member sees its projects', setMembers.status === 200 && (await call('GET', `/api/projects/${wsProjId}`, { user: wsMember })).status === 200
    && memberList.data.projects.some((p) => p._id === wsProjId) && !memberList.data.projects.some((p) => p._id === String(PA._id)));
  check('workspace member can comment on its projects', (await call('POST', `/api/projects/${wsProjId}/pins`, { user: wsMember, body: { pageUrl: 'https://example.net/', xPercent: 5, yPercent: 5 } })).status === 201);

  // access levels (view < comment < manage), inherited from the workspace
  const setLevel = (level) => call('PUT', `/api/workspaces/${wsId}/members`, { user: ownerA, body: { members: [{ userId: String(wsMember._id), level }] } });
  await setLevel('view');
  check('view level can read but not pin', (await call('GET', `/api/projects/${wsProjId}`, { user: wsMember })).data?.access === 'view'
    && (await call('POST', `/api/projects/${wsProjId}/pins`, { user: wsMember, body: { pageUrl: 'https://example.net/', xPercent: 6, yPercent: 6 } })).status === 403);
  check('comment level cannot manage the project', (await setLevel('comment')).status === 200
    && (await call('PATCH', `/api/projects/${wsProjId}`, { user: wsMember, body: { name: 'Renamed by member' } })).status === 403);
  await setLevel('manage');
  const mgrProject = await call('POST', '/api/projects', { user: wsMember, body: { name: 'Made by manager', websiteUrl: 'https://example.net/m', workspace: wsId } });
  check('workspace managers manage its projects and can create new ones', (await call('PATCH', `/api/projects/${wsProjId}`, { user: wsMember, body: { name: 'In workspace' } })).status === 200
    && mgrProject.status === 201 && (await call('POST', '/api/projects', { user: wsMember, body: { name: 'Elsewhere', websiteUrl: 'https://example.net/e' } })).status === 403);
  check('workspace managers cannot rename or delete the workspace', (await call('PATCH', `/api/workspaces/${wsId}`, { user: wsMember, body: { name: 'Nope' } })).status === 403);
  const guestUser = await mkUser('wsGuestA', 'guest', { organization: orgA._id });
  const capped = await call('PUT', `/api/workspaces/${wsId}/members`, { user: ownerA, body: { members: [{ userId: String(wsMember._id), level: 'manage' }, { userId: String(guestUser._id), level: 'manage' }] } });
  check('guests are capped at comment', capped.data?.members?.find((m) => m._id === String(guestUser._id))?.level === 'comment');
  // project-level access overrides for one project
  const paView = await call('PATCH', `/api/projects/${PA._id}/members/${memberA._id}/access`, { user: ownerA, body: { level: 'view' } });
  check('project access level applies', paView.status === 200
    && (await call('POST', `/api/projects/${PA._id}/pins`, { user: memberA, body: { pageUrl: 'https://example.com/', xPercent: 7, yPercent: 7 } })).status === 403);
  await call('PATCH', `/api/projects/${PA._id}/members/${memberA._id}/access`, { user: ownerA, body: { level: 'comment' } });
  check('members cannot change project access', (await call('PATCH', `/api/projects/${PA._id}/members/${memberA._id}/access`, { user: memberA, body: { level: 'manage' } })).status === 403);
  // organization roles are set on the Team page, not by project actions
  check('admins change organization roles', (await call('PATCH', `/api/workspaces/people/${guestUser._id}/role`, { user: adminA, body: { role: 'member' } })).status === 200
    && (await call('PATCH', `/api/workspaces/people/${ownerA._id}/role`, { user: adminA, body: { role: 'member' } })).status === 403
    && (await call('PATCH', `/api/workspaces/people/${guestUser._id}/role`, { user: memberA, body: { role: 'admin' } })).status === 403);
  await r('utils/cascade').deleteProjectCascade(await Project.findById(mgrProject.data.project._id));

  // one review link for the whole workspace
  const wsShare = await call('POST', `/api/workspaces/${wsId}/share`, { user: adminA, body: {} });
  const wsTok = wsShare.data?.shareSettings?.token;
  const portal = await call('GET', `/api/guest/workspace/${wsTok}`);
  const entry = portal.data?.projects?.[0];
  check('workspace link lists its projects', wsShare.status === 200 && portal.status === 200 && portal.data.projects.length === 1 && entry._id === wsProjId, JSON.stringify(portal.data));
  check('project opens through the workspace link', (await call('GET', `/api/guest/${entry.shareToken}`)).status === 200 && (await call('GET', `/api/guest/${entry.shareToken}/pins`)).status === 200);
  check('workspace link does not reach projects of other workspaces', (await call('GET', `/api/guest/${wsTok}.${PA._id}`)).status === 404);
  check('guest proxy accepts projects shared through their workspace', await r('utils/sharing').isProjectShared(await Project.findById(wsProjId)));
  await call('PATCH', `/api/workspaces/${wsId}/share`, { user: adminA, body: { password: 's3cret' } });
  const locked = await call('GET', `/api/guest/workspace/${wsTok}`);
  const unlocked = await call('GET', `/api/guest/workspace/${wsTok}?password=s3cret`);
  const wgh = { 'X-Guest-Access': unlocked.data?.guestAccessToken };
  check('workspace link password protects every project', locked.status === 401 && (await call('GET', `/api/guest/${entry.shareToken}/pins`)).status === 401
    && unlocked.status === 200 && (await call('GET', `/api/guest/${entry.shareToken}/pins`, { headers: wgh })).status === 200);
  await call('DELETE', `/api/workspaces/${wsId}/share`, { user: adminA });
  check('turned-off workspace link stops working', (await call('GET', `/api/guest/workspace/${wsTok}`)).status === 404 && (await call('GET', `/api/guest/${entry.shareToken}`)).status === 404);

  // invite people to a workspace
  const inviteeExisting = await mkUser('wsInviteeA', 'member', { organization: orgA._id });
  const wsInv = await call('POST', `/api/workspaces/${wsId}/invitations`, { user: ownerA, body: { emails: ['newclient@e2e.test', 'wsinviteea@e2e.test', 'ownerb@e2e.test'], role: 'member' } });
  const byEmail = Object.fromEntries((wsInv.data?.results || []).map((x) => [x.email, x.status]));
  check('workspace invite: new email invited, org user added, other org refused',
    wsInv.status === 201 && byEmail['newclient@e2e.test'] === 'invited' && byEmail['wsinviteea@e2e.test'] === 'added' && byEmail['ownerb@e2e.test'] === 'error', JSON.stringify(wsInv.data));
  check('added org user sees the workspace project', (await call('GET', `/api/projects/${wsProjId}`, { user: inviteeExisting })).status === 200);
  check('members cannot invite to workspaces', (await call('POST', `/api/workspaces/${wsId}/invitations`, { user: memberA, body: { emails: ['x@e2e.test'] } })).status === 403);
  const wsInvite = await Invitation.findOne({ email: 'newclient@e2e.test', workspace: wsId });
  const pendingList = await call('GET', `/api/workspaces/${wsId}/invitations`, { user: adminA });
  check('pending workspace invitations are listed without tokens', pendingList.data?.invitations?.length === 1 && !pendingList.data.invitations[0].token);
  const inviteInfo = await call('GET', `/api/invitations/${wsInvite.token}`);
  check('invitation page names the workspace', inviteInfo.status === 200 && /Client X/.test(inviteInfo.data.invitation.projectName));
  const signupRes = await call('POST', '/api/auth/signup', { body: { name: 'New Client', email: 'newclient@e2e.test', password: 'Str0ng!Passw0rd', invitationToken: wsInvite.token } });
  const newClient = await User.findOne({ email: 'newclient@e2e.test' });
  check('accepting a workspace invitation joins the org and the workspace',
    signupRes.status === 201 && signupRes.data.invitedWorkspaceId === wsId && String(newClient.organization) === String(orgA._id)
      && (await call('GET', `/api/projects/${wsProjId}`, { user: newClient })).status === 200, JSON.stringify(signupRes.data?.message || signupRes.status));
  const recipients = await r('utils/notifier').getRecipients(wsProjId, ownerA._id);
  check('workspace members get project notifications', recipients.some((u) => String(u._id) === String(newClient._id)));

  // plan limit on workspaces
  await Organization.updateOne({ _id: orgB._id }, { $set: { 'limitOverrides.maxWorkspaces': 1 } });
  const overLimit = await call('POST', '/api/workspaces', { user: ownerB, body: { name: 'Second' } });
  check('workspace limit is enforced', overLimit.status === 403 && overLimit.data.code === 'WORKSPACE_LIMIT', JSON.stringify(overLimit.data));
  await Organization.updateOne({ _id: orgB._id }, { $unset: { 'limitOverrides.maxWorkspaces': 1 } });

  check('the default workspace cannot be deleted', (await call('DELETE', `/api/workspaces/${defaultWsA._id}`, { user: ownerA })).status === 400);
  const delWs = await call('DELETE', `/api/workspaces/${wsId}`, { user: ownerA });
  const movedProject = await Project.findById(pInWs.data.project._id);
  check('deleting a workspace keeps its projects in the default one', delWs.status === 200 && String(movedProject.workspace) === String(defaultWsA._id));
  await r('utils/cascade').deleteProjectCascade(movedProject);

  check('trial gets Pro limits', (await getLimitsForPlanAsync('trial')).hasVersionHistory === true);

  // --- invite cannot rewrite another org's user role
  const inv = await call('POST', `/api/projects/${PA._id}/members`, { user: ownerA, body: { email: 'ownerB@e2e.test', role: 'guest' } });
  const ownerBAfter = await User.findById(ownerB._id);
  check('inviting org B owner does not change their role', ownerBAfter.role === 'owner', `status ${inv.status}, role ${ownerBAfter.role}`);

  // --- invitation cancel
  const invitation = await Invitation.create({ email: 'new@e2e.test', project: PA._id, organization: orgA._id, invitedBy: ownerA._id, role: 'member', token: 't'.repeat(64) });
  check('org B owner cannot cancel org A invitation', (await call('DELETE', `/api/invitations/${invitation._id}`, { user: ownerB })).status === 403);
  const invList = await call('GET', `/api/projects/${PA._id}/invitations`, { user: ownerA });
  check('invitation list hides tokens', invList.status === 200 && invList.data.invitations.every((i) => !i.token));
  check('only managers see pending project invitations', (await call('GET', `/api/projects/${PA._id}/invitations`, { user: memberA })).status === 403);
  check('org A owner can cancel', (await call('DELETE', `/api/invitations/${invitation._id}`, { user: ownerA })).status === 200);

  // --- guest share links
  const bcrypt = require('bcryptjs');
  PA.shareSettings = { enabled: true, token: 'sharetokenA', allowComments: true, passwordHash: await bcrypt.hash('pw123', 4) };
  await PA.save();
  check('guest pins require password token', (await call('GET', '/api/guest/sharetokenA/pins')).status === 401);
  const gp = await call('GET', '/api/guest/sharetokenA?password=pw123');
  check('correct password returns guest access token', gp.status === 200 && !!gp.data.guestAccessToken);
  const gh = { 'X-Guest-Access': gp.data.guestAccessToken };
  const gpins = await call('GET', '/api/guest/sharetokenA/pins', { headers: gh });
  check('guest pins load with access token', gpins.status === 200);
  check('guest pins do not expose member emails', gpins.status === 200 && !JSON.stringify(gpins.data).includes('@e2e.test'));
  await Pin.updateOne({ project: PA._id }, { $set: { context: { browser: 'Chrome 1', os: 'Linux', timeZone: 'Europe/Berlin', consoleErrors: [{ level: 'error', message: 'secret stack' }] } } });
  const gpinsCtx = await call('GET', '/api/guest/sharetokenA/pins', { headers: gh });
  check('guest pins carry no technical details', gpinsCtx.status === 200 && gpinsCtx.data?.pins?.length > 0 && gpinsCtx.data.pins.every((p) => p.context === undefined), JSON.stringify(gpinsCtx.data?.pins?.[0]?.context));
  check('guest cannot read another project\'s pin comments', (await call('GET', `/api/guest/sharetokenA/pins/${pinB._id}/comments`, { headers: gh })).status === 404);
  const gpin = await call('POST', '/api/guest/sharetokenA/pins', { headers: gh, body: { guestName: 'G', guestEmail: 'g@x.io', pageUrl: 'https://example.com/', xPercent: 2, yPercent: 2 } });
  check('guest can create pin with token', gpin.status === 201, String(gpin.status));
  PA.shareSettings.passwordHash = await bcrypt.hash('changed', 4); await PA.save();
  check('password change revokes guest token', (await call('GET', '/api/guest/sharetokenA/pins', { headers: gh })).status === 401);
  PA.shareSettings.passwordHash = undefined; PA.shareSettings.expiresAt = new Date(Date.now() - 1000); await PA.save();
  check('expired share link blocked on pins', (await call('GET', '/api/guest/sharetokenA/pins')).status === 410);

  // --- #3 proxy SSRF
  const forged = { Cookie: '__markup_proxy_ctx=' + encodeURIComponent(JSON.stringify({ guest: true })) };
  check('forged guest cookie cannot reach metadata IP', (await call('GET', `/api/proxy?url=${encodeURIComponent('http://169.254.169.254/')}&projectId=${PB._id}`, { headers: forged })).status === 403);
  check('forged guest cookie on unshared project is refused', (await call('GET', `/api/proxy?url=${encodeURIComponent('https://example.org/')}&projectId=${PB._id}`, { headers: forged })).status === 403);

  // --- billing: /upgrade
  const up = await call('POST', '/api/billing/upgrade', { user: ownerA, body: { plan: 'pro' } });
  check('trial org cannot get Pro without paying', up.status === 402, String(up.status));
  orgA.isLocked = true; orgA.lockedReason = 'Payment overdue'; orgA.plan = 'starter'; await orgA.save();
  check('locked org cannot self-unlock via /upgrade', (await call('POST', '/api/billing/upgrade', { user: ownerA, body: { plan: 'starter' } })).status === 402);

  // --- billing: settleInvoice concurrency + renewal period
  orgA.isLocked = false; orgA.lockedReason = null; orgA.plan = 'trial'; orgA.subscription = {}; await orgA.save();
  const inv1 = await Invoice.create({ organization: orgA._id, plan: 'pro', amount: 2900, currency: 'USD', status: 'pending', provider: 'paypal' });
  const [s1, s2] = await Promise.all([settleInvoice(inv1._id, {}), settleInvoice(inv1._id, {})]);
  const applied = [s1, s2].filter((s) => s.ok && !s.alreadyPaid).length;
  check('concurrent settles apply exactly once', applied === 1, `applied=${applied}`);
  const orgAfter = await Organization.findById(orgA._id);
  const end1 = new Date(orgAfter.subscription.currentPeriodEnd);
  const days1 = Math.round((end1 - Date.now()) / 864e5);
  check('checkout settle grants ~1 month', orgAfter.plan === 'pro' && days1 >= 27 && days1 <= 31, `${days1} days`);

  const renewal = await Invoice.create({ organization: orgA._id, plan: 'pro', amount: 2900, currency: 'USD', status: 'pending', provider: 'paypal', billingMonth: '2099-01', dueAt: new Date(Date.now() + 9e8) });
  await settleInvoice(renewal._id, {});
  const orgAfter2 = await Organization.findById(orgA._id);
  check('paying a renewal invoice does not extend the period again', +new Date(orgAfter2.subscription.currentPeriodEnd) === +end1);

  const stale = await Invoice.create({ organization: orgA._id, plan: 'pro', amount: 2900, currency: 'USD', status: 'pending', provider: 'paypal', billingMonth: '2099-02', dueAt: new Date(Date.now() - 1000) });
  orgAfter2.plan = 'free'; await orgAfter2.save();
  const { runBilling } = r('scripts/runBilling');
  await runBilling();
  const staleAfter = await Invoice.findById(stale._id);
  const orgAfter3 = await Organization.findById(orgA._id);
  check('cron voids overdue invoice of org that moved to free (no lock)', staleAfter.status === 'void' && !orgAfter3.isLocked, `${staleAfter.status}, locked=${orgAfter3.isLocked}`);

  // --- Phase 2B/C: invoices, GST, receipts, cancel, refunds, admin tools
  process.env.SELLER_GSTIN = '27AAPFU0939F1ZV';
  process.env.SELLER_STATE = 'Maharashtra';
  process.env.SELLER_LEGAL_NAME = 'Test Seller Pvt Ltd';
  const billOwner = await mkUser('billowner', 'owner');
  const billOrg = await Organization.create({ name: 'Bill Co', slug: 'bill-co-e2e', owner: billOwner._id, plan: 'trial', trialEndsAt: new Date(Date.now() + 9e8),
    billingDetails: { legalName: 'Bill Co LLP', state: 'Maharashtra', country: 'India', taxId: '27AAACB1234C1Z5' } });
  billOwner.organization = billOrg._id; await billOwner.save({ validateBeforeSave: false });

  const inrInv = await Invoice.create({ organization: billOrg._id, plan: 'starter', amount: 100800, currency: 'INR', status: 'pending', provider: 'razorpay' });
  await settleInvoice(inrInv._id, { providerPaymentId: 'pay_e2e_1' });
  const settled = await Invoice.findById(inrInv._id);
  check('paid invoice gets a sequential number', /^INV-\d{4}-\d{6}$/.test(settled.invoiceNumber || ''), settled.invoiceNumber);
  const t = settled.tax || {};
  check('intra-state GST split is CGST+SGST and adds up', t.cgst > 0 && t.sgst > 0 && t.igst === 0 && t.taxable + t.cgst + t.sgst === settled.amount, JSON.stringify(t));
  check('invoice snapshots buyer GSTIN', settled.buyer && settled.buyer.taxId === '27AAACB1234C1Z5');
  await new Promise((res) => setTimeout(res, 300));
  check('receipt email sent on payment', sentMail.some((m) => m.startsWith('sendPaymentReceiptEmail')));
  const pdf = await fetch(`${base}/api/billing/invoices/${inrInv._id}/pdf`, { headers: { Authorization: `Bearer ${tok(billOwner)}` } });
  const pdfBuf = Buffer.from(await pdf.arrayBuffer());
  check('invoice PDF downloads', pdf.status === 200 && pdfBuf.slice(0, 4).toString() === '%PDF', `${pdf.status} ${pdfBuf.length}b`);

  // cancel → keeps plan, then ends at period end
  const cancel = await call('POST', '/api/billing/cancel', { user: billOwner });
  const afterCancel = await Organization.findById(billOrg._id);
  check('cancel keeps plan until period end', cancel.status === 200 && afterCancel.plan === 'starter' && afterCancel.subscription.cancelAtPeriodEnd === true, String(cancel.status));
  check('resume undoes cancel', (await call('POST', '/api/billing/resume', { user: billOwner })).status === 200 && !(await Organization.findById(billOrg._id)).subscription.cancelAtPeriodEnd);
  // unpaid renewal at cancel time is voided and its month taken back off
  const periodBefore = new Date((await Organization.findById(billOrg._id)).subscription.currentPeriodEnd);
  const renewal2 = await Invoice.create({ organization: billOrg._id, plan: 'starter', amount: 100800, currency: 'INR', status: 'pending', provider: 'razorpay', billingMonth: '2099-05', dueAt: new Date(Date.now() + 9e8) });
  await call('POST', '/api/billing/cancel', { user: billOwner });
  const afterCancel2 = await Organization.findById(billOrg._id);
  check('cancel voids unpaid renewal and rolls period back a month',
    (await Invoice.findById(renewal2._id)).status === 'void' && new Date(afterCancel2.subscription.currentPeriodEnd) < periodBefore);
  afterCancel2.subscription.currentPeriodEnd = new Date(Date.now() - 1000); await afterCancel2.save();
  await runBilling();
  const ended = await Organization.findById(billOrg._id);
  check('cancelled plan moves to free when the period ends', ended.plan === 'free' && ended.subscription.status === 'canceled', `${ended.plan}/${ended.subscription.status}`);

  // refund of the current period revokes the plan
  const { applyRefund } = r('payments/refundInvoice');
  ended.plan = 'pro'; ended.subscription.currentPeriodEnd = new Date(Date.now() + 20 * 864e5); ended.subscription.status = 'active'; await ended.save();
  const proInv = await Invoice.create({ organization: billOrg._id, plan: 'pro', amount: 2900, currency: 'USD', status: 'paid', provider: 'paypal', paypalCaptureId: 'cap_e2e', periodStart: new Date(), periodEnd: new Date(Date.now() + 20 * 864e5) });
  const partial = await applyRefund(proInv, 1000);
  check('partial refund is recorded without revoking', partial.full === false && (await Organization.findById(billOrg._id)).plan === 'pro');
  const full = await applyRefund(await Invoice.findById(proInv._id), 2900);
  check('full refund of current period moves org to free', full.downgraded === true && (await Organization.findById(billOrg._id)).plan === 'free' && (await Invoice.findById(proInv._id)).status === 'refunded');
  check('refund is idempotent', (await applyRefund(await Invoice.findById(proInv._id), 2900)).alreadyApplied === true);

  // billing details validation
  check('invalid Indian GSTIN rejected', (await call('PUT', '/api/billing/details', { user: billOwner, body: { country: 'India', taxId: 'NOTAGSTIN' } })).status === 400);
  check('valid billing details saved', (await call('PUT', '/api/billing/details', { user: billOwner, body: { legalName: 'Bill Co LLP', country: 'India', state: 'Karnataka', taxId: '29AAACB1234C1Z5' } })).status === 200);

  // admin tools: admin panel accounts are AdminUser, with their own sessions
  const AdminUser = r('models/AdminUser');
  const { signAdminToken } = r('utils/adminSession');
  const mkAdmin = (name, extra = {}) => AdminUser.create({ name, email: `${name}@admin.e2e.test`, passwordHash: 'a-long-test-password', status: 'active', sessionToken: `${name}-s`, twoFactor: { enabled: true }, ...extra });
  const adminOne = await mkAdmin('adminone');
  const adminToken = signAdminToken(adminOne);
  // `call(..., { user: superadmin })` signs a customer token; admin calls pass the admin token instead
  const superadmin = { _adminToken: adminToken };
  const adminCall = (method, url, opts = {}) => call(method, url, { ...opts, user: undefined, token: adminToken });
  check('customer token cannot open the admin API', [401, 403].includes((await call('GET', '/api/admin/stats', { user: billOwner })).status));
  check('admin token cannot open the customer API', (await call('GET', '/api/auth/me', { token: adminToken })).status === 401);
  const no2fa = await mkAdmin('notwofactor', { twoFactor: { enabled: false } });
  const no2faStats = await call('GET', '/api/admin/stats', { token: signAdminToken(no2fa) });
  check('admin without 2FA is sent to set it up', no2faStats.status === 403 && no2faStats.data?.code === 'TWO_FACTOR_SETUP_REQUIRED', String(no2faStats.status));
  check('admin without 2FA can still reach their account', (await call('GET', '/api/admin-auth/2fa', { token: signAdminToken(no2fa) })).status === 200);
  const invite = await adminCall('POST', '/api/admin/admins', { body: { name: 'New Admin', email: 'newadmin@admin.e2e.test' } });
  check('admins can invite another admin', invite.status === 201 && invite.data?.admin?.status === 'invited' && sentMail.some((m) => m.startsWith('sendAdminInviteEmail')));
  check('an admin cannot remove themselves', (await adminCall('DELETE', `/api/admin/admins/${adminOne._id}`)).status === 400);
  await adminCall('PATCH', `/api/admin/admins/${no2fa._id}`, { body: { status: 'disabled' } });
  check('a disabled admin is signed out', (await call('GET', '/api/admin-auth/me', { token: signAdminToken(no2fa) })).status === 401);
  const loginAsInvited = await call('POST', '/api/admin-auth/login', { body: { email: 'newadmin@admin.e2e.test', password: 'anything-at-all' } });
  check('an invited admin cannot sign in before setting a password', loginAsInvited.status === 401, String(loginAsInvited.status) + ' ' + JSON.stringify(loginAsInvited.data));
  const setPlan = await call('PATCH', `/api/admin/organizations/${billOrg._id}/plan`, { user: superadmin, body: { plan: 'enterprise' } });
  check('admin can set enterprise plan', setPlan.status === 200 && (await Organization.findById(billOrg._id)).plan === 'enterprise', String(setPlan.status));
  await call('PATCH', `/api/admin/organizations/${billOrg._id}/plan`, { user: superadmin, body: { plan: 'starter' } });
  await call('PATCH', `/api/admin/organizations/${billOrg._id}/limits`, { user: superadmin, body: { maxProjects: 77, hasVersionHistory: true } });
  const planView = await call('GET', '/api/billing/plan', { user: billOwner });
  check('per-org limit overrides apply', planView.data?.limits?.maxProjects === 77 && planView.data?.limits?.hasVersionHistory === true, JSON.stringify(planView.data?.limits));
  check('non-admin cannot use admin tools', [401, 403].includes((await call('PATCH', `/api/admin/organizations/${billOrg._id}/plan`, { user: billOwner, body: { plan: 'pro' } })).status));
  await call('PATCH', `/api/admin/organizations/${billOrg._id}/plan`, { user: superadmin, body: { plan: 'trial' } });
  const trialBefore = new Date((await Organization.findById(billOrg._id)).trialEndsAt);
  await call('POST', `/api/admin/organizations/${billOrg._id}/extend-trial`, { user: superadmin, body: { days: 10 } });
  const trialAfter = new Date((await Organization.findById(billOrg._id)).trialEndsAt);
  check('admin can extend a trial', Math.round((trialAfter - trialBefore) / 864e5) === 10);

  // INR price
  const { getPlansWithOverrides } = r('config/plans');
  check('Razorpay INR price derived from USD by default', (await getPlansWithOverrides()).starter.priceInr === 12 * 84);

  // --- Phase 2D: plan limits everywhere
  const limOwner = await mkUser('limowner', 'owner');
  const limMember = await mkUser('limmember', 'member');
  const limGuest = await mkUser('limguest', 'guest');
  const limOrg = await Organization.create({ name: 'Lim Co', slug: 'lim-co-e2e', owner: limOwner._id, plan: 'trial', trialEndsAt: new Date(Date.now() + 9e8),
    limitOverrides: { maxMembers: 2, maxGuests: 1, maxStorageMB: 1 } });
  for (const u of [limOwner, limMember, limGuest]) { u.organization = limOrg._id; await u.save({ validateBeforeSave: false }); }
  const limProject = await Project.create({ name: 'LP', projectType: 'website', websiteUrl: 'https://example.com', owner: limOwner._id, organization: limOrg._id, members: [limOwner._id, limMember._id, limGuest._id] });
  // owner + member = 2 seats → full (the owner counts, as on the billing page)
  check('member limit counts the owner', (await call('POST', `/api/projects/${limProject._id}/members`, { user: limOwner, body: { email: 'new1@e2e.test', role: 'member' } })).status === 403);
  await Organization.updateOne({ _id: limOrg._id }, { $set: { 'limitOverrides.maxMembers': 3 } });
  check('invite within the limit succeeds', (await call('POST', `/api/projects/${limProject._id}/members`, { user: limOwner, body: { email: 'new1@e2e.test', role: 'member' } })).status === 201);
  check('pending invitations count toward the limit', (await call('POST', `/api/projects/${limProject._id}/members`, { user: limOwner, body: { email: 'new2@e2e.test', role: 'member' } })).status === 403);
  check('promoting a guest to member needs a free seat', (await call('PATCH', `/api/projects/${limProject._id}/members/${limGuest._id}/role`, { user: limOwner, body: { role: 'member' } })).status === 403);

  // storage quota (1 MB): oversized upload rejected and its file removed, small one counted
  const fsMod = require('fs'); const pathMod = require('path');
  const uploadsDir = pathMod.join(__dirname, '..', 'uploads', 'documents');
  const filesBefore = new Set(fsMod.readdirSync(uploadsDir));
  const uploadDoc = async (bytes) => {
    const fd = new FormData();
    fd.append('name', `Doc ${bytes}`); fd.append('projectType', 'document');
    fd.append('documents', new Blob([Buffer.alloc(bytes, 1)], { type: 'image/png' }), 'shot.png');
    const r2 = await fetch(`${base}/api/projects`, { method: 'POST', headers: { Authorization: `Bearer ${tok(limOwner)}` }, body: fd });
    return r2.status;
  };
  const big = await uploadDoc(1.5 * 1024 * 1024);
  await new Promise((res) => setTimeout(res, 200));
  const leftover = fsMod.readdirSync(uploadsDir).filter((f) => !filesBefore.has(f));
  check('upload over the storage quota is rejected and removed', big === 403 && leftover.length === 0, `${big}, leftover ${leftover.length}`);
  const small = await uploadDoc(100 * 1024);
  const usedAfter = (await Organization.findById(limOrg._id)).storageUsedBytes;
  check('upload within quota succeeds and is counted', small === 201 && usedAfter === 100 * 1024, `${small}, used ${usedAfter}`);
  const createdDoc = await Project.findOne({ organization: limOrg._id, projectType: 'document' });
  if (createdDoc) for (const d of createdDoc.documents) fsMod.unlink(pathMod.join(__dirname, '..', d.path), () => {});

  // share links are a paid-plan feature; guests can't write to a locked org
  limOrg.plan = 'free'; await limOrg.save();
  check('free plan cannot create share links', (await call('POST', `/api/projects/${limProject._id}/share`, { user: limOwner, body: {} })).status === 403);
  limProject.shareSettings = { enabled: true, token: 'sharetokenLim', allowComments: true }; await limProject.save();
  await Organization.updateOne({ _id: limOrg._id }, { $set: { isLocked: true, lockedReason: 'Trial expired' } });
  const lockedGuest = await call('POST', '/api/guest/sharetokenLim/pins', { body: { guestName: 'G', guestEmail: 'g@x.io', pageUrl: 'https://example.com/', xPercent: 1, yPercent: 1 } });
  check('guests cannot write to a locked org', lockedGuest.status === 403, String(lockedGuest.status));
  check('guests can still view a locked org review', (await call('GET', '/api/guest/sharetokenLim/pins')).status === 200);

  // integrations stop after a downgrade
  const http = require('http'); let hooks = 0;
  const hookSrv = http.createServer((q, s2) => { hooks++; s2.end('ok'); }).listen(0);
  const Integration = r('models/Integration');
  await Integration.create({ organization: limOrg._id, type: 'slack', enabled: true, config: { webhookUrl: `http://127.0.0.1:${hookSrv.address().port}/hook` }, createdBy: limOwner._id });
  const { notifyIntegrations } = r('utils/notifier');
  await notifyIntegrations(limProject._id, limOrg._id, { action: 'pin.created', projectName: 'LP', pinNumber: 1, actorName: 'X', link: 'http://x' });
  check('integrations do not fire on a plan without them', hooks === 0);
  await Organization.updateOne({ _id: limOrg._id }, { $set: { plan: 'pro', isLocked: false } });
  await notifyIntegrations(limProject._id, limOrg._id, { action: 'pin.created', projectName: 'LP', pinNumber: 1, actorName: 'X', link: 'http://x' });
  check('integrations fire on a plan with them', hooks === 1, `hooks=${hooks}`);
  hookSrv.close();

  // --- Phase 2E: deletion cascades, export, workspace deletion, unsubscribe, retention
  const Version = r('models/Version'); const Activity = r('models/Activity'); const Notification = r('models/Notification');
  const gdOwner = await mkUser('gdowner', 'owner');
  const gdOrg = await Organization.create({ name: 'GD Co', slug: 'gd-co-e2e', owner: gdOwner._id, plan: 'trial', trialEndsAt: new Date(Date.now() + 9e8), storageUsedBytes: 5000 });
  gdOwner.organization = gdOrg._id; await gdOwner.save({ validateBeforeSave: false });
  const gdProject = await Project.create({ name: 'GDP', projectType: 'website', websiteUrl: 'https://example.com', owner: gdOwner._id, organization: gdOrg._id, members: [gdOwner._id],
    shareSettings: { enabled: true, token: 'gd-share-secret', allowComments: true } });
  const attName = `e2e-${Date.now()}.txt`;
  const attPath = pathMod.join(__dirname, '..', 'uploads', 'documents', attName);
  fsMod.writeFileSync(attPath, 'x'.repeat(5000));
  const gdPin = await Pin.create({ project: gdProject._id, pageUrl: 'https://example.com/', xPercent: 1, yPercent: 1, pinNumber: 1, createdBy: gdOwner._id });
  await Comment.create({ pin: gdPin._id, author: gdOwner._id, body: 'hi', attachments: [{ filename: attName, path: `uploads/documents/${attName}`, size: 5000 }] });
  await Version.create({ project: gdProject._id, name: 'v1', versionNumber: 1, createdBy: gdOwner._id }).catch(() => {});
  await Activity.create({ project: gdProject._id, organization: gdOrg._id, user: gdOwner._id, action: 'pin.created' }).catch(() => {});

  const exp = await call('GET', '/api/auth/organization/export', { user: gdOwner });
  check('workspace export includes projects, pins and comments', exp.status === 200 && exp.data.projects.length === 1 && exp.data.pins.length === 1 && exp.data.comments.length === 1);
  check('workspace export omits share credentials', !JSON.stringify(exp.data).includes('gd-share-secret'));

  const gdDel = await call('DELETE', `/api/projects/${gdProject._id}`, { user: gdOwner });
  check('project delete succeeds', gdDel.status === 200, gdDel.status + ' ' + JSON.stringify(gdDel.data));
  await new Promise((res) => setTimeout(res, 200));
  check('project delete removes pins, comments, versions and activity',
    !(await Pin.exists({ project: gdProject._id })) && !(await Comment.exists({ pin: gdPin._id })) && !(await Version.exists({ project: gdProject._id })) && !(await Activity.exists({ project: gdProject._id })));
  check('project delete removes uploaded files', !fsMod.existsSync(attPath));
  check('project delete releases storage quota', (await Organization.findById(gdOrg._id)).storageUsedBytes === 0);

  check('workspace deletion needs the password', (await call('POST', '/api/auth/organization/delete', { user: gdOwner, body: { password: 'wrong', confirmName: 'GD Co' } })).status === 401);
  const delReq = await call('POST', '/api/auth/organization/delete', { user: gdOwner, body: { password: 'x'.repeat(60), confirmName: 'GD Co' } });
  const scheduled = await Organization.findById(gdOrg._id);
  check('workspace deletion is scheduled and locks the workspace', delReq.status === 200 && !!scheduled.deletionScheduledAt && scheduled.isLocked, String(delReq.status));
  await call('POST', '/api/auth/organization/cancel-deletion', { user: gdOwner });
  const cancelled = await Organization.findById(gdOrg._id);
  check('cancelling deletion unlocks the workspace', !cancelled.deletionScheduledAt && !cancelled.isLocked);
  await call('POST', '/api/auth/organization/delete', { user: gdOwner, body: { password: 'x'.repeat(60), confirmName: 'GD Co' } });
  await Invoice.create({ organization: gdOrg._id, plan: 'pro', amount: 2900, currency: 'USD', status: 'paid', provider: 'paypal' });
  await Organization.updateOne({ _id: gdOrg._id }, { $set: { deletionScheduledAt: new Date(Date.now() - 1000) } });
  await runBilling();
  check('workspace and its users are purged after the grace period', !(await Organization.exists({ _id: gdOrg._id })) && !(await User.exists({ _id: gdOwner._id })));
  check('invoices are kept after workspace deletion', !!(await Invoice.exists({ organization: gdOrg._id })));

  // unsubscribe
  const { unsubscribeUrl } = r('utils/unsubscribe');
  const unsubPath = new URL(unsubscribeUrl('memberA@e2e.test')).pathname + new URL(unsubscribeUrl('memberA@e2e.test')).search;
  const unsubGet = await fetch(base + unsubPath);
  check('unsubscribe link shows a confirmation page without changing anything', unsubGet.status === 200 && (await User.findById(memberA._id)).emailNotificationsEnabled !== false);
  const unsubPost = await fetch(base + unsubPath, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'List-Unsubscribe=One-Click' });
  check('one-click unsubscribe turns notification emails off', unsubPost.status === 200 && (await User.findById(memberA._id)).emailNotificationsEnabled === false);
  check('forged unsubscribe token rejected', (await fetch(`${base}/api/email/unsubscribe?token=bogus`, { method: 'POST' })).status === 400);

  // retention
  const oldNote = await Notification.create({ recipient: ownerA._id, project: PA._id, type: 'comment', message: 'old', createdAt: new Date(Date.now() - 200 * 864e5) }).catch((e) => ({ err: e.message }));
  await runBilling();
  check('notifications older than 180 days are purged', !oldNote._id || !(await Notification.exists({ _id: oldNote._id })), oldNote.err || '');

  // --- Phase 2F: remaining security items
  const cookieOnly = await fetch(`${base}/api/auth/profile`, { method: 'PATCH', headers: { Cookie: `markup_token=${tok(memberA)}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Hacked' }) });
  check('cookie-authenticated profile change without CSRF token is refused', cookieOnly.status === 403, String(cookieOnly.status));
  check('Bearer-authenticated profile change still works', (await call('PATCH', '/api/auth/profile', { user: memberA, body: { name: 'Member A' } })).status === 200);
  const resetStatuses = [];
  for (let i = 0; i < 4; i++) resetStatuses.push((await call('POST', '/api/auth/forgot-password', { body: { email: 'victim@e2e.test' } })).status);
  check('password reset emails are limited per address', resetStatuses[3] === 429 && resetStatuses[0] !== 429, resetStatuses.join(','));
  const shortPw = await call('POST', '/api/auth/signup', { body: { name: 'S', email: 'short@e2e.test', password: '1234567' } });
  check('passwords shorter than 8 characters are rejected', shortPw.status === 400 && /8/.test(shortPw.data?.message || ''), shortPw.data?.message);

  const IntegrationModel = r('models/Integration');
  const jira = await IntegrationModel.create({ organization: billOrg._id, type: 'jira', enabled: true, createdBy: billOwner._id,
    config: { domain: 'acme.atlassian.net', email: 'j@acme.io', apiToken: 'supersecrettoken1234', projectKey: 'ACM' } });
  const listInt = await call('GET', '/api/integrations', { user: billOwner });
  const shown = listInt.data?.integrations?.find((i) => i._id === String(jira._id));
  check('Jira API token is masked in responses', shown && shown.config.apiToken === '••••1234' && !JSON.stringify(listInt.data).includes('supersecrettoken'), shown?.config?.apiToken);
  await call('PATCH', `/api/integrations/${jira._id}`, { user: billOwner, body: { config: { ...shown.config } } });
  check('saving the form with the masked token keeps the real token', (await IntegrationModel.findById(jira._id)).config.apiToken === 'supersecrettoken1234');

  // --- trial reminders + expiry lock (emails captured, not sent)
  const trialMail = () => sentMail.filter((m) => m.startsWith('sendTrial'));
  const mkTrial = async (name, days) => {
    const u = await User.create({ name, email: `${name}@e2e.test`, passwordHash: 'x'.repeat(60), role: 'owner' });
    const o = await Organization.create({ name, slug: `${name}-e2e`, owner: u._id, plan: 'trial', trialEndsAt: new Date(Date.now() + days * 864e5) });
    u.organization = o._id; await u.save({ validateBeforeSave: false });
    return o;
  };
  await mkTrial('TrialSix', 6.5); await mkTrial('TrialGone', -1); await mkTrial('TrialFar', 20);
  await runBilling(); const firstRun = trialMail().length;
  await runBilling();
  check('trial reminder + expiry emails sent once', firstRun === 2 && trialMail().length === 2, trialMail().join(','));
  check('expired trial is locked', (await Organization.findOne({ name: 'TrialGone' })).isLocked === true);
  check('trial far from expiry untouched', !(await Organization.findOne({ name: 'TrialFar' })).trialReminders.day7Sent);

  // --- website contact form
  process.env.SUPPORT_EMAIL = 'support@e2e.test';
  const supportMail = () => sentMail.filter((m) => m.startsWith('sendSupportRequest:'));
  const goodMsg = { name: 'Visitor', email: 'visitor@e2e.test', topic: 'Billing', message: 'Can I pay yearly for the Pro plan?' };
  const sentOk = await call('POST', '/api/support/contact', { body: goodMsg });
  check('contact form sends the message to the support inbox', sentOk.status === 201 && supportMail().length === 1, `${sentOk.status}`);
  const badMsg = await call('POST', '/api/support/contact', { body: { ...goodMsg, email: 'nope' } });
  const botMsg = await call('POST', '/api/support/contact', { body: { ...goodMsg, website: 'http://spam' } });
  check('contact form rejects invalid input and silently drops bots', badMsg.status === 400 && botMsg.status === 200 && supportMail().length === 1);

  // --- Phase 1: admin panel sign-in, 2FA, passwords, data and team (regression)
  {
    const totp = r('utils/totp');
    const { migrateLegacyAdmins } = r('utils/migrateAdmins');
    // Each sign-in check gets its own client IP so the per-IP auth limiter
    // doesn't trip on the deliberate failures below
    let ipCounter = 0;
    const authCall = (method, url, { token, body } = {}) => call(method, url, { token, body, headers: { 'X-Forwarded-For': `10.77.0.${++ipCounter % 250}` } });
    const lastMail = (name) => [...sentMailArgs].reverse().find((m) => m.name === name);
    const PW = 'correct-horse-battery';
    const flowAdmin = await AdminUser.create({ name: 'Flow Admin', email: 'flow@admin.e2e.test', passwordHash: PW, status: 'active' });

    // sign-in without 2FA
    check('admin sign-in refuses a wrong password', (await authCall('POST', '/api/admin-auth/login', { body: { email: 'flow@admin.e2e.test', password: 'wrong-password-123' } })).status === 401);
    let res = await authCall('POST', '/api/admin-auth/login', { body: { email: 'FLOW@admin.e2e.test', password: PW } });
    check('admin sign-in works (email case-insensitive) and asks for 2FA setup', res.status === 200 && res.data?.token && res.data?.setupTwoFactor === true, String(res.status));
    let token = res.data?.token;
    check('admin API is closed until 2FA is on', (await authCall('GET', '/api/admin/stats', { token })).data?.code === 'TWO_FACTOR_SETUP_REQUIRED');

    // 2FA setup
    check('2FA setup needs the password', (await authCall('POST', '/api/admin-auth/2fa/setup', { token, body: { password: 'nope-nope-nope' } })).status === 400);
    res = await authCall('POST', '/api/admin-auth/2fa/setup', { token, body: { password: PW } });
    check('2FA setup returns a QR code and key', res.status === 200 && res.data?.qr?.startsWith('data:image/png') && res.data?.otpauthUrl?.startsWith('otpauth://totp/'));
    const secret = String(res.data?.secret || '').replace(/\s/g, '');
    check('2FA enable refuses a wrong code', (await authCall('POST', '/api/admin-auth/2fa/enable', { token, body: { code: '000000' } })).status === 400);
    const enableStep = totp.currentStep();
    res = await authCall('POST', '/api/admin-auth/2fa/enable', { token, body: { code: totp.codeForStep(secret, enableStep) } });
    check('2FA enable gives 10 recovery codes and a new session', res.status === 200 && res.data?.recoveryCodes?.length === 10 && res.data?.token && res.data.token !== token);
    const codes = res.data?.recoveryCodes || [];
    check('turning on 2FA ends the old session', (await authCall('GET', '/api/admin-auth/me', { token })).status === 401);
    token = res.data?.token;
    check('admin API opens once 2FA is on', (await authCall('GET', '/api/admin/stats', { token })).status === 200);
    const stored = await AdminUser.findById(flowAdmin._id).select('+twoFactor.secret +twoFactor.recoveryCodes').lean();
    check('2FA secret is stored encrypted and codes hashed', stored.twoFactor.secret.startsWith('v1.') && !stored.twoFactor.secret.includes(secret) && !stored.twoFactor.recoveryCodes.includes(codes[0]));

    // sign-in with 2FA
    res = await authCall('POST', '/api/admin-auth/login', { body: { email: 'flow@admin.e2e.test', password: PW } });
    check('password alone gives only a challenge', res.data?.twoFactorRequired === true && !res.data?.token && res.data?.challengeToken);
    const challenge = res.data?.challengeToken;
    check('a challenge is not a session', (await authCall('GET', '/api/admin-auth/me', { token: challenge })).status === 401);
    check('wrong code is refused', (await authCall('POST', '/api/admin-auth/login/2fa', { body: { challengeToken: challenge, code: '123456' } })).status === 401);
    check('a used code cannot be replayed', (await authCall('POST', '/api/admin-auth/login/2fa', { body: { challengeToken: challenge, code: totp.codeForStep(secret, enableStep) } })).status === 401);
    res = await authCall('POST', '/api/admin-auth/login/2fa', { body: { challengeToken: challenge, code: codes[0].toLowerCase() } });
    check('a recovery code signs in (any case)', res.status === 200 && res.data?.token);
    token = res.data?.token;
    check('a recovery code works only once', (await authCall('POST', '/api/admin-auth/login/2fa', { body: { challengeToken: challenge, code: codes[0] } })).status === 401);
    check('9 recovery codes left', (await authCall('GET', '/api/admin-auth/2fa', { token })).data?.recoveryCodesLeft === 9);
    check('2FA cannot be turned off while it is required', (await authCall('POST', '/api/admin-auth/2fa/disable', { token, body: { password: PW, code: codes[1] } })).status === 400);
    check('a customer 2FA challenge key cannot finish admin sign-in', (await authCall('POST', '/api/admin-auth/login/2fa', { body: { challengeToken: r('utils/twoFactor').issueChallenge({ _id: flowAdmin._id, passwordHash: 'x' }, 'customer'), code: '123456' } })).status === 401);
    res = await authCall('POST', '/api/admin-auth/2fa/recovery-codes', { token, body: { password: PW, code: codes[1] } });
    check('new recovery codes replace the old ones', res.status === 200 && res.data?.recoveryCodes?.length === 10);
    check('old recovery codes stop working', (await authCall('POST', '/api/admin-auth/2fa/recovery-codes', { token, body: { password: PW, code: codes[2] } })).status === 400);

    // passwords
    check('wrong current password is a 400, not a sign-out', (await authCall('PATCH', '/api/admin-auth/password', { token, body: { currentPassword: 'wrong-wrong-wrong', newPassword: 'another-long-password' } })).status === 400);
    check('admin passwords need 12+ characters', (await authCall('PATCH', '/api/admin-auth/password', { token, body: { currentPassword: PW, newPassword: 'short-pw' } })).status === 400);
    const PW2 = 'a-brand-new-long-password';
    res = await authCall('PATCH', '/api/admin-auth/password', { token, body: { currentPassword: PW, newPassword: PW2 } });
    check('password change keeps this device signed in', res.status === 200 && res.data?.token);
    check('password change ends the previous session', (await authCall('GET', '/api/admin-auth/me', { token })).status === 401);
    token = res.data?.token;
    check('forgot password answers the same for unknown emails', (await authCall('POST', '/api/admin-auth/forgot-password', { body: { email: 'nobody@admin.e2e.test' } })).status === 200);
    await authCall('POST', '/api/admin-auth/forgot-password', { body: { email: 'flow@admin.e2e.test' } });
    const resetMail = lastMail('sendPasswordResetEmail');
    const resetUrl = String(resetMail?.args?.[0] || '');
    check('admin reset link points to the admin app and lasts 30 minutes', resetUrl.includes('/reset-password/') && resetMail?.args?.[1] === '30 minutes', resetUrl.replace(/[a-f0-9]{64}/, '<token>'));
    const resetToken = resetUrl.split('/reset-password/')[1];
    check('reset refuses a short password', (await authCall('POST', `/api/admin-auth/reset-password/${resetToken}`, { body: { password: 'short' } })).status === 400);
    check('reset with the emailed link works', (await authCall('POST', `/api/admin-auth/reset-password/${resetToken}`, { body: { password: 'reset-to-a-long-password' } })).status === 200);
    check('a reset link works only once', (await authCall('POST', `/api/admin-auth/reset-password/${resetToken}`, { body: { password: 'reset-to-a-long-password' } })).status === 400);
    check('reset signs out every session', (await authCall('GET', '/api/admin-auth/me', { token })).status === 401);
    check('2FA stays on after a reset', (await authCall('POST', '/api/admin-auth/login', { body: { email: 'flow@admin.e2e.test', password: 'reset-to-a-long-password' } })).data?.twoFactorRequired === true);

    // invite → set password → sign in
    const inviteRes = await adminCall('POST', '/api/admin/admins', { body: { name: 'Invited Person', email: 'invited@admin.e2e.test' } });
    const inviteUrl = String(lastMail('sendAdminInviteEmail')?.args?.[0]?.setPasswordUrl || '');
    check('invite email carries a set-password link', inviteRes.status === 201 && inviteUrl.includes('/reset-password/') && inviteUrl.endsWith('?invite=1'));
    check('inviting an existing admin email is refused', (await adminCall('POST', '/api/admin/admins', { body: { name: 'Dup', email: 'INVITED@admin.e2e.test' } })).status === 400);
    const inviteToken = inviteUrl.split('/reset-password/')[1].split('?')[0];
    check('invited admin sets a password with the link', (await authCall('POST', `/api/admin-auth/reset-password/${inviteToken}`, { body: { password: 'invited-long-password' } })).data?.invited === true);
    res = await authCall('POST', '/api/admin-auth/login', { body: { email: 'invited@admin.e2e.test', password: 'invited-long-password' } });
    check('invited admin can then sign in and is asked to set up 2FA', res.status === 200 && res.data?.setupTwoFactor === true);
    const invitedId = inviteRes.data?.admin?.id;
    check('resending an invite to someone who set a password is refused', (await adminCall('POST', `/api/admin/admins/${invitedId}/resend`)).status === 400);
    check('an admin cannot reset their own 2FA from the team page', (await adminCall('POST', `/api/admin/admins/${adminOne._id}/reset-2fa`)).status === 400);
    check('an admin cannot disable themselves', (await adminCall('PATCH', `/api/admin/admins/${adminOne._id}`, { body: { status: 'disabled' } })).status === 400);
    check('another admin can be removed', (await adminCall('DELETE', `/api/admin/admins/${invitedId}`)).status === 200);
    const team = await adminCall('GET', '/api/admin/admins');
    check('team list marks you and hides secrets', team.data?.admins?.some((a) => a.isYou) && !JSON.stringify(team.data).includes('passwordHash') && !JSON.stringify(team.data).includes('secret'));

    // logout
    res = await authCall('POST', '/api/admin-auth/login', { body: { email: 'adminone@admin.e2e.test', password: 'a-long-test-password' } });
    check('sign-in with 2FA on returns a challenge for seeded admins too', res.data?.twoFactorRequired === true);
    const logoutAdmin = await AdminUser.create({ name: 'Logout', email: 'logout@admin.e2e.test', passwordHash: PW, status: 'active' });
    const logoutToken = (await authCall('POST', '/api/admin-auth/login', { body: { email: 'logout@admin.e2e.test', password: PW } })).data?.token;
    await authCall('POST', '/api/admin-auth/logout', { token: logoutToken });
    check('logout ends the session on the server', (await authCall('GET', '/api/admin-auth/me', { token: logoutToken })).status === 401);
    await AdminUser.deleteOne({ _id: logoutAdmin._id });

    // legacy superadmins move into AdminUser
    const bcrypt = require('bcryptjs');
    const legacy = await User.collection.insertOne({ name: 'Legacy Admin', email: 'legacy@admin.e2e.test', role: 'superadmin', passwordHash: await bcrypt.hash('legacy-long-password', 4), organization: null, createdAt: new Date() });
    await r('models/Activity').create({ organization: billOrg._id, actor: legacy.insertedId, action: 'org.locked', metadata: { actorRole: 'superadmin' } });
    await migrateLegacyAdmins();
    await migrateLegacyAdmins(); // idempotent
    const moved = await AdminUser.findOne({ email: 'legacy@admin.e2e.test' });
    check('legacy superadmin moved to AdminUser and removed from users', !!moved && moved.status === 'active' && !(await User.exists({ _id: legacy.insertedId })));
    check('legacy admin keeps their password', (await authCall('POST', '/api/admin-auth/login', { body: { email: 'legacy@admin.e2e.test', password: 'legacy-long-password' } })).status === 200);
    check('legacy admin actions point to the new account', !!(await r('models/Activity').exists({ adminActor: moved._id, action: 'org.locked' })));

    // admin data endpoints
    const stats = await adminCall('GET', '/api/admin/stats');
    check('overview returns KPIs, attention lists and recent actions', ['mrr', 'payingOrgs', 'activeTrials', 'activeOrgs7d', 'unpaidInvoices'].every((k) => k in (stats.data?.kpis || {})) && Array.isArray(stats.data?.attention?.trialsEnding) && Array.isArray(stats.data?.recentAdminActions));
    const byOwner = await adminCall('GET', `/api/admin/organizations?search=${encodeURIComponent('billowner@e2e')}`);
    check('organization search matches the owner email', byOwner.data?.organizations?.some((o) => String(o._id) === String(billOrg._id)));
    check('organization search escapes regex characters', (await adminCall('GET', '/api/admin/organizations?search=' + encodeURIComponent('(.*'))).status === 200);
    // Every status filter returns exactly the orgs whose row shows that status
    let filtersMatch = true;
    for (const st of ['trial', 'trial_ending', 'paying', 'free', 'cancelling', 'locked', 'deleting']) {
      const list = await adminCall('GET', `/api/admin/organizations?status=${st}&limit=100`);
      if (!list.data?.organizations?.every((o) => o.status === st)) { filtersMatch = false; console.log('  mismatch for', st, list.data?.organizations?.map((o) => o.status)); }
    }
    check('each status filter matches the status shown on the rows', filtersMatch);
    const evilOrg = await Organization.create({ name: '=HYPERLINK("http://evil")', slug: 'evil-e2e', owner: ownerA._id, plan: 'free' });
    const csv = await fetch(`${base}/api/admin/organizations?format=csv&search=HYPERLINK`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const csvText = await csv.text();
    check('CSV export is a spreadsheet-safe file', csv.headers.get('content-type')?.includes('text/csv') && csvText.startsWith('"Organization"') && csvText.includes(`"'=HYPERLINK`));
    await Organization.deleteOne({ _id: evilOrg._id });
    const detail = await adminCall('GET', `/api/admin/organizations/${orgA._id}`);
    check('organization page returns usage, limits, engagement, workspaces and notes', ['usage', 'limits', 'engagement', 'workspaces', 'notes', 'activity', 'invoices', 'status'].every((k) => k in (detail.data || {})));
    check('unknown organization is a 404', (await adminCall('GET', `/api/admin/organizations/${new mongoose.Types.ObjectId()}`)).status === 404);

    // notes
    check('empty note refused', (await adminCall('POST', `/api/admin/organizations/${orgA._id}/notes`, { body: { body: '   ' } })).status === 400);
    const note = await adminCall('POST', `/api/admin/organizations/${orgA._id}/notes`, { body: { body: 'Agreed a custom deal' } });
    check('admin can add a note', note.status === 201 && note.data?.note?.author?.name === 'adminone');
    const noteId = note.data?.note?._id;
    check('a note cannot be edited through another organization', (await adminCall('PATCH', `/api/admin/organizations/${orgB._id}/notes/${noteId}`, { body: { pinned: true } })).status === 404);
    check('admin can pin a note', (await adminCall('PATCH', `/api/admin/organizations/${orgA._id}/notes/${noteId}`, { body: { pinned: true } })).data?.note?.pinned === true);
    const exportA = await call('GET', '/api/auth/organization/export', { user: ownerA });
    check('customers never see admin notes', exportA.status === 200 && !JSON.stringify(exportA.data).includes('Agreed a custom deal'));
    check('admin can delete a note', (await adminCall('DELETE', `/api/admin/organizations/${orgA._id}/notes/${noteId}`)).status === 200);

    // lock / unlock and the action log
    await adminCall('PATCH', `/api/admin/organizations/${orgB._id}/lock`, { body: { reason: 'Regression test' } });
    const lockedWrite = await call('POST', '/api/projects', { user: ownerB, body: { name: 'blocked', projectType: 'website', websiteUrl: 'https://example.com' } });
    check('a locked organization cannot create projects', lockedWrite.status === 403 && lockedWrite.data?.code === 'ORG_LOCKED', String(lockedWrite.status));
    await adminCall('PATCH', `/api/admin/organizations/${orgB._id}/unlock`);
    check('unlock lifts the lock', (await Organization.findById(orgB._id)).isLocked === false);
    const audit = await adminCall('GET', '/api/admin/audit?limit=50');
    const lockEntry = audit.data?.entries?.find((e) => e.action === 'org.locked' && String(e.organization?._id) === String(orgB._id));
    check('the action log names the admin who acted', lockEntry?.adminActor?.name === 'adminone' && lockEntry?.metadata?.reason === 'Regression test');
    check('the action log includes team changes', audit.data?.entries?.some((e) => e.action === 'admin.invited'));
  }

  // --- Phase 2: support by plan
  {
    process.env.SUPPORT_EMAIL = 'support@e2e.test';
    const SupportTicket = r('models/SupportTicket');
    const Notification = r('models/Notification');
    const lastMail = (name) => [...sentMailArgs].reverse().find((m) => m.name === name);
    const ticketBody = (extra = {}) => ({ subject: 'Pins do not save', category: 'bug', body: 'When I click Post nothing happens on the pricing page.', context: JSON.stringify({ url: 'https://app.test/project/1?token=secret#x', viewport: '1440x900' }), ...extra });

    // a trial organization of its own (earlier tests change Org A's plan)
    const supOwner = await mkUser('supowner', 'owner');
    const supAdmin = await mkUser('supadmin', 'admin');
    const supMember = await mkUser('supmember', 'member');
    const supOrg = await Organization.create({ name: 'Support Co', slug: 'support-co-e2e', owner: supOwner._id, plan: 'trial', trialEndsAt: new Date(Date.now() + 9e8) });
    for (const u of [supOwner, supAdmin, supMember]) { u.organization = supOrg._id; await u.save({ validateBeforeSave: false }); }

    // plan rules
    const freeOwner = await mkUser('freeowner', 'owner');
    const freeOrg = await Organization.create({ name: 'Free Co', slug: 'free-co-e2e', owner: freeOwner._id, plan: 'free', subscription: { status: 'active' } });
    freeOwner.organization = freeOrg._id; await freeOwner.save({ validateBeforeSave: false });
    const freeTry = await call('POST', '/api/support/tickets', { user: freeOwner, body: ticketBody() });
    check('free plan cannot open in-app requests', freeTry.status === 403 && freeTry.data?.code === 'FEATURE_NOT_AVAILABLE', String(freeTry.status));
    const me = await call('GET', '/api/auth/me', { user: freeOwner });
    check('session data tells the app which support the plan has', me.data?.user?.orgSupport?.tickets === false);
    const guestUser = await mkUser('guestsupport', 'guest', { organization: supOrg._id });
    check('guest reviewers cannot open requests', (await call('POST', '/api/support/tickets', { user: guestUser, body: ticketBody() })).status === 403);
    check('a request needs a subject and details', (await call('POST', '/api/support/tickets', { user: supMember, body: ticketBody({ subject: 'x', body: 'short' }) })).status === 400);

    // create (trial = Pro rules: high priority, 24 h)
    const created = await call('POST', '/api/support/tickets', { user: supMember, body: ticketBody() });
    const t = created.data?.ticket;
    check('a trial member can open a request', created.status === 201 && t?.number > 1000 && t?.status === 'open', String(created.status));
    const stored = await SupportTicket.findById(t?._id).lean();
    check('priority and reply target come from the plan', stored?.priority === 'high' && Math.round((stored.dueAt - stored.createdAt) / 36e5) === 24);
    check('page URLs are stored without query strings', stored?.context?.url === 'https://app.test/project/1');
    const teamMail = lastMail('sendSupportTicketToTeam');
    check('the support inbox gets an email with a link to the admin panel', teamMail?.to === 'support@e2e.test' && teamMail?.args?.[0]?.ticketUrl?.includes(`/support/${t?._id}`) && teamMail.args[0].priority === 'high');

    // who can see it
    const created2 = await call('POST', '/api/support/tickets', { user: supAdmin, body: ticketBody({ subject: 'Billing question' }) });
    const memberList = await call('GET', '/api/support/tickets', { user: supMember });
    check('members see only their own requests', memberList.data?.tickets?.length === 1 && String(memberList.data.tickets[0]._id) === String(t?._id));
    const adminList = await call('GET', '/api/support/tickets', { user: supAdmin });
    check('owners and admins see every request of the organization', adminList.data?.tickets?.length === 2);
    check('a member cannot open a colleague\'s request', (await call('GET', `/api/support/tickets/${created2.data?.ticket?._id}`, { user: supMember })).status === 404);
    check('another organization cannot open the request', (await call('GET', `/api/support/tickets/${t?._id}`, { user: ownerB })).status === 404);

    // admin inbox
    const inbox = await adminCall('GET', '/api/admin/support/tickets?view=open');
    check('the admin inbox lists open requests with the organization', inbox.data?.tickets?.some((x) => String(x._id) === String(t?._id) && x.organization?.name === 'Support Co'));
    const stats = await adminCall('GET', '/api/admin/support/stats');
    check('support stats count open and unassigned requests', stats.data?.open >= 2 && stats.data?.unassigned >= 2);
    check('a customer token cannot read the admin inbox', [401, 403].includes((await call('GET', '/api/admin/support/tickets', { user: supOwner })).status));
    const adminView = await adminCall('GET', `/api/admin/support/tickets/${t?._id}`);
    check('the admin view includes the customer context', adminView.status === 200 && 'openPins' in (adminView.data?.customer || {}) && Array.isArray(adminView.data?.admins));

    // internal note, then a reply
    await adminCall('POST', `/api/admin/support/tickets/${t?._id}/messages`, { body: { body: 'Customer is on a slow network, check proxy logs', internal: true } });
    let view = await call('GET', `/api/support/tickets/${t?._id}`, { user: supMember });
    check('internal notes never reach the customer', !JSON.stringify(view.data).includes('slow network'));
    check('an internal note does not count as our first reply', !(await SupportTicket.findById(t?._id).lean()).firstResponseAt);
    const reply = await adminCall('POST', `/api/admin/support/tickets/${t?._id}/messages`, { body: { body: 'Thanks, we fixed it. Can you try again?' } });
    check('a reply waits on the customer and records the first response', reply.data?.ticket?.status === 'waiting_on_customer' && !!reply.data?.ticket?.firstResponseAt);
    const replyMail = lastMail('sendSupportReplyEmail');
    check('the customer gets the reply by email with a link into the app', replyMail?.to === 'supmember@e2e.test' && replyMail?.args?.[0]?.ticketUrl?.includes(`/dashboard?support=${t?._id}`) && replyMail.args[0].resolved === false);
    const notif = await Notification.findOne({ recipient: supMember._id, type: 'support_reply' }).lean();
    check('the customer gets an in-app notification', notif?.metadata?.ticketId === String(t?._id) && notif.project === null);
    view = await call('GET', '/api/support/tickets', { user: supMember });
    check('the reply shows as unread until opened', view.data?.tickets?.[0]?.unread === true);
    view = await call('GET', `/api/support/tickets/${t?._id}`, { user: supMember });
    check('admin names show as "First (Kommently)" to customers', view.data?.ticket?.messages?.some((m) => m.authorType === 'admin' && m.authorName === 'adminone (Kommently)'));
    check('opening it marks the reply read', (await call('GET', '/api/support/tickets', { user: supMember })).data?.tickets?.[0]?.unread === false);
    const custReply = await call('POST', `/api/support/tickets/${t?._id}/messages`, { user: supMember, body: { body: 'Still broken on Safari' } });
    check('a customer reply reopens the request', custReply.status === 201 && custReply.data?.ticket?.status === 'open' && lastMail('sendSupportTicketToTeam')?.args?.[0]?.isReply === true);

    // assign, priority, resolve
    check('requests can only be assigned to active admins', (await adminCall('PATCH', `/api/admin/support/tickets/${t?._id}`, { body: { assignee: String(new mongoose.Types.ObjectId()) } })).status === 400);
    const upd = await adminCall('PATCH', `/api/admin/support/tickets/${t?._id}`, { body: { priority: 'urgent', assignee: String(adminOne._id) } });
    check('admins can change priority and assignee', upd.data?.ticket?.priority === 'urgent' && upd.data?.ticket?.priorityRank === 0 && upd.data?.ticket?.assignee?.name === 'adminone');
    const urgentFirst = await adminCall('GET', '/api/admin/support/tickets?view=open');
    check('urgent requests come first in the inbox', String(urgentFirst.data?.tickets?.[0]?._id) === String(t?._id));
    await adminCall('PATCH', `/api/admin/support/tickets/${t?._id}`, { body: { status: 'resolved' } });
    check('resolving emails the customer once', lastMail('sendSupportReplyEmail')?.args?.[0]?.resolved === true);
    check('resolving is in the action log', !!(await r('models/Activity').exists({ action: 'support.resolved', organization: supOrg._id })));
    check('search finds a request by number', (await adminCall('GET', `/api/admin/support/tickets?view=all&search=%23${t?.number}`)).data?.tickets?.length === 1);

    // overdue + overview
    await SupportTicket.updateOne({ _id: created2.data?.ticket?._id }, { $set: { dueAt: new Date(Date.now() - 3600e3) } });
    const overview = await adminCall('GET', '/api/admin/stats');
    check('the overview shows open and overdue requests', overview.data?.kpis?.openTickets >= 1 && overview.data?.kpis?.overdueTickets >= 1 && overview.data?.attention?.overdueTickets?.length >= 1);
    check('the overdue filter lists late first replies', (await adminCall('GET', '/api/admin/support/tickets?overdue=1')).data?.tickets?.some((x) => String(x._id) === String(created2.data?.ticket?._id)));

    // customer closes, export, purge
    check('a customer can mark their request resolved', (await call('POST', `/api/support/tickets/${created2.data?.ticket?._id}/resolve`, { user: supAdmin })).data?.ticket?.status === 'resolved');
    const exp = await call('GET', '/api/auth/organization/export', { user: supOwner });
    check('the data export includes support requests without internal notes', exp.data?.supportRequests?.length === 2 && !JSON.stringify(exp.data).includes('slow network'));

    // launch fixes: reading, closed requests, attachments, deadlines, audit
    const memberTicketId = t?._id;
    await adminCall('POST', `/api/admin/support/tickets/${memberTicketId}/messages`, { body: { body: 'One more thing to check.' } });
    const beforeRead = await SupportTicket.findById(memberTicketId).lean();
    await call('GET', `/api/support/tickets/${memberTicketId}`, { user: supOwner });
    const afterOwnerRead = await SupportTicket.findById(memberTicketId).lean();
    check("an owner opening a member's request leaves it unread for the member", String(afterOwnerRead.customerLastReadAt) === String(beforeRead.customerLastReadAt));
    await call('GET', `/api/support/tickets/${memberTicketId}`, { user: supMember });
    const afterMemberRead = await SupportTicket.findById(memberTicketId).lean();
    check('reading a request marks it read without changing updatedAt', afterMemberRead.customerLastReadAt > beforeRead.customerLastReadAt && String(afterMemberRead.updatedAt) === String(beforeRead.updatedAt));
    await adminCall('PATCH', `/api/admin/support/tickets/${memberTicketId}`, { body: { status: 'closed' } });
    check('a customer cannot turn a closed request back into resolved', (await call('POST', `/api/support/tickets/${memberTicketId}/resolve`, { user: supMember })).status === 400 && (await SupportTicket.findById(memberTicketId).lean()).status === 'closed');
    check('a closed request takes no more customer replies', (await call('POST', `/api/support/tickets/${memberTicketId}/messages`, { user: supMember, body: { body: 'Hello again' } })).status === 400);
    const Activity = r('models/Activity');
    check('status, priority and assignee changes are in the action log', !!(await Activity.exists({ action: 'support.updated', organization: supOrg._id, 'metadata.changes.priority.to': 'urgent' })) && !!(await Activity.exists({ action: 'support.updated', 'metadata.changes.status.to': 'closed' })));
    check('a malformed assignee id is refused, not a server error', (await adminCall('PATCH', `/api/admin/support/tickets/${memberTicketId}`, { body: { assignee: 'not-an-id' } })).status === 400);
    const unanswered = created2.data?.ticket?._id;
    await adminCall('PATCH', `/api/admin/support/tickets/${unanswered}`, { body: { priority: 'urgent' } });
    const reprioritised = await SupportTicket.findById(unanswered).lean();
    check('changing the priority moves the reply deadline', Math.round((reprioritised.dueAt - reprioritised.createdAt) / 36e5) === 8);

    const uploadSupport = async (type, name, bytes = 1024) => {
      const fd = new FormData();
      fd.append('subject', 'With a file'); fd.append('category', 'bug'); fd.append('body', 'Please see the attached file for details.');
      fd.append('attachments', new Blob([Buffer.alloc(bytes, 1)], { type }), name);
      const res2 = await fetch(`${base}/api/support/tickets`, { method: 'POST', headers: { Authorization: `Bearer ${tok(supOwner)}` }, body: fd });
      return res2.status;
    };
    check('support attachments must be images or PDFs', (await uploadSupport('text/plain', 'notes.txt')) === 400);
    check('support attachments are capped at 5 MB', (await uploadSupport('image/png', 'big.png', 5.5 * 1024 * 1024)) === 400);
    check('a screenshot can be attached', (await uploadSupport('image/png', 'shot.png')) === 201);
    for (const tk of await SupportTicket.find({ organization: supOrg._id, subject: 'With a file' }).lean()) {
      for (const m of tk.messages) for (const a of m.attachments || []) require('fs').unlink(require('path').join(__dirname, '..', 'uploads', 'documents', a.filename), () => {});
    }

    const { getSupportForPlan } = r('config/plans');
    const expiredSupport = getSupportForPlan('trial', new Date(Date.now() - 864e5));
    check('an expired trial keeps in-app requests at Starter level, without chat', expiredSupport.tickets === true && expiredSupport.chat === false && expiredSupport.priority === 'normal' && getSupportForPlan('trial', new Date(Date.now() + 864e5)).priority === 'high');

    // per-organization support overrides (admin panel → Custom limits)
    check('a support override must use a known priority', (await adminCall('PATCH', `/api/admin/organizations/${freeOrg._id}/limits`, { body: { supportPriority: 'asap' } })).status === 400);
    await adminCall('PATCH', `/api/admin/organizations/${freeOrg._id}/limits`, { body: { supportTickets: true, supportPriority: 'urgent', supportReplyHours: 4 } });
    const freeMe = await call('GET', '/api/auth/me', { user: freeOwner });
    check('support overrides reach the app', freeMe.data?.user?.orgSupport?.tickets === true && freeMe.data.user.orgSupport.priority === 'urgent' && freeMe.data.user.orgSupport.chat === false);
    check('the app gets the support address from SUPPORT_EMAIL', freeMe.data?.user?.supportEmail === 'support@e2e.test');
    const freeTicket = await call('POST', '/api/support/tickets', { user: freeOwner, body: ticketBody() });
    const freeStored = await SupportTicket.findById(freeTicket.data?.ticket?._id).lean();
    check('a free organization with in-app support turned on can open a request', freeTicket.status === 201 && freeStored?.priority === 'urgent' && Math.round((freeStored.dueAt - freeStored.createdAt) / 36e5) === 4);
    await new Promise((res) => setTimeout(res, 200));
    const urgentAlert = lastMail('sendAdminAlertEmail');
    check('an urgent request emails the team an alert that opens the admin panel', urgentAlert?.to === 'support@e2e.test' && urgentAlert.args?.[0]?.link === `${process.env.ADMIN_URL || r('config/env').URLS.admin}/support/${freeTicket.data?.ticket?._id}`, JSON.stringify(urgentAlert?.args?.[0]?.link));
    const freeDetail = await adminCall('GET', `/api/admin/organizations/${freeOrg._id}`);
    check('the organization page shows the support it has and its plan\'s', freeDetail.data?.support?.tickets === true && freeDetail.data?.planSupport?.tickets === false && !('supportTickets' in (freeDetail.data?.limits || {})));

    // customer context on the admin request page
    const ctx = await adminCall('GET', `/api/admin/support/tickets/${freeTicket.data?.ticket?._id}`);
    check('the admin request page shows status, revenue and recent activity', ctx.data?.customer?.status === 'free' && ctx.data.customer.mrr === 0 && Array.isArray(ctx.data.customer.recentActivity) && ctx.data.customer.recentActivity.every((a) => a.metadata?.actorRole !== 'superadmin'));
    delete process.env.SUPPORT_EMAIL;
  }

  // --- Launch fixes for Phase 1: logs, action log, migration, admin lists, 2FA races
  {
    const { scrubUrl } = r('utils/logger');
    const scrubbed = ['/api/admin-auth/reset-password/SECRET1', '/api/auth/reset-password/SECRET2', '/api/guest/workspace/SECRET3', '/api/guest/SECRET4/pins', '/api/invitations/SECRET5'].map(scrubUrl);
    check('tokens in URL paths never reach the request log', scrubbed.every((u) => !u.includes('SECRET') && u.includes('[redacted]')), scrubbed.join(' '));

    const Activity = r('models/Activity');
    await adminCall('PATCH', '/api/admin/plans/starter', { body: { popular: false } });
    check('plan changes are in the action log', !!(await Activity.exists({ action: 'plan.updated', 'metadata.planId': 'starter', adminActor: adminOne._id })));
    await adminCall('PATCH', '/api/admin/plans/enterprise/toggle');
    await adminCall('PATCH', '/api/admin/plans/enterprise/toggle');
    check('turning a plan off and on is in the action log', (await Activity.countDocuments({ action: 'plan.toggled', 'metadata.planId': 'enterprise' })) === 2);
    const ps = await adminCall('GET', '/api/admin/payment-settings');
    await adminCall('PATCH', '/api/admin/payment-settings', { body: { allowDowngrades: !!ps.data?.allowDowngrades } });
    check('payment settings changes are in the action log', !!(await Activity.exists({ action: 'payment_settings.updated' })));

    const noteOrg = await Organization.findOne({ slug: 'support-co-e2e' });
    const note = await adminCall('POST', `/api/admin/organizations/${noteOrg._id}/notes`, { body: { body: 'Called them about the renewal.' } });
    await adminCall('DELETE', `/api/admin/organizations/${noteOrg._id}/notes/${note.data?.note?._id}`);
    check('adding and deleting notes is in the action log', !!(await Activity.exists({ action: 'org.note_added', organization: noteOrg._id })) && !!(await Activity.exists({ action: 'org.note_deleted', organization: noteOrg._id })));

    const old = new Date(Date.now() - 400 * 864e5);
    const [oldAdminEntry, oldCustomerEntry] = await Activity.create([
      { organization: noteOrg._id, adminActor: adminOne._id, action: 'org.locked', metadata: { actorRole: 'superadmin' }, createdAt: old },
      { organization: noteOrg._id, action: 'org.name_updated', createdAt: old },
    ]);
    await r('scripts/runBilling').phaseRetention();
    check('retention keeps the admin action log and clears old customer activity', !!(await Activity.exists({ _id: oldAdminEntry._id })) && !(await Activity.exists({ _id: oldCustomerEntry._id })));

    const csvAll = await fetch(`${base}/api/admin/organizations?format=csv`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const csvRows = (await csvAll.text()).trim().split('\n').length - 1;
    check('the CSV export lists every organization', csvRows === await Organization.countDocuments({}), `${csvRows} rows`);
    check('admin sign-in with an unknown email is refused like a wrong password', (await adminCall('POST', '/api/admin-auth/login', { body: { email: 'nobody@admin.e2e.test', password: 'whatever-long-pass' } })).status === 401);
    check('a malformed organization id is not found, not a server error', (await adminCall('GET', '/api/admin/organizations/not-an-id')).status === 404);
    check('a malformed admin id is not found', (await adminCall('POST', '/api/admin/admins/nope/resend')).status === 404);
    check('a malformed orgId filter is refused', (await adminCall('GET', '/api/admin/users?orgId=nope')).status === 400 && (await adminCall('GET', '/api/admin/audit?orgId=nope')).status === 400);

    // trial filter + search, trial-end sort
    const soonOwner = await mkUser('soonowner', 'owner');
    await Organization.create({ name: 'Support Soon', slug: 'support-soon-e2e', owner: soonOwner._id, plan: 'trial', trialEndsAt: new Date(Date.now() + 2 * 864e5) });
    const trialSearch = await adminCall('GET', '/api/admin/organizations?status=trial&search=Support&limit=100');
    const names = (trialSearch.data?.organizations || []).map((o) => o.name);
    check('searching within "Trial" keeps the trial filter', names.includes('Support Co') && !names.includes('Support Soon'), names.join(', '));
    const byTrialEnd = await adminCall('GET', '/api/admin/organizations?sort=trial_end&limit=100');
    const rows = byTrialEnd.data?.organizations || [];
    const firstNull = rows.findIndex((o) => !o.trialEndsAt);
    check('"Trial ends soonest" lists organizations without a trial end last', rows.length > 1 && !!rows[0].trialEndsAt && (firstNull === -1 || rows.slice(firstNull).every((o) => !o.trialEndsAt)) && rows[0].owner?.email !== undefined);
    const expiredOwner = await mkUser('expiredowner', 'owner');
    await Organization.create({ name: 'Expired Trial Co', slug: 'expired-trial-e2e', owner: expiredOwner._id, plan: 'trial', trialEndsAt: new Date(Date.now() - 864e5), isLocked: true, lockedReason: 'Trial expired' });
    const kpis = (await adminCall('GET', '/api/admin/stats')).data?.kpis;
    const runningTrials = await Organization.countDocuments({ plan: 'trial', isLocked: { $ne: true }, deletionScheduledAt: null, $or: [{ trialEndsAt: null }, { trialEndsAt: { $gt: new Date() } }] });
    check('"Active trials" leaves out expired, locked trials', kpis?.activeTrials === runningTrials && runningTrials < await Organization.countDocuments({ plan: 'trial' }));

    // a customer who had been promoted to superadmin keeps their account
    const promoted = await User.collection.insertOne({ name: 'Promoted Owner', email: 'promoted@e2e.test', role: 'superadmin', passwordHash: 'x', createdAt: new Date() });
    const promotedOrg = await Organization.create({ name: 'Promoted Co', slug: 'promoted-co-e2e', owner: promoted.insertedId, plan: 'free' });
    await User.collection.updateOne({ _id: promoted.insertedId }, { $set: { organization: promotedOrg._id } });
    await r('utils/migrateAdmins').migrateLegacyAdmins();
    const kept = await User.findById(promoted.insertedId).lean();
    check('the admin move keeps a promoted customer as the org owner', kept?.role === 'owner' && !!(await AdminUser.exists({ email: 'promoted@e2e.test' })));

    // the same 2FA code or recovery code can't pass twice at once
    const { seal } = r('utils/secretBox');
    const totp = r('utils/totp');
    const { generateRecoveryCodes, useSecondFactor, SECOND_FACTOR_FIELDS } = r('utils/twoFactor');
    const secret = totp.generateSecret();
    const { codes, hashes } = generateRecoveryCodes();
    const raceAdmin = await mkAdmin('raceadmin', { twoFactor: { enabled: true, secret: seal(secret), lastUsedStep: 0, recoveryCodes: hashes } });
    const load = () => AdminUser.findById(raceAdmin._id).select(SECOND_FACTOR_FIELDS);
    const code = totp.codeForStep(secret, totp.currentStep());
    const [a1, a2] = await Promise.all([load(), load()]);
    const totpResults = await Promise.all([useSecondFactor(AdminUser, a1, code), useSecondFactor(AdminUser, a2, code)]);
    check('one authenticator code works for only one of two parallel sign-ins', totpResults.filter(Boolean).length === 1, JSON.stringify(totpResults));
    const [b1, b2] = await Promise.all([load(), load()]);
    const recResults = await Promise.all([useSecondFactor(AdminUser, b1, codes[0]), useSecondFactor(AdminUser, b2, codes[0])]);
    check('one recovery code works for only one of two parallel sign-ins', recResults.filter(Boolean).length === 1 && (await load()).twoFactor.recoveryCodes.length === codes.length - 1, JSON.stringify(recResults));
  }

  // --- Launch fixes: plan prices survive the plan editor and the on/off toggle
  {
    const PlanConfig = r('models/PlanConfig');
    const { clearPlanCache } = r('config/plans');
    const priceOf = async (id) => (await call('GET', '/api/plans')).data?.plans?.[id]?.price;
    await PlanConfig.deleteMany({ planId: { $in: ['starter', 'pro'] } });
    clearPlanCache();
    await adminCall('PATCH', '/api/admin/plans/starter/toggle');
    await adminCall('PATCH', '/api/admin/plans/starter/toggle');
    check('turning a plan off and on keeps its price', (await priceOf('starter')) === 12, String(await priceOf('starter')));
    check('a plan row created by the toggle stores no price', (await PlanConfig.findOne({ planId: 'starter' }).lean())?.price === undefined);
    await PlanConfig.create({ planId: 'pro', price: null });
    clearPlanCache();
    check('a leftover empty price never turns Pro into "Custom"', (await priceOf('pro')) === 29, String(await priceOf('pro')));
    check('Starter and Pro cannot be saved without a price', (await adminCall('PATCH', '/api/admin/plans/starter', { body: { price: '' } })).status === 400);
    check('a negative price is refused', (await adminCall('PATCH', '/api/admin/plans/pro', { body: { price: -5 } })).status === 400);
    check('a negative limit is refused', (await adminCall('PATCH', '/api/admin/plans/starter', { body: { maxProjects: -1 } })).status === 400);
    await adminCall('PATCH', '/api/admin/plans/starter', { body: { maxProjects: '', name: 'Starter' } });
    check('an empty limit keeps the current one', (await call('GET', '/api/plans')).data?.plans?.starter?.limits?.maxProjects === 15);
    const custom = await adminCall('PATCH', '/api/admin/plans/enterprise', { body: { price: null } });
    check('enterprise can still be "Custom"', custom.status === 200 && custom.data?.plans?.enterprise?.price === null);
    // Price label follows the price; INR follows USD unless an admin set it
    await adminCall('PATCH', '/api/admin/plans/starter', { body: { price: 15, priceLabel: '$12' } });
    const st = (await call('GET', '/api/plans')).data?.plans?.starter;
    check('the Starter price label follows its price', st?.priceLabel === '$15', st?.priceLabel);
    check('the INR price follows a USD change unless set by an admin', st?.priceInrCustom === false && st?.priceInr === Math.round(15 * (Number(process.env.RAZORPAY_USD_INR_RATE) || 84)), `${st?.priceInr} custom=${st?.priceInrCustom}`);

    // Impact warning lists the organizations that go over a lower limit
    const impactOwner = await mkUser('impactowner', 'owner');
    const impactOrg = await Organization.create({ name: 'Impact Co', slug: 'impact-co-e2e', owner: impactOwner._id, plan: 'starter', subscription: { status: 'active' } });
    impactOwner.organization = impactOrg._id; await impactOwner.save({ validateBeforeSave: false });
    for (let i = 0; i < 3; i++) await Project.create({ name: `Impact ${i}`, projectType: 'website', websiteUrl: 'https://example.com', owner: impactOwner._id, organization: impactOrg._id });
    const impact = await adminCall('GET', '/api/admin/plans/starter/impact?maxProjects=2');
    check('lowering a limit warns with the organizations it affects', impact.data?.hasImpact === true && impact.data?.details?.some((d) => d.orgName === 'Impact Co' && d.limitKey === 'maxProjects' && d.currentUsage === 3 && d.proposedLimit === 2), JSON.stringify(impact.data?.details));

    // A disabled plan can't be bought; a custom deal must be above 0
    await adminCall('PATCH', '/api/admin/plans/pro/toggle');
    const buyDisabled = await call('POST', '/api/billing/checkout-session', { user: impactOwner, body: { plan: 'pro' } });
    check('a disabled plan cannot be bought', buyDisabled.status === 400 && buyDisabled.data?.code === 'PLAN_DISABLED', `${buyDisabled.status} ${buyDisabled.data?.code}`);
    check('a disabled plan cannot be switched to', (await call('POST', '/api/billing/upgrade', { user: impactOwner, body: { plan: 'pro' } })).data?.code === 'PLAN_DISABLED');
    await adminCall('PATCH', '/api/admin/plans/pro/toggle');
    check('a custom deal of 0 is refused', (await adminCall('PATCH', `/api/admin/organizations/${impactOrg._id}/deal`, { body: { price: 0, currency: 'USD' } })).status === 400);

    // Syncing trials to a new length never shortens a running trial
    const longOwner = await mkUser('longtrialowner', 'owner');
    const longEnd = new Date(Date.now() + 40 * 864e5);
    const longOrg = await Organization.create({ name: 'Long Trial Co', slug: 'long-trial-e2e', owner: longOwner._id, plan: 'trial', trialEndsAt: longEnd });
    await adminCall('PATCH', '/api/admin/trial-settings', { body: { defaultDays: 14, syncActiveTrials: true } });
    check('syncing trials never shortens a running trial', String((await Organization.findById(longOrg._id).lean()).trialEndsAt) === String(longEnd));
    // Trial length: 30 days by default (what the website promises); an old
    // automatic 14 nobody chose becomes 30, an admin's own choice is kept
    const PaymentSettings = r('models/PaymentSettings');
    await PaymentSettings.updateOne({ key: 'default' }, { $set: { 'trial.defaultDays': 14, 'trial.updatedBy': null } });
    check('an automatic 14-day trial setting becomes 30', (await PaymentSettings.getSingleton()).trial.defaultDays === 30);
    await PaymentSettings.updateOne({ key: 'default' }, { $set: { 'trial.defaultDays': 14, 'trial.updatedBy': adminOne._id } });
    check('a trial length an admin chose is kept', (await PaymentSettings.getSingleton()).trial.defaultDays === 14);
    await PaymentSettings.updateOne({ key: 'default' }, { $set: { 'trial.defaultDays': 30, 'trial.updatedBy': null } });
    r('config/plans').clearTrialCache?.();
    check('new signups get a 30-day trial', (await call('GET', '/api/plans')).data?.trialDays === 30);
    const concurrent = await Promise.all([PaymentSettings.getSingleton(), PaymentSettings.getSingleton(), PaymentSettings.getSingleton()]);
    check('payment settings are created once even when asked for at the same time', concurrent.every(Boolean) && (await PaymentSettings.countDocuments({ key: 'default' })) === 1);

    await PlanConfig.deleteMany({ planId: { $in: ['starter', 'pro', 'enterprise'] } });
    clearPlanCache();
  }

  // --- Feedback deadlines over the real API (client approvals were removed)
  {
    const revOwner = await mkUser('revowner', 'owner');
    const revMember = await mkUser('revmember', 'member');
    const revOrg = await Organization.create({ name: 'Review Co', slug: 'review-co-e2e', owner: revOwner._id, plan: 'trial', trialEndsAt: new Date(Date.now() + 9e8) });
    for (const u of [revOwner, revMember]) { u.organization = revOrg._id; await u.save({ validateBeforeSave: false }); }
    const revProject = await Project.create({ name: 'Review site', projectType: 'website', websiteUrl: 'https://example.com', owner: revOwner._id, organization: revOrg._id, members: [revOwner._id, revMember._id], shareSettings: { enabled: true, token: 'sharetokenReview', allowComments: true } });
    const revPin = await Pin.create({ project: revProject._id, pageUrl: 'https://example.com/', xPercent: 1, yPercent: 1, pinNumber: 1, createdBy: revMember._id });

    // The approval endpoints are gone
    check('the guest decision endpoint no longer exists', (await call('POST', '/api/guest/sharetokenReview/decision', { body: { decision: 'approved', name: 'Grace' } })).status === 404);
    check('the member decision endpoint no longer exists', (await call('POST', `/api/projects/${revProject._id}/decision`, { user: revOwner, body: { decision: 'approved' } })).status === 404);
    check('the approvals history endpoint no longer exists', (await call('GET', `/api/projects/${revProject._id}/approvals`, { user: revOwner })).status === 404);
    const guestView = (await call('GET', '/api/guest/sharetokenReview')).data?.project?.review || {};
    check('the review page gets no approval settings', guestView.approvalsEnabled === undefined && guestView.requireAllResolved === undefined, JSON.stringify(guestView));

    // Deadline passed: comment-level members are refused, managers can still reply
    const setDeadline = await call('PATCH', `/api/projects/${revProject._id}/review`, { user: revOwner, body: { deadlineAt: new Date(Date.now() - 60e3).toISOString() } });
    check('a manager can set a feedback deadline', setDeadline.status === 200 && !!setDeadline.data?.review?.deadlineAt, setDeadline.status);
    const memberReply = await call('POST', `/api/pins/${revPin._id}/comments`, { user: revMember, body: { body: '<p>One more thing</p>' } });
    check('after the deadline a comment-level member is refused', memberReply.status === 423 && memberReply.data?.code === 'FEEDBACK_CLOSED', memberReply.status);
    const managerReply = await call('POST', `/api/pins/${revPin._id}/comments`, { user: revOwner, body: { body: '<p>Thanks, on it</p>' } });
    check('after the deadline a manager can still reply', managerReply.status === 201, `${managerReply.status} ${managerReply.data?.code || ''}`);

    // Deadlines are a paid feature (hasDeadlines)
    await Organization.updateOne({ _id: revOrg._id }, { $set: { plan: 'free' } });
    const onFree = await call('PATCH', `/api/projects/${revProject._id}/review`, { user: revOwner, body: { deadlineAt: null } });
    check('on a plan without deadlines the deadline cannot be changed', onFree.status === 403 && onFree.data?.code === 'FEATURE_NOT_AVAILABLE', onFree.status);
  }

  // --- Launch fixes: customer health counts only invoices that are really overdue
  {
    const { computeHealthForOrg } = r('utils/customerHealth');
    const hOwner = await mkUser('healthowner', 'owner');
    const hOrg = await Organization.create({ name: 'Health Co', slug: 'health-co-e2e', owner: hOwner._id, plan: 'starter', subscription: { status: 'active' } });
    hOwner.organization = hOrg._id; await hOwner.save({ validateBeforeSave: false });
    const reasonsOf = async () => (await computeHealthForOrg(hOrg._id))?.reasons || (await Organization.findById(hOrg._id).lean()).health?.reasons || [];
    const renewal = await Invoice.create({ organization: hOrg._id, plan: 'starter', amount: 1200, currency: 'USD', status: 'pending', provider: 'paypal', billingMonth: '2099-01', dueAt: new Date(Date.now() + 9 * 864e5) });
    check('a renewal invoice that is not due yet is not "overdue"', !(await reasonsOf()).some((x) => /overdue/i.test(x)), (await reasonsOf()).join('; '));
    await Invoice.updateOne({ _id: renewal._id }, { $set: { dueAt: new Date(Date.now() - 864e5) } });
    check('a pending invoice past its due date is "overdue"', (await reasonsOf()).some((x) => /overdue/i.test(x)));
  }

  // --- Launch fixes: support-agent limits, admin roles, overdue alert once
  {
    const agent = await mkAdmin('agentsam', { role: 'support' });
    const agentCall = (method, url, opts = {}) => call(method, url, { ...opts, user: undefined, token: signAdminToken(agent) });
    const tOwner = await mkUser('agenttrialowner', 'owner');
    const tOrg = await Organization.create({ name: 'Agent Trial Co', slug: 'agent-trial-e2e', owner: tOwner._id, plan: 'trial', trialEndsAt: new Date(Date.now() + 3 * 864e5), trialDays: 14 });
    const fOrg = await Organization.create({ name: 'Agent Free Co', slug: 'agent-free-e2e', owner: tOwner._id, plan: 'free' });
    const ext1 = await agentCall('POST', `/api/admin/organizations/${tOrg._id}/extend-trial`, { body: { days: 7 } });
    check('a support agent can extend a running trial a little', ext1.status === 200 && ext1.data?.organization?.trialDays === 21, `${ext1.status} ${ext1.data?.organization?.trialDays}`);
    const ext2 = await agentCall('POST', `/api/admin/organizations/${tOrg._id}/extend-trial`, { body: { days: 14 } });
    check('support agents cannot add more than 14 days to one trial', ext2.status === 403, ext2.status);
    check('a support agent cannot turn a free organization into a trial', (await agentCall('POST', `/api/admin/organizations/${fOrg._id}/extend-trial`, { body: { days: 7 } })).status === 403);
    const logged = await r('models/Activity').findOne({ action: 'org.trial_extended', organization: tOrg._id }).lean();
    check('the action log records the admin role that acted', logged?.metadata?.adminRole === 'support' && logged?.metadata?.actorRole === 'superadmin');
    check('a support agent cannot change admin roles', (await agentCall('PATCH', `/api/admin/admins/${agent._id}/role`, { body: { role: 'superadmin' } })).status === 403);
    const toSuper = await adminCall('PATCH', `/api/admin/admins/${agent._id}/role`, { body: { role: 'superadmin' } });
    check('a superadmin can change an admin role', toSuper.status === 200 && toSuper.data?.admin?.role === 'superadmin');
    check('an admin cannot change their own role', (await adminCall('PATCH', `/api/admin/admins/${adminOne._id}/role`, { body: { role: 'support' } })).status === 400);

    // Overdue first reply: alerted once, not every day
    const SupportTicket = r('models/SupportTicket');
    process.env.ADMIN_ALERTS_EMAIL = 'alerts@e2e.test';
    await SupportTicket.create({ number: 99001, organization: tOrg._id, requester: tOwner._id, subject: 'Late one', category: 'bug', status: 'open', priority: 'normal', dueAt: new Date(Date.now() - 3600e3), messages: [{ authorType: 'customer', author: tOwner._id, authorName: 'X', body: 'Hello there team' }] });
    const before = sentMailArgs.filter((m) => m.name === 'sendAdminAlertEmail' && m.args?.[0]?.event === 'ticket.overdue').length;
    await r('scripts/runBilling').runBilling();
    await r('scripts/runBilling').runBilling();
    await new Promise((res) => setTimeout(res, 300));
    const after = sentMailArgs.filter((m) => m.name === 'sendAdminAlertEmail' && m.args?.[0]?.event === 'ticket.overdue').length;
    check('an overdue request alerts the team once, not on every daily run', after - before === 1, `${after - before}`);
    delete process.env.ADMIN_ALERTS_EMAIL;
  }

  // --- Launch fixes: pin assignment (Phase 8, already live)
  {
    const Notification = r('models/Notification');
    const aOwner = await mkUser('assignowner', 'owner');
    const aMember = await mkUser('assignmember', 'member');
    const aOther = await mkUser('assignother', 'member');
    const aGuest = await mkUser('assignguest', 'guest');
    const aOrg = await Organization.create({ name: 'Assign Co', slug: 'assign-co-e2e', owner: aOwner._id, plan: 'trial', trialEndsAt: new Date(Date.now() + 9e8) });
    for (const u of [aOwner, aMember, aOther, aGuest]) { u.organization = aOrg._id; await u.save({ validateBeforeSave: false }); }
    const aProject = await Project.create({ name: 'Assign site', projectType: 'website', websiteUrl: 'https://example.com', owner: aOwner._id, organization: aOrg._id, members: [aOwner._id, aMember._id, aOther._id] });
    const secret = await Project.create({ name: 'Secret site', projectType: 'website', websiteUrl: 'https://example.com', owner: aOwner._id, organization: aOrg._id, members: [aOwner._id] });
    const aPin = await Pin.create({ project: aProject._id, pageUrl: 'https://example.com/', xPercent: 1, yPercent: 1, pinNumber: 1, createdBy: aOwner._id });
    const assign = await call('PATCH', `/api/projects/${aProject._id}/pins/${aPin._id}`, { user: aOwner, body: { assignee: String(aMember._id) } });
    await new Promise((res) => setTimeout(res, 300));
    const assignedNotes = await Notification.find({ type: 'pin_assigned', pin: aPin._id }).lean();
    check('"assigned to you" goes only to the assignee', assign.status === 200 && assignedNotes.length === 1 && String(assignedNotes[0].recipient) === String(aMember._id), assignedNotes.map((n) => String(n.recipient)).join(','));
    check('a pin cannot be assigned to someone without access to the project', (await call('PATCH', `/api/projects/${aProject._id}/pins/${aPin._id}`, { user: aOwner, body: { assignee: String(aGuest._id) } })).status === 400);
    check('a malformed assignee is refused, not a server error', (await call('PATCH', `/api/projects/${aProject._id}/pins/${aPin._id}`, { user: aOwner, body: { assignee: 'nope' } })).status === 400);
    check('an invalid due date is refused', (await call('PATCH', `/api/projects/${aProject._id}/pins/${aPin._id}`, { user: aOwner, body: { dueAt: 'tomorrow-ish' } })).status === 400);
    const secretPin = await Pin.create({ project: secret._id, pageUrl: 'https://example.com/', xPercent: 1, yPercent: 1, pinNumber: 1, createdBy: aOwner._id, assignee: aMember._id });
    const tasks = await call('GET', '/api/my-tasks', { user: aMember });
    check('My tasks lists only projects the person can open', tasks.status === 200 && !JSON.stringify(tasks.data).includes(String(secretPin._id)) && JSON.stringify(tasks.data).includes(String(aPin._id)), tasks.status);
  }

  // --- Launch fixes: 24 h feedback deadline reminders
  {
    const EmailOptOut = r('models/EmailOptOut');
    const dOwner = await mkUser('deadlineowner', 'owner');
    const dOrg = await Organization.create({ name: 'Deadline Co', slug: 'deadline-co-e2e', owner: dOwner._id, plan: 'trial', trialEndsAt: new Date(Date.now() + 9e8) });
    dOwner.organization = dOrg._id; await dOwner.save({ validateBeforeSave: false });
    const dProject = await Project.create({ name: 'Deadline site', projectType: 'website', websiteUrl: 'https://example.com', owner: dOwner._id, organization: dOrg._id, members: [dOwner._id], review: { deadlineAt: new Date(Date.now() + 12 * 3600e3) }, shareSettings: { enabled: true, token: 'sharetokenDeadline', allowComments: true } });
    const dPin = await Pin.create({ project: dProject._id, pageUrl: 'https://example.com/', xPercent: 1, yPercent: 1, pinNumber: 1, createdBy: null, createdByGuest: { name: 'Gina', email: 'gina@client.test' } });
    await Comment.create({ pin: dPin._id, body: '<p>hi</p>', authorGuest: { name: 'Otto', email: 'otto@client.test' } });
    await EmailOptOut.create({ email: 'otto@client.test' });
    const countReminders = () => sentMailArgs.filter((m) => m.name === 'sendDeadlineReminderEmail' && m.args?.[0]?.projectName === 'Deadline site');
    await r('scripts/runBilling').phaseDeadlineReminders();
    const first = countReminders();
    check('a deadline within 24 h reminds the members and guest reviewers', first.some((m) => m.to === 'deadlineowner@e2e.test') && first.some((m) => m.to === 'gina@client.test' && m.args[0].forGuest === true), first.map((m) => m.to).join(','));
    check('guests who unsubscribed get no reminder', !first.some((m) => m.to === 'otto@client.test'));
    await r('scripts/runBilling').phaseDeadlineReminders();
    check('the reminder is sent once per deadline', countReminders().length === first.length, `${countReminders().length} vs ${first.length}`);
    await Project.updateOne({ _id: dProject._id }, { $set: { 'review.deadlineAt': new Date(Date.now() + 20 * 3600e3) } });
    await r('scripts/runBilling').phaseDeadlineReminders();
    check('a new deadline gets its own reminder', countReminders().length === first.length * 2, `${countReminders().length}`);
    // Unsubscribing as a guest is remembered
    const tok = r('utils/unsubscribe').signUnsubscribeToken('newguest@client.test');
    if (tok) {
      await fetch(`${base}/api/email/unsubscribe?token=${encodeURIComponent(tok)}`, { method: 'POST' });
      check('a guest who unsubscribes is remembered', !!(await EmailOptOut.exists({ email: 'newguest@client.test' })));
    }
    // An approved project (status set by hand) goes back in review on new feedback
    await Project.updateOne({ _id: dProject._id }, { $set: { projectStatus: 'approved', 'review.deadlineAt': null } });
    const ga = (await call('GET', '/api/guest/sharetokenDeadline')).data?.guestAccessToken;
    await call('POST', '/api/guest/sharetokenDeadline/pins', { headers: ga ? { 'X-Guest-Access': ga } : {}, body: { guestName: 'Gina', guestEmail: 'gina@client.test', pageUrl: 'https://example.com/', xPercent: 3, yPercent: 3 } });
    check('new feedback on an approved project puts it back in review', (await Project.findById(dProject._id).lean()).projectStatus === 'in_review');
  }

  // --- Launch fixes: site notice, error-spike alert, workspace review page, person analytics
  {
    check('a site notice link must be a web address or an app path', (await adminCall('PATCH', '/api/admin/site-notice', { body: { link: 'javascript:alert(1)' } })).status === 400);
    check('a site notice needs valid dates', (await adminCall('PATCH', '/api/admin/site-notice', { body: { startsAt: 'soon' } })).status === 400);
    const saved = await adminCall('PATCH', '/api/admin/site-notice', { body: { enabled: true, message: 'Maintenance on Sunday', level: 'warning', link: '/settings', linkText: 'Details', startsAt: null, expiresAt: new Date(Date.now() + 3600e3).toISOString() } });
    const pub = await call('GET', '/api/site-notice');
    check('an active site notice is shown to everyone', saved.status === 200 && pub.data?.notice?.message === 'Maintenance on Sunday' && pub.data.notice.level === 'warning' && pub.data.notice.link === '/settings');
    await adminCall('PATCH', '/api/admin/site-notice', { body: { enabled: false } });
    check('a turned-off site notice disappears', (await call('GET', '/api/site-notice')).data?.notice === null);
    check('support agents cannot change the site notice', (await call('PATCH', '/api/admin/site-notice', { token: signAdminToken(await mkAdmin('noticeagent', { role: 'support' })), body: { enabled: true, message: 'x' } })).status === 403);

    const { recordServerError, resetErrorSpike } = r('utils/errorSpike');
    process.env.ADMIN_ALERTS_EMAIL = 'alerts@e2e.test';
    process.env.ERROR_ALERT_THRESHOLD = '5';
    resetErrorSpike();
    const spikes = () => sentMailArgs.filter((m) => m.name === 'sendAdminAlertEmail' && m.args?.[0]?.event === 'server.errors').length;
    const spikeBefore = spikes();
    for (let i = 0; i < 12; i++) recordServerError({ method: 'GET', originalUrl: '/api/projects?x=1' }, 500);
    await new Promise((res) => setTimeout(res, 200));
    check('a burst of server errors alerts the team once', spikes() - spikeBefore === 1, String(spikes() - spikeBefore));
    delete process.env.ERROR_ALERT_THRESHOLD;
    delete process.env.ADMIN_ALERTS_EMAIL;
    resetErrorSpike();

    // Workspace review page lists the workspace's projects
    const Workspace = r('models/Workspace');
    const wOwner = await mkUser('wsdecisionowner', 'owner');
    const wOrg = await Organization.create({ name: 'WS Decision Co', slug: 'ws-decision-e2e', owner: wOwner._id, plan: 'trial', trialEndsAt: new Date(Date.now() + 9e8) });
    wOwner.organization = wOrg._id; await wOwner.save({ validateBeforeSave: false });
    const ws = await Workspace.create({ name: 'Client A', organization: wOrg._id, shareSettings: { enabled: true, token: 'abcdef0123456789abcdef01', allowComments: true } });
    const wp = await Project.create({ name: 'Client A site', projectType: 'website', websiteUrl: 'https://example.com', owner: wOwner._id, organization: wOrg._id, members: [wOwner._id], workspace: ws._id });
    const wsPage = await call('GET', '/api/guest/workspace/abcdef0123456789abcdef01');
    const card = wsPage.data?.projects?.find((p) => String(p._id) === String(wp._id));
    check('the workspace review page lists the project without a decision', !!card && card.lastDecision === undefined, JSON.stringify(card || {}).slice(0, 120));

    const person = await adminCall('GET', `/api/admin/users/${wOwner._id}`);
    check('the admin person page includes product analytics (or why not)', person.status === 200 && person.data?.posthog && typeof person.data.posthog.available === 'boolean');
  }

  // --- health
  const health = await call('GET', '/api/health');
  check('health reports db up', health.status === 200 && health.data.db === 'up');
  if (TEST_REDIS) check('health reports redis up', health.data.redis === 'up', JSON.stringify(health.data));

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await r('utils/redis').closeRedis();
  process.exit(fail ? 1 : 0);
})().catch(async (e) => { console.error('ERROR', e); try { await mongoose.connection.dropDatabase(); } catch {} process.exit(2); });
