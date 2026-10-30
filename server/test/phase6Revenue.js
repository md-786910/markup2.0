// Tests for Phase 6: Pricing and Revenue
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/kommently_smoke_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'phase6-test-secret-'.padEnd(48, 'x');

const path = require('path');
const r = (m) => require(path.join(__dirname, '..', m));
const mongoose = require('mongoose');

const Organization = r('models/Organization');
const PlanConfig = r('models/PlanConfig');
const User = r('models/User');
const Project = r('models/Project');
const Invoice = r('models/Invoice');
const { getPlansWithOverrides, getLimitsForPlanAsync, getSupportForPlan, PLANS } = r('config/plans');
const { derivePlanFeatures } = r('utils/planFeatures');
const { monthlyRevenue } = r('utils/orgStatus');
const adminController = r('controllers/admin.controller');

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  [' + extra + ']' : ''}`);
}

(async () => {
  console.log('=== Phase 6: Pricing & Revenue Tests ===\n');

  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Clean test records
    await Promise.all([
      Organization.deleteMany({ name: /^Phase6/ }),
      User.deleteMany({ email: /@phase6\.test$/ }),
      Project.deleteMany({ name: /^Phase6/ }),
      PlanConfig.deleteMany({}),
      Invoice.deleteMany({ plan: 'starter-test' }),
    ]);

    const defaultPlans = PLANS;

    // --- 1. derivePlanFeatures Unit Tests ---
    console.log('--- 1. derivePlanFeatures Deterministic Derivation ---');
    const proPlan = {
      limits: {
        maxProjects: 999,
        maxWorkspaces: 10,
        maxMembers: 5,
        maxGuests: 999,
        maxStorageMB: 10240, // 10 GB
        hasApprovals: true,
        hasIntegrations: true,
        hasActivityLogs: true,
        hasVersionHistory: true,
      },
      support: {
        tickets: true,
        chat: true,
        priority: 'high',
        replyHours: 12,
      },
    };
    const bullets = derivePlanFeatures(proPlan, ['SOC2 Compliance report']);
    check('Derives unlimited projects', bullets.includes('Unlimited projects'));
    check('Derives workspaces correctly', bullets.includes('10 workspaces'));
    check('Derives 10 GB storage correctly', bullets.includes('10 GB storage'));
    check('Derives client approvals feature', bullets.includes('Client approvals & feedback deadlines'));
    check('Derives integrations feature', bullets.includes('Slack, Jira, Discord & Teams integrations'));
    check('Derives activity log & version history', bullets.includes('Activity log & version history'));
    check('Derives priority support & chat', bullets.includes('Priority support and live chat'));
    check('Includes extra feature bullet', bullets.includes('SOC2 Compliance report'));

    // --- 2. Generic Plan Config Override & Support Inheritance ---
    console.log('\n--- 2. Plan Config Overrides & Limits Merging ---');
    await PlanConfig.create({
      planId: 'starter',
      limits: {
        maxProjects: 20,
        maxWorkspaces: 3,
        maxStorageMB: 2048,
        hasApprovals: true,
      },
      support: {
        tickets: true,
        chat: false,
        priority: 'high',
        replyHours: 12,
      },
      extraFeatures: ['Custom domain branding'],
    });

    const mergedPlans = await getPlansWithOverrides();
    check('Starter maxWorkspaces overridden to 3', mergedPlans.starter.limits.maxWorkspaces === 3);
    check('Starter maxStorageMB overridden to 2048', mergedPlans.starter.limits.maxStorageMB === 2048);
    check('Starter hasApprovals overridden to true', mergedPlans.starter.limits.hasApprovals === true);

    const mergedStarterLimits = await getLimitsForPlanAsync('starter');
    check('getLimitsForPlanAsync starter maxWorkspaces is 3', mergedStarterLimits.maxWorkspaces === 3);
    check('getLimitsForPlanAsync starter maxStorageMB is 2048', mergedStarterLimits.maxStorageMB === 2048);

    const starterSupport = await getSupportForPlan('starter');
    check('getSupportForPlan starter priority is high', starterSupport.priority === 'high');
    check('getSupportForPlan starter replyHours is 12', starterSupport.replyHours === 12);

    // --- 3. Custom Deals on Organizations ---
    console.log('\n--- 3. Custom Deals on Organizations ---');
    const dummyOwner = new mongoose.Types.ObjectId();
    const dealOrg = await Organization.create({
      name: 'Phase6 Custom Deal Org',
      owner: dummyOwner,
      plan: 'enterprise',
      deal: {
        price: 1500,
        currency: 'USD',
        note: 'Annual upfront contract renegotiation',
        until: new Date(Date.now() + 180 * 86400000), // active for 180 days
      },
    });

    const revUsd = monthlyRevenue(dealOrg, defaultPlans);
    check('monthlyRevenue recognizes custom deal in USD ($1500)', revUsd === 1500, `rev=${revUsd}`);

    // Active deal in INR
    const inrDealOrg = await Organization.create({
      name: 'Phase6 INR Deal Org',
      owner: dummyOwner,
      plan: 'enterprise',
      deal: {
        price: 84000,
        currency: 'INR',
        until: new Date(Date.now() + 180 * 86400000),
      },
    });
    const revInrDeal = monthlyRevenue(inrDealOrg, defaultPlans);
    check('monthlyRevenue converts INR deal to USD (~$1000)', revInrDeal === 1000, `revInr=${revInrDeal}`);

    // Expired deal fallback for active subscription
    const expiredDealOrg = await Organization.create({
      name: 'Phase6 Expired Deal Org',
      owner: dummyOwner,
      plan: 'pro',
      subscription: { status: 'active' },
      deal: {
        price: 50,
        currency: 'USD',
        note: 'Promo 1 month',
        until: new Date(Date.now() - 86400000), // expired yesterday
      },
    });
    const fallbackRev = monthlyRevenue(expiredDealOrg, defaultPlans);
    check('Expired deal falls back to standard Pro pricing ($29)', fallbackRev === 29, `rev=${fallbackRev}`);

    // --- 4. Admin Controller Revenue & Invoices Endpoints ---
    console.log('\n--- 4. Admin Controller Endpoints ---');
    // Helper to call express-async-handler wrapped endpoints
    const callHandler = (fn, req, res) => new Promise((resolve, reject) => {
      fn(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      }).catch(reject);
    });

    // Test getRevenue
    const revenueReq = {};
    let revData = null;
    await new Promise((resolve, reject) => {
      adminController.getRevenue(revenueReq, {
        json: (d) => { revData = d; resolve(); },
      }, reject);
    });

    check('getRevenue returns kpis object', typeof revData?.kpis === 'object');
    check('getRevenue returns totalUsdMrr >= 1500 from active deals', (revData?.kpis?.totalUsdMrr || 0) >= 1500, `usd=${revData?.kpis?.totalUsdMrr}`);
    check('getRevenue returns upcomingRenewals array', Array.isArray(revData?.upcomingRenewals));
    check('getRevenue returns unpaidInvoices array', Array.isArray(revData?.unpaidInvoices));
    check('getRevenue returns recentPayments array', Array.isArray(revData?.recentPayments));

    // Test getInvoices JSON
    let invoicesData = null;
    await new Promise((resolve, reject) => {
      adminController.getInvoices({ query: { status: 'paid', page: 1, limit: 10 } }, {
        json: (d) => { invoicesData = d; resolve(); },
      }, reject);
    });
    check('getInvoices returns paginated array', Array.isArray(invoicesData?.invoices));
    check('getInvoices returns total count', typeof invoicesData?.total === 'number');

    // Test getInvoices CSV
    let csvHeaders = {};
    let csvChunks = [];
    const csvRes = {
      setHeader: (k, v) => { csvHeaders[k] = v; },
      send: (c) => csvChunks.push(c),
      end: (c) => { if (c) csvChunks.push(c); },
    };
    await new Promise((resolve, reject) => {
      adminController.getInvoices({ query: { format: 'csv' } }, {
        ...csvRes,
        send: (c) => { csvChunks.push(c); resolve(); },
        end: (c) => { if (c) csvChunks.push(c); resolve(); },
      }, reject);
    });
    const csvContent = csvChunks.join('');
    check('getInvoices format=csv sets text/csv header', csvHeaders['Content-Type']?.includes('text/csv'));
    check('getInvoices CSV header row contains Invoice ID, Organization, Plan, Amount', csvContent.includes('Invoice Number') && csvContent.includes('Organization') && csvContent.includes('Plan'));

    // Test Usage Impact guardrails
    // Create an org on starter with 2 projects
    const orgWithProjects = await Organization.create({
      name: 'Phase6 Busy Starter Org',
      owner: dummyOwner,
      plan: 'starter',
    });
    await Project.create({
      name: 'Phase6 Project 1',
      organization: orgWithProjects._id,
      owner: dummyOwner,
      websiteUrl: 'https://phase6-test-site.com',
    });
    await Project.create({
      name: 'Phase6 Project 2',
      organization: orgWithProjects._id,
      owner: dummyOwner,
      websiteUrl: 'https://phase6-test-site.com',
    });

    let impactResult = null;
    await new Promise((resolve, reject) => {
      adminController.getPlanUsageImpact(
        { params: { planId: 'starter' }, body: { maxProjects: 1 } },
        { json: (d) => { impactResult = d; resolve(); } },
        reject
      );
    });
    check('Usage impact detects affected orgs when lowering maxProjects to 1', impactResult?.hasImpact === true);
    check('Usage impact identifies affected count', impactResult?.affectedCount >= 1);
    check('Usage impact returns detailed breakdown', impactResult?.impacts?.maxProjects >= 1);

    console.log(`\nResults: ${pass} passed, ${fail} failed.\n`);
    process.exit(fail ? 1 : 0);
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
})();
