// Tests for Phase 7: Launch Hardening
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/kommently_smoke_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'phase7-test-secret-'.padEnd(48, 'x');

const path = require('path');
const r = (m) => require(path.join(__dirname, '..', m));
const mongoose = require('mongoose');

const AdminUser = r('models/AdminUser');
const Organization = r('models/Organization');
const SiteNotice = r('models/SiteNotice');
const { requireAdminRole } = r('middleware/adminAuth');
const { replyDueAt } = r('utils/support');
const adminAlerts = r('utils/adminAlerts');
const adminController = r('controllers/admin.controller');
const siteNoticeController = r('controllers/siteNotice.controller');

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  [' + extra + ']' : ''}`);
}

(async () => {
  console.log('=== Phase 7: Launch Hardening Tests ===\n');

  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Clean test records
    await Promise.all([
      AdminUser.deleteMany({ email: /@phase7\.test$/ }),
      Organization.deleteMany({ name: /^Phase7/ }),
      SiteNotice.deleteMany({}),
    ]);

    // --- 1. Admin Role & RBAC Middleware Tests ---
    console.log('--- 1. Admin Role & RBAC Enforcement ---');
    const superAdmin = await AdminUser.create({
      name: 'Super Alice',
      email: 'alice@phase7.test',
      status: 'active',
      role: 'superadmin',
    });

    const supportAgent = await AdminUser.create({
      name: 'Support Bob',
      email: 'bob@phase7.test',
      status: 'active',
      role: 'support',
    });

    check('Superadmin defaults or sets role to superadmin', superAdmin.role === 'superadmin');
    check('Support agent has role support', supportAgent.role === 'support');
    check('toPublic includes role field', supportAgent.toPublic().role === 'support');

    // Test requireAdminRole middleware
    const mockRes = () => {
      let code = 200;
      let body = null;
      return {
        status: (c) => { code = c; return { json: (b) => { body = b; } }; },
        json: (b) => { body = b; },
        getCode: () => code,
        getBody: () => body,
      };
    };

    const superMiddleware = requireAdminRole('superadmin');

    let superPassed = false;
    superMiddleware({ admin: superAdmin }, {}, () => { superPassed = true; });
    check('requireAdminRole allows superadmin', superPassed === true);

    const deniedRes = mockRes();
    let supportPassed = false;
    superMiddleware({ admin: supportAgent }, deniedRes, () => { supportPassed = true; });
    check('requireAdminRole blocks support agent from superadmin route', supportPassed === false && deniedRes.getCode() === 403);
    check('Denial returns INSUFFICIENT_ROLE error code', deniedRes.getBody()?.code === 'INSUFFICIENT_ROLE');

    // --- 2. Trial Extension Restrictions (Support 14d cap) ---
    console.log('\n--- 2. Trial Extension Role Guardrails ---');
    const dummyOwner = new mongoose.Types.ObjectId();
    const trialOrg = await Organization.create({
      name: 'Phase7 Trial Org',
      owner: dummyOwner,
      plan: 'trial',
      trialEndsAt: new Date(Date.now() + 5 * 86400000),
    });

    // Support agent trying 30 days -> must fail (capped at 14)
    const supportDeniedRes = mockRes();
    await adminController.extendTrial(
      { params: { id: trialOrg._id }, body: { days: 30 }, admin: supportAgent },
      supportDeniedRes
    );
    check('Support agent cannot extend trial by 30 days (>14)', supportDeniedRes.getCode() === 400);

    // Support agent trying 14 days -> must succeed
    const supportOkRes = mockRes();
    await adminController.extendTrial(
      { params: { id: trialOrg._id }, body: { days: 14 }, admin: supportAgent },
      supportOkRes
    );
    check('Support agent can extend trial by 14 days', supportOkRes.getCode() === 200);

    // Superadmin trying 60 days -> must succeed
    const superOkRes = mockRes();
    await adminController.extendTrial(
      { params: { id: trialOrg._id }, body: { days: 60 }, admin: superAdmin },
      superOkRes
    );
    check('Superadmin can extend trial beyond 14 days (up to 365)', superOkRes.getCode() === 200);

    // --- 3. Business Hours Support SLA Engine ---
    console.log('\n--- 3. Business Hours SLA Calculation ---');
    // Test calendar fallback without SUPPORT_HOURS
    delete process.env.SUPPORT_HOURS;
    const baseFriday = new Date('2026-10-30T17:00:00.000Z'); // Friday 5:00 PM UTC
    const calDue = replyDueAt({ replyHours: 8 }, baseFriday);
    const calHoursDiff = (calDue.getTime() - baseFriday.getTime()) / (3600 * 1000);
    check('Calendar hours fallback adds 8 linear hours', Math.round(calHoursDiff) === 8);

    // Test with business hours: Mon-Fri 09:00-18:00 UTC
    process.env.SUPPORT_HOURS = 'Mon-Fri 09:00-18:00 UTC';
    // Submitted Friday 5:00 PM (1 hr left on Friday, remaining 7 hrs roll to Monday 9 AM -> Monday 4:00 PM)
    const bizDue = replyDueAt({ replyHours: 8 }, baseFriday);
    check('Business hours SLA rolls over the weekend to Monday', bizDue.getUTCDay() === 1, `day=${bizDue.getUTCDay()}`);
    check('Business hours SLA lands at 16:00 UTC (9 AM + 7h)', bizDue.getUTCHours() === 16, `hours=${bizDue.getUTCHours()}`);

    // --- 4. Admin Alerts Dispatcher ---
    console.log('\n--- 4. Fire-and-Forget Admin Alerts ---');
    // Test alert functions do not throw even when webhooks/emails are unset
    let alertThrew = false;
    try {
      await adminAlerts.alertNewUrgentTicket({
        ticket: { number: 9999, subject: 'Payment crashed' },
        organization: { name: 'Acme Test', plan: 'pro' },
        requester: { name: 'John Doe', email: 'john@acme.test' },
      });
      await adminAlerts.alertRefundIssued({
        organization: { name: 'Acme Test' },
        invoice: { invoiceNumber: 'INV-TEST-001' },
        amount: 5000,
        currency: 'USD',
        admin: superAdmin,
      });
      await adminAlerts.alertOrgLocked({
        organization: { name: 'Acme Test', plan: 'starter' },
        reason: 'Payment grace expired',
      });
    } catch {
      alertThrew = true;
    }
    check('Admin alert triggers execute safely without crashing when unconfigured', alertThrew === false);

    // --- 5. Global SiteNotice Banner System ---
    console.log('\n--- 5. Site Notice Banner System ---');
    // Initially no active notice
    let publicNotice1 = null;
    await new Promise((resolve, reject) => {
      siteNoticeController.getPublicNotice({}, {
        json: (d) => { publicNotice1 = d; resolve(); },
      }, reject);
    });
    check('No public notice returned when not configured/disabled', publicNotice1?.notice === null);

    // Superadmin enables notice
    let updateNotice = null;
    await new Promise((resolve, reject) => {
      siteNoticeController.updateAdminNotice(
        {
          body: {
            enabled: true,
            message: 'Scheduled maintenance on Saturday 2:00 AM UTC',
            level: 'warning',
            dismissible: true,
          },
          admin: superAdmin,
        },
        { json: (d) => { updateNotice = d; resolve(); } },
        reject
      );
    });
    check('Superadmin can create and update global site notice', updateNotice?.notice?.enabled === true);

    // Public endpoint now returns notice
    let publicNotice2 = null;
    await new Promise((resolve, reject) => {
      siteNoticeController.getPublicNotice({}, {
        json: (d) => { publicNotice2 = d; resolve(); },
      }, reject);
    });
    check('Public notice returned when active', publicNotice2?.notice?.message === 'Scheduled maintenance on Saturday 2:00 AM UTC');
    check('Public notice includes level warning', publicNotice2?.notice?.level === 'warning');

    console.log(`\nResults: ${pass} passed, ${fail} failed.\n`);
    process.exit(fail ? 1 : 0);
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
})();
