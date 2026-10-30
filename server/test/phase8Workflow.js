// Tests for Phase 8: Task Workflow
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/kommently_smoke_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'phase8-test-secret-'.padEnd(48, 'x');

const path = require('path');
const r = (m) => require(path.join(__dirname, '..', m));
const mongoose = require('mongoose');

const Pin = r('models/Pin');
const Project = r('models/Project');
const Organization = r('models/Organization');
const User = r('models/User');
const { getLimitsForPlan } = r('config/plans');
const pinController = r('controllers/pin.controller');
const guestController = r('controllers/guest.controller');

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  [' + extra + ']' : ''}`);
}

(async () => {
  console.log('=== Phase 8: Task Workflow Tests ===\n');

  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Clean test records
    await Promise.all([
      Organization.deleteMany({ name: /^Phase8/ }),
      User.deleteMany({ email: /@phase8\.test$/ }),
      Project.deleteMany({ name: /^Phase8/ }),
      Pin.deleteMany({ pageUrl: /^https:\/\/phase8\.test/ }),
    ]);

    // --- 1. Plan Rules Quotas ---
    console.log('--- 1. Plan Rules & hasTaskWorkflow Quota ---');
    const freeLimits = getLimitsForPlan('free');
    check('Free plan hasTaskWorkflow is false', freeLimits.hasTaskWorkflow === false);

    const starterLimits = getLimitsForPlan('starter');
    check('Starter plan hasTaskWorkflow is true', starterLimits.hasTaskWorkflow === true);

    const proLimits = getLimitsForPlan('pro');
    check('Pro plan hasTaskWorkflow is true', proLimits.hasTaskWorkflow === true);

    // --- 2. Organization, Users & Project Setup ---
    console.log('\n--- 2. Multi-tenant Setup & User Permissions ---');
    const orgAId = new mongoose.Types.ObjectId();
    const orgA = await Organization.create({
      _id: orgAId,
      name: 'Phase8 Org A',
      owner: new mongoose.Types.ObjectId(),
      plan: 'pro',
    });

    const userA1 = await User.create({
      name: 'Developer Alice',
      email: 'alice@phase8.test',
      passwordHash: 'dummy',
      organization: orgA._id,
      role: 'owner',
    });
    orgA.owner = userA1._id;
    await orgA.save();

    const userA2 = await User.create({
      name: 'Designer Bob',
      email: 'bob@phase8.test',
      passwordHash: 'dummy',
      organization: orgA._id,
      role: 'member',
    });

    // Foreign org
    const orgB = await Organization.create({
      name: 'Phase8 Org B',
      owner: new mongoose.Types.ObjectId(),
      plan: 'starter',
    });
    const userB = await User.create({
      name: 'Foreign Dave',
      email: 'dave@phase8.test',
      passwordHash: 'dummy',
      organization: orgB._id,
      role: 'member',
    });

    const project = await Project.create({
      name: 'Phase8 Test Project',
      organization: orgA._id,
      owner: userA1._id,
      websiteUrl: 'https://phase8.test',
      shareSettings: {
        enabled: true,
        token: 'phase8-guest-token-12345',
        allowComments: true,
      },
    });

    // --- 3. Pin Schema & Rich Status Lifecycles ---
    console.log('\n--- 3. Pin Creation, Rich Status & Assignment ---');
    const pin = await Pin.create({
      project: project._id,
      pageUrl: 'https://phase8.test',
      createdBy: userA1._id,
      xPercent: 10,
      yPercent: 20,
      pinNumber: 1,
    });

    check('New pin defaults status to open', pin.status === 'open');
    check('New pin defaults priority to normal', pin.priority === 'normal');
    check('New pin defaults assignee to null', pin.assignee === null);
    check('New pin defaults dueAt to null', pin.dueAt === null);
    check('New pin defaults labels to empty array', Array.isArray(pin.labels) && pin.labels.length === 0);

    // Update status to in_progress, set assignee, priority, due date, labels
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

    // Update with foreign assignee (must fail)
    const nextErr = (err) => { if (err) throw err; };
    const foreignRes = mockRes();
    await pinController.updatePin(
      {
        params: { pinId: pin._id },
        body: { assignee: userB._id },
        project,
        organization: orgA,
        user: userA1,
        app: { get: () => null },
      },
      foreignRes,
      nextErr
    );
    check('Assignee from foreign org is refused with 400', foreignRes.getCode() === 400);

    // Valid update with member assignee
    const targetDue = new Date(Date.now() + 3 * 86400000);
    const validRes = mockRes();
    await pinController.updatePin(
      {
        params: { pinId: pin._id },
        body: {
          status: 'in_progress',
          assignee: userA2._id,
          priority: 'urgent',
          dueAt: targetDue,
          labels: ['Frontend', 'CSS Bug'],
          position: 1,
        },
        project,
        organization: orgA,
        user: userA1,
        app: { get: () => null },
      },
      validRes,
      nextErr
    );

    const updatedPin = await Pin.findById(pin._id);
    check('Pin status updated to in_progress', updatedPin.status === 'in_progress');
    check('Pin assignee updated to Designer Bob', String(updatedPin.assignee) === String(userA2._id));
    check('Pin priority updated to urgent', updatedPin.priority === 'urgent');
    check('Pin dueAt updated to target date', updatedPin.dueAt instanceof Date);
    check('Pin labels updated with tags', updatedPin.labels.includes('Frontend') && updatedPin.labels.includes('CSS Bug'));
    check('Pin position updated to 1', updatedPin.position === 1);

    // Legacy 'pending' status backward compatibility
    await pinController.updatePin(
      {
        params: { pinId: pin._id },
        body: { status: 'pending' },
        project,
        organization: orgA,
        user: userA1,
        app: { get: () => null },
      },
      mockRes(),
      nextErr
    );
    const legacyPin = await Pin.findById(pin._id);
    check("Updating status: 'pending' normalizes safely to 'open'", legacyPin.status === 'open');

    // Move to in_review
    await pinController.updatePin(
      {
        params: { pinId: pin._id },
        body: { status: 'in_review' },
        project,
        organization: orgA,
        user: userA2,
        app: { get: () => null },
      },
      mockRes(),
      nextErr
    );
    const inReviewPin = await Pin.findById(pin._id);
    check('Pin status transitions to in_review', inReviewPin.status === 'in_review');

    // --- 4. Filtering & Reordering Pins ---
    console.log('\n--- 4. Query Filtering & Board Reordering ---');
    let getPinsData = null;
    await pinController.getPins(
      {
        params: { projectId: project._id },
        query: { status: 'in_review', priority: 'urgent' },
        project,
      },
      { json: (d) => { getPinsData = d; } },
      nextErr
    );
    check('getPins filters by status and priority', getPinsData?.pins?.length === 1 && getPinsData.pins[0]._id.toString() === pin._id.toString());

    // Batch Reorder Pins
    const reorderRes = mockRes();
    await pinController.reorderPins(
      {
        params: { projectId: project._id },
        body: {
          moves: [
            { pinId: pin._id, status: 'resolved', position: 5 },
          ],
        },
        project,
        app: { get: () => null },
      },
      reorderRes,
      nextErr
    );
    const reorderedPin = await Pin.findById(pin._id);
    check('reorderPins moves pin to resolved with position 5', reorderedPin.status === 'resolved' && reorderedPin.position === 5);

    // --- 5. Personal Task Queue (GET /api/my-tasks) ---
    console.log('\n--- 5. Cross-Project Task Queue (GET /api/my-tasks) ---');
    // Create an open pin assigned to Bob
    const bobPin = await Pin.create({
      project: project._id,
      pageUrl: 'https://phase8.test/contact',
      createdBy: userA1._id,
      assignee: userA2._id,
      status: 'open',
      priority: 'high',
      dueAt: new Date(Date.now() - 86400000), // Overdue yesterday
      pinNumber: 2,
      xPercent: 15,
      yPercent: 25,
    });

    let bobTasks = null;
    await pinController.getMyTasks(
      { user: userA2 },
      { json: (d) => { bobTasks = d; } }
    );
    check('getMyTasks returns assigned tasks count', bobTasks?.total >= 1);
    check('getMyTasks categorizes overdue task correctly', bobTasks?.overdue?.some((t) => t._id.toString() === bobPin._id.toString()));

    // User A1 has no assigned tasks
    let aliceTasks = null;
    await pinController.getMyTasks(
      { user: userA1 },
      { json: (d) => { aliceTasks = d; } }
    );
    check('getMyTasks isolates assignments per user', aliceTasks?.total === 0);

    // --- 6. Guest Privacy Sanitization ---
    console.log('\n--- 6. Guest Privacy Sanitization ---');
    let guestPinsData = null;
    await guestController.getGuestPins(
      {
        params: { shareToken: 'phase8-guest-token-12345' },
        query: {},
      },
      { json: (d) => { guestPinsData = d; } }
    );
    const guestPin = guestPinsData?.pins?.find((p) => p._id.toString() === bobPin._id.toString());
    check('Guest sees sanitized status (open vs resolved only)', guestPin && guestPin.status === 'open');
    check('Guest cannot see internal assignee', guestPin && guestPin.assignee === undefined);
    check('Guest cannot see internal priority', guestPin && guestPin.priority === undefined);
    check('Guest cannot see internal labels', guestPin && guestPin.labels === undefined);

    console.log(`\nResults: ${pass} passed, ${fail} failed.\n`);
    process.exit(fail ? 1 : 0);
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
})();
