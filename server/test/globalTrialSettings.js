/**
 * Tests for Global Trial Period Configuration
 * - Model defaults on PaymentSettings (defaultDays: 30)
 * - Dynamic signup integration (new signups inherit global trialDays)
 * - GET and PATCH /api/admin/trial-settings endpoints
 * - Validation guardrails (1-365 days)
 * - Retroactive sync across active trial workspaces
 * - Admin action audit logging
 */

// Uses its own test database: it deletes the global PaymentSettings document
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/kommently_smoke_test';
if (!/_test(\?|$)/.test(process.env.MONGODB_URI)) { console.error('Refusing to run: the test database name must end in _test'); process.exit(1); }
const mongoose = require('mongoose');
const PaymentSettings = require('../models/PaymentSettings');
const Organization = require('../models/Organization');
const User = require('../models/User');
const Activity = require('../models/Activity');
const adminController = require('../controllers/admin.controller');
const { getDefaultTrialDaysAsync, clearTrialCache } = require('../config/plans');

let superAdminUser;

function check(label, pass, detail) {
  if (pass) {
    console.log(`PASS  ${label}`);
  } else {
    console.error(`FAIL  ${label}${detail ? ` (${detail})` : ''}`);
    process.exitCode = 1;
  }
}

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

async function run() {
  console.log('=== Global Trial Period Configuration Tests ===\n');
  await mongoose.connect(process.env.MONGODB_URI);

  try {
    // Clean up test data
    await PaymentSettings.deleteMany({ key: 'default' });
    await Organization.deleteMany({ slug: /^trial-test-/ });
    await User.deleteMany({ email: /^trial-admin-.*@test\.com$/ });

    superAdminUser = await User.create({
      name: 'Super Admin',
      email: 'trial-admin-super@test.com',
      passwordHash: 'dummy',
      role: 'owner',
    });

    // --- 1. Model & Helper Defaults ---
    console.log('--- 1. Model & Helper Defaults ---');
    const settings = await PaymentSettings.getSingleton();
    check('PaymentSettings defaults trial.defaultDays to 30', settings.trial?.defaultDays === 30);

    clearTrialCache();
    const helperDays = await getDefaultTrialDaysAsync();
    check('getDefaultTrialDaysAsync returns 30', helperDays === 30);

    // --- 2. GET /api/admin/trial-settings ---
    console.log('\n--- 2. GET /api/admin/trial-settings ---');
    let getSettingsData = null;
    await adminController.getTrialSettings(
      { admin: { _id: superAdminUser._id, role: 'superadmin' } },
      { json: (d) => { getSettingsData = d; } }
    );
    check('getTrialSettings returns defaultDays: 30', getSettingsData?.defaultDays === 30);
    check('getTrialSettings returns activeTrialOrgsCount', typeof getSettingsData?.activeTrialOrgsCount === 'number');

    // --- 3. Input Validation on PATCH /api/admin/trial-settings ---
    console.log('\n--- 3. Input Validation ---');
    const invalidRes1 = mockRes();
    await adminController.updateTrialSettings(
      { body: { defaultDays: 0 }, admin: { _id: superAdminUser._id, role: 'superadmin' } },
      invalidRes1
    );
    check('Refuses defaultDays < 1 with 400', invalidRes1.getCode() === 400);

    const invalidRes2 = mockRes();
    await adminController.updateTrialSettings(
      { body: { defaultDays: 400 }, admin: { _id: superAdminUser._id, role: 'superadmin' } },
      invalidRes2
    );
    check('Refuses defaultDays > 365 with 400', invalidRes2.getCode() === 400);

    // --- 4. Update Global Trial for Future Signups ---
    console.log('\n--- 4. Update Global Trial for Future Signups ---');
    const updateRes = mockRes();
    await adminController.updateTrialSettings(
      {
        body: { defaultDays: 21, syncActiveTrials: false, reason: 'Testing 21-day trial policy' },
        admin: { _id: superAdminUser._id, role: 'superadmin' },
      },
      updateRes
    );
    check('updateTrialSettings responds 200 on valid update', updateRes.getCode() === 200);

    clearTrialCache();
    const updatedHelperDays = await getDefaultTrialDaysAsync();
    check('getDefaultTrialDaysAsync reflects new setting (21 days)', updatedHelperDays === 21);

    // Verify Action Log
    const auditEntry = await Activity.findOne({ action: 'admin.trial_settings_updated' }).sort({ createdAt: -1 });
    check('Audit log records admin.trial_settings_updated', !!auditEntry);
    check('Audit log records new defaultDays (21)', auditEntry?.metadata?.defaultDays === 21);

    // --- 5. Retroactive Sync Across Active Trial Workspaces ---
    console.log('\n--- 5. Retroactive Sync Across Active Trial Workspaces ---');
    // Create two test trial organizations
    const org1 = await Organization.create({
      name: 'Trial Org 1',
      slug: 'trial-test-org-1',
      owner: superAdminUser._id,
      plan: 'trial',
      trialDays: 14,
      trialEndsAt: new Date(Date.now() + 10 * 86400000),
    });
    const org2 = await Organization.create({
      name: 'Trial Org 2',
      slug: 'trial-test-org-2',
      owner: superAdminUser._id,
      plan: 'trial',
      trialDays: 14,
      trialEndsAt: new Date(Date.now() + 5 * 86400000),
    });

    const syncRes = mockRes();
    await adminController.updateTrialSettings(
      {
        body: { defaultDays: 30, syncActiveTrials: true, reason: 'Extending to 30 days globally' },
        admin: { _id: superAdminUser._id, role: 'superadmin' },
      },
      syncRes
    );
    check('updateTrialSettings with syncActiveTrials succeeds', syncRes.getCode() === 200);
    check('Sync returns affectedCount >= 2', syncRes.getBody()?.affectedCount >= 2);

    const refreshedOrg1 = await Organization.findById(org1._id);
    const refreshedOrg2 = await Organization.findById(org2._id);
    check('Org 1 trialDays updated to 30', refreshedOrg1.trialDays === 30);
    check('Org 2 trialDays updated to 30', refreshedOrg2.trialDays === 30);

    const org1DaysLeft = Math.ceil((refreshedOrg1.trialEndsAt.getTime() - Date.now()) / 86400000);
    check('Org 1 trialEndsAt extended to ~30 days from creation', org1DaysLeft >= 28 && org1DaysLeft <= 31, `daysLeft=${org1DaysLeft}`);

  } catch (err) {
    console.error('Test execution failed:', err);
    process.exitCode = 1;
  } finally {
    // Clean up
    await PaymentSettings.deleteMany({ key: 'default' });
    await Organization.deleteMany({ slug: /^trial-test-/ });
    await User.deleteMany({ email: /^trial-admin-.*@test\.com$/ });
    await mongoose.disconnect();
    console.log('\nAll tests complete.');
  }
}

run();
