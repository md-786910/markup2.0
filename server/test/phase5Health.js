// Tests for Phase 5: Customer Health, Engagement & HogQL Telemetry
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/kommently_smoke_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'phase5-test-secret-'.padEnd(48, 'x');

const path = require('path');
const r = (m) => require(path.join(__dirname, '..', m));
const mongoose = require('mongoose');

const Organization = r('models/Organization');
const User = r('models/User');
const Project = r('models/Project');
const Pin = r('models/Pin');
const Comment = r('models/Comment');
const Workspace = r('models/Workspace');
const Invoice = r('models/Invoice');
const SupportTicket = r('models/SupportTicket');
const { calculateHealth, computeHealthForOrg } = r('utils/customerHealth');
const { getOrgPosthogData } = r('utils/posthog');

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  [' + extra + ']' : ''}`);
}

(async () => {
  console.log('=== Phase 5: Customer Health & Engagement Tests ===\n');

  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // --- 1. Pure Algorithm Unit Tests (calculateHealth) ---
    console.log('--- 1. calculateHealth Unit Tests ---');

    // Baseline healthy active customer: max points = 25+15+20+10+10+10+10 = 100
    const healthySignals = {
      hasActiveMember7d: true,
      activeMembers7d: 5,
      totalSeats: 5,
      pinsAndComments14d: 25,
      activeShareLinks: 3,
      guestActivity30d: 4,
      extraWorkspacesCount: 1,
      integrationsCount: 1,
      unpaidInvoicesCount: 0,
    };
    const healthResult = calculateHealth(healthySignals);
    check('Healthy signals produce healthy band', healthResult.band === 'healthy', `score: ${healthResult.score}`);
    check('Healthy signals score is 100', healthResult.score === 100, `score: ${healthResult.score}`);
    check('Healthy signals have no risk deductions', healthResult.reasons.length === 0);

    // At-risk customer: all signals failing except unpaid invoices -> score = 10 (or 0)
    const atRiskSignals = {
      hasActiveMember7d: false,
      activeMembers7d: 0,
      totalSeats: 5,
      pinsAndComments14d: 0,
      activeShareLinks: 0,
      guestActivity30d: 0,
      extraWorkspacesCount: 0,
      integrationsCount: 0,
      unpaidInvoicesCount: 2,
    };
    const atRiskResult = calculateHealth(atRiskSignals);
    check('At-risk signals produce at_risk band', atRiskResult.band === 'at_risk', `score: ${atRiskResult.score}`);
    check('At-risk score is 0', atRiskResult.score === 0, `score: ${atRiskResult.score}`);
    check('At-risk deductions explain churn risks', atRiskResult.reasons.length >= 6, `reasons: ${atRiskResult.reasons.join('; ')}`);

    // Watch band customer: score between 40 and 69
    // hasActiveMember7d (25) + activeMembers7d (15) + unpaidInvoices (10) = 50
    const watchSignals = {
      hasActiveMember7d: true,
      activeMembers7d: 3,
      totalSeats: 4,
      pinsAndComments14d: 0,
      activeShareLinks: 0,
      guestActivity30d: 0,
      extraWorkspacesCount: 0,
      integrationsCount: 0,
      unpaidInvoicesCount: 0,
    };
    const watchResult = calculateHealth(watchSignals);
    check('Watch signals produce watch band', watchResult.band === 'watch', `score: ${watchResult.score}`);
    check('Watch score is between 40 and 69', watchResult.score >= 40 && watchResult.score < 70, `score: ${watchResult.score}`);

    // --- 2. PostHog Safe Fallback Tests ---
    console.log('\n--- 2. PostHog Service Safe Fallback Tests ---');
    const dummyOrgId = new mongoose.Types.ObjectId();
    const posthogRes = await getOrgPosthogData(dummyOrgId);
    check('PostHog returns safe object when unconfigured', typeof posthogRes === 'object' && posthogRes !== null);
    check('PostHog available flag is boolean', typeof posthogRes.available === 'boolean');
    if (!posthogRes.available) {
      check('PostHog unconfigured provides descriptive reason', typeof posthogRes.reason === 'string' && posthogRes.reason.length > 0);
    }

    // --- 3. Database Integration (computeHealthForOrg) ---
    console.log('\n--- 3. computeHealthForOrg Integration Tests ---');
    // Clean test records
    await Promise.all([
      Organization.deleteMany({ name: /^Phase5Org/ }),
      User.deleteMany({ email: /@phase5\.test$/ }),
      Project.deleteMany({ name: /^Phase5Project/ }),
      Pin.deleteMany({ pageUrl: /^https:\/\/phase5\.test/ }),
      Comment.deleteMany({ content: /^Phase5Comment/ }),
      Workspace.deleteMany({ name: /^Phase5Workspace/ }),
      Invoice.deleteMany({ invoiceNumber: /^PHASE5-INV/ }),
      SupportTicket.deleteMany({ subject: /^Phase5Ticket/ }),
    ]);

    const tempOwnerId = new mongoose.Types.ObjectId();
    const org = await Organization.create({
      name: 'Phase5Org Active',
      slug: `phase5-org-${Date.now()}`,
      owner: tempOwnerId,
      plan: 'pro',
    });

    const user = await User.create({
      _id: tempOwnerId,
      name: 'Phase 5 Owner',
      email: `owner-${Date.now()}@phase5.test`,
      passwordHash: 'dummyhash123',
      organization: org._id,
      role: 'owner',
      lastSeen: new Date(),
    });

    const project = await Project.create({
      name: 'Phase5Project Alpha',
      organization: org._id,
      owner: user._id,
      createdBy: user._id,
      websiteUrl: 'https://phase5.test/',
      status: 'active',
      shareSettings: { enabled: true, shareToken: `token-${Date.now()}` },
    });

    const pin = await Pin.create({
      project: project._id,
      pageUrl: 'https://phase5.test/',
      createdBy: user._id,
      xPercent: 50,
      yPercent: 50,
      status: 'pending',
      deviceMode: 'desktop',
    });

    // Add a guest comment
    await Comment.create({
      pin: pin._id,
      body: 'Phase5Comment Great progress!',
      authorGuest: { name: 'Client Reviewer', email: 'guest@client.test' },
    });

    // Add an extra workspace
    await Workspace.create({
      name: 'Phase5Workspace Extra',
      organization: org._id,
      createdBy: user._id,
    });

    const computed = await computeHealthForOrg(org._id);
    check('computeHealthForOrg computes and returns score', computed && typeof computed.score === 'number');
    check('computeHealthForOrg determines valid band', ['healthy', 'watch', 'at_risk'].includes(computed.band));
    check('Highly active org scores healthy band', computed.band === 'healthy', `score: ${computed.score}`);

    // Verify stored on org model
    const refreshedOrg = await Organization.findById(org._id);
    check('Organization document updated with health', refreshedOrg.health && refreshedOrg.health.score === computed.score);
    check('Health contains computation timestamp', refreshedOrg.health.computedAt instanceof Date);

    // Now test an at-risk org with an overdue invoice and inactive user
    const atRiskOwnerId = new mongoose.Types.ObjectId();
    const atRiskOrg = await Organization.create({
      name: 'Phase5Org AtRisk',
      slug: `phase5-atrisk-${Date.now()}`,
      owner: atRiskOwnerId,
      plan: 'pro',
    });

    await User.create({
      _id: atRiskOwnerId,
      name: 'Phase 5 Inactive Owner',
      email: `inactive-${Date.now()}@phase5.test`,
      passwordHash: 'dummyhash123',
      organization: atRiskOrg._id,
      role: 'owner',
      lastSeen: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days ago
    });

    await Invoice.create({
      invoiceNumber: `PHASE5-INV-${Date.now()}`,
      organization: atRiskOrg._id,
      amount: 4900,
      currency: 'USD',
      plan: 'pro',
      status: 'pending',
      dueAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days overdue
    });

    const atRiskComputed = await computeHealthForOrg(atRiskOrg._id);
    check('Inactive + overdue org computes at_risk band', atRiskComputed.band === 'at_risk', `score: ${atRiskComputed.score}`);
    check('Inactive + overdue org detects overdue invoice reason', atRiskComputed.reasons.some((r) => r.toLowerCase().includes('overdue')));
    check('Inactive + overdue org detects inactivity reason', atRiskComputed.reasons.some((r) => r.toLowerCase().includes('inactiv') || r.toLowerCase().includes('active')));

    // --- 4. Admin Controller Endpoints Integration ---
    console.log('\n--- 4. Admin Controller Endpoints Integration Tests ---');
    const adminController = r('controllers/admin.controller');

    // Test getDashboardStats
    let dashboardJson = null;
    let nextErr = null;
    await new Promise((resolve) => {
      adminController.getDashboardStats({}, {
        json: (data) => { dashboardJson = data; resolve(); },
      }, (err) => { nextErr = err; resolve(); });
    });
    if (nextErr) console.error('getDashboardStats error:', nextErr);
    check('getDashboardStats returns activationFunnel object', dashboardJson && typeof dashboardJson.activationFunnel === 'object');
    check('activationFunnel contains 6 progression steps', dashboardJson.activationFunnel?.steps?.length === 6);
    check('getDashboardStats includes atRiskOrgs in attention', Array.isArray(dashboardJson?.attention?.atRiskOrgs));

    // Test getOrganizations with health filter
    let orgsJson = null;
    let orgsErr = null;
    await new Promise((resolve) => {
      adminController.getOrganizations({ query: { health: 'at_risk' } }, {
        json: (data) => { orgsJson = data; resolve(); },
      }, (err) => { orgsErr = err; resolve(); });
    });
    if (orgsErr) console.error('getOrganizations error:', orgsErr);
    check('getOrganizations filters by health band', orgsJson && Array.isArray(orgsJson.organizations));
    check('Filtered organizations only include requested band', orgsJson?.organizations?.every((o) => o.health?.band === 'at_risk'));

    // Test getOrganizationDetail includes health and posthog
    let orgDetailJson = null;
    let orgDetailErr = null;
    await new Promise((resolve) => {
      adminController.getOrganizationDetail({ params: { id: org._id } }, {
        json: (data) => { orgDetailJson = data; resolve(); },
      }, (err) => { orgDetailErr = err; resolve(); });
    });
    if (orgDetailErr) console.error('getOrganizationDetail error:', orgDetailErr);
    check('getOrganizationDetail includes health subdocument', orgDetailJson && typeof orgDetailJson.health === 'object');
    check('getOrganizationDetail includes posthog data object', orgDetailJson && typeof orgDetailJson.posthog === 'object');

    // Clean up test documents
    await Promise.all([
      Organization.deleteMany({ name: /^Phase5Org/ }),
      User.deleteMany({ email: /@phase5\.test$/ }),
      Project.deleteMany({ name: /^Phase5Project/ }),
      Pin.deleteMany({ pageUrl: /^https:\/\/phase5\.test/ }),
      Comment.deleteMany({ content: /^Phase5Comment/ }),
      Workspace.deleteMany({ name: /^Phase5Workspace/ }),
      Invoice.deleteMany({ invoiceNumber: /^PHASE5-INV/ }),
    ]);

  } catch (err) {
    console.error('Test execution error:', err);
    fail++;
  } finally {
    await mongoose.disconnect();
    console.log(`\nResults: ${pass} passed, ${fail} failed\n`);
    process.exit(fail === 0 ? 0 : 1);
  }
})();
