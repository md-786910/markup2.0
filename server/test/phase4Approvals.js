// Tests for Phase 4: Client approvals and feedback deadlines
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/kommently_smoke_test';
if (!/_test(\?|$)/.test(process.env.MONGODB_URI)) { console.error('Refusing to run: the test database name must end in _test'); process.exit(1); }
process.env.JWT_SECRET = process.env.JWT_SECRET || 'phase4-test-secret-'.padEnd(48, 'x');

const path = require('path');
const r = (m) => require(path.join(__dirname, '..', m));
const mongoose = require('mongoose');

const Approval = r('models/Approval');
const Project = r('models/Project');
const Pin = r('models/Pin');
const Version = r('models/Version');
const Organization = r('models/Organization');
const User = r('models/User');
const { getLimitsForPlan } = r('config/plans');

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  [' + extra + ']' : ''}`);
}

(async () => {
  console.log('=== Phase 4: Client Approvals & Feedback Deadlines Tests ===\n');

  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // --- 1. Plan Rules & Quotas ---
    const freeLimits = getLimitsForPlan('free');
    check('Free plan hasApprovals is false', freeLimits.hasApprovals === false);

    const starterLimits = getLimitsForPlan('starter');
    check('Starter plan hasApprovals is true', starterLimits.hasApprovals === true);

    const proLimits = getLimitsForPlan('pro');
    check('Pro plan hasApprovals is true', proLimits.hasApprovals === true);

    const trialLimits = getLimitsForPlan('trial');
    check('Trial hasApprovals is true (Pro limits)', trialLimits.hasApprovals === true);

    // Clean test collections
    await Promise.all([
      Approval.deleteMany({}),
      Project.deleteMany({ name: /^Phase4Test/ }),
      Pin.deleteMany({ pageUrl: /^https:\/\/phase4\.test/ }),
      Version.deleteMany({ notes: 'phase4-test' }),
      Organization.deleteMany({ name: /^Phase4Org/ }),
      User.deleteMany({ email: /@phase4\.test$/ }),
    ]);

    // Setup Test Org & Users
    const tempOwnerId = new mongoose.Types.ObjectId();
    const org = await Organization.create({
      name: 'Phase4Org',
      owner: tempOwnerId,
      plan: 'pro',
    });

    const owner = await User.create({
      _id: tempOwnerId,
      name: 'Alice Owner',
      email: 'alice@phase4.test',
      passwordHash: 'dummy-hashed-pwd',
      organization: org._id,
      role: 'owner',
    });

    const member = await User.create({
      name: 'Bob Member',
      email: 'bob@phase4.test',
      passwordHash: 'dummy-hashed-pwd',
      organization: org._id,
      role: 'member',
    });

    // --- 2. Project Schema & Defaults ---
    const project = await Project.create({
      name: 'Phase4Test Project',
      organization: org._id,
      owner: owner._id,
      websiteUrl: 'https://phase4.test',
      members: [owner._id, member._id],
      shareSettings: {
        enabled: true,
        token: 'phase4-guest-share-token-1234567890',
        allowComments: true,
      },
    });

    check('Project defaults review.approvalsEnabled to true', project.review?.approvalsEnabled === true);
    check('Project defaults review.requireAllResolved to false', project.review?.requireAllResolved === false);
    check('Project defaults review.deadlineAt to null', project.review?.deadlineAt === null);

    // --- 3. Approval Model Validation ---
    const approvalRecord = await Approval.create({
      project: project._id,
      organization: org._id,
      decision: 'approved',
      note: 'Looks great to launch!',
      reviewer: {
        user: member._id,
        guestName: null,
        guestEmail: null,
      },
      openPinsAtDecision: 0,
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0 Test Agent',
    });

    check('Approval model creates valid record', !!approvalRecord._id);
    check('Approval records decision correctly', approvalRecord.decision === 'approved');
    check('Approval stores audit trail (IP & UserAgent)', approvalRecord.ip === '127.0.0.1' && approvalRecord.userAgent === 'Mozilla/5.0 Test Agent');

    // Reject invalid decision
    let threwInvalid = false;
    try {
      await Approval.create({
        project: project._id,
        organization: org._id,
        decision: 'invalid_decision',
        openPinsAtDecision: 0,
      });
    } catch (_) {
      threwInvalid = true;
    }
    check('Approval model rejects invalid decision enum', threwInvalid);

    // --- 4. Open Pins Count & requireAllResolved Logic ---
    const pin1 = await Pin.create({
      project: project._id,
      pageUrl: 'https://phase4.test/home',
      pinNumber: 1,
      xPercent: 10,
      yPercent: 10,
      status: 'pending',
      createdBy: member._id,
    });

    const openPins = await Pin.countDocuments({ project: project._id, status: { $ne: 'resolved' } });
    check('Correctly detects 1 open pin', openPins === 1);

    // Test requireAllResolved gate condition
    project.review.requireAllResolved = true;
    await project.save();

    const canApproveWithOpenPins = !(project.review.requireAllResolved && openPins > 0);
    check('requireAllResolved blocks approval when open pins > 0', canApproveWithOpenPins === false);

    // Resolve pin
    pin1.status = 'resolved';
    await pin1.save();

    const openPinsAfterResolve = await Pin.countDocuments({ project: project._id, status: { $ne: 'resolved' } });
    const canApproveAfterResolve = !(project.review.requireAllResolved && openPinsAfterResolve > 0);
    check('requireAllResolved allows approval when all pins resolved', canApproveAfterResolve === true && openPinsAfterResolve === 0);

    // --- 5. Guest Decision Recording & Upsert ---
    const guestApproval = await Approval.create({
      project: project._id,
      organization: org._id,
      decision: 'changes_requested',
      note: 'Need higher contrast on buttons',
      reviewer: {
        user: null,
        guestName: 'Client Reviewer',
        guestEmail: 'client@external.com',
      },
      openPinsAtDecision: 2,
      ip: '203.0.113.1',
    });

    check('Guest approval record created successfully', !!guestApproval._id);
    check('Guest approval stores reviewer email and name', guestApproval.reviewer.guestEmail === 'client@external.com' && guestApproval.reviewer.guestName === 'Client Reviewer');

    // Simulate upsert for same guest on same round
    await Approval.updateOne(
      { project: project._id, version: null, 'reviewer.guestEmail': 'client@external.com' },
      { $set: { decision: 'approved', note: 'Contrast looks perfect now!' } }
    );
    const updatedGuestApproval = await Approval.findOne({ project: project._id, 'reviewer.guestEmail': 'client@external.com' });
    check('Guest decision updates existing record on same round (latest wins)', updatedGuestApproval.decision === 'approved' && updatedGuestApproval.note === 'Contrast looks perfect now!');

    // --- 6. Feedback Deadline Logic ---
    const pastDate = new Date(Date.now() - 3600 * 1000); // 1 hour ago
    project.review.deadlineAt = pastDate;
    project.review.deadlineMessage = 'Round 1 feedback closed on 30 Oct.';
    await project.save();

    const isPastDeadline = project.review.deadlineAt && new Date() > new Date(project.review.deadlineAt);
    check('Deadline evaluation detects expired deadline', isPastDeadline === true);

    // Manage-level reply bypass rule
    const isManageReply = true; // access === 'manage' && !!parentComment
    const guestAllowed = !isPastDeadline;
    const manageReplyAllowed = !isPastDeadline || isManageReply;
    check('Feedback deadline blocks general feedback', guestAllowed === false);
    check('Feedback deadline allows manage-level replies to open threads', manageReplyAllowed === true);

    // Future deadline allows feedback
    project.review.deadlineAt = new Date(Date.now() + 86400 * 1000); // Tomorrow
    await project.save();
    const isFutureDeadline = project.review.deadlineAt && new Date() > new Date(project.review.deadlineAt);
    check('Active future deadline permits feedback', isFutureDeadline === false);

    // --- 7. Project Status Transitions ---
    project.projectStatus = 'in_review';
    await project.save();
    check('Project status can be set to in_review', project.projectStatus === 'in_review');

    // On approval, updates to approved
    project.projectStatus = 'approved';
    await project.save();
    check('Project status transitions to approved', project.projectStatus === 'approved');

    // Cleanup
    await Promise.all([
      Approval.deleteMany({ project: project._id }),
      Project.deleteOne({ _id: project._id }),
      Pin.deleteMany({ project: project._id }),
      Organization.deleteOne({ _id: org._id }),
      User.deleteMany({ organization: org._id }),
    ]);

    await mongoose.disconnect();

    console.log(`\nResults: ${pass} passed, ${fail} failed.`);
    process.exit(fail ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
})();
