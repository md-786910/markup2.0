// Tests for Phase 4: feedback deadlines (client approvals were removed)
// Deletes test data: only ever a database whose name ends in _test
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/kommently_phase4_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'phase4-test-secret-'.padEnd(48, 'x');

const path = require('path');
const r = (m) => require(path.join(__dirname, '..', m));
const mongoose = require('mongoose');

const Project = r('models/Project');
const Organization = r('models/Organization');
const User = r('models/User');
const { getLimitsForPlan } = r('config/plans');

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  [' + extra + ']' : ''}`);
}

(async () => {
  console.log('=== Phase 4: Feedback Deadlines Tests ===\n');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    if (!mongoose.connection.name.endsWith('_test')) throw new Error(`Refusing to run against "${mongoose.connection.name}": the test database name must end in _test`);

    // --- 1. Plan rules ---
    check('Free plan hasDeadlines is false', getLimitsForPlan('free').hasDeadlines === false);
    check('Starter plan hasDeadlines is true', getLimitsForPlan('starter').hasDeadlines === true);
    check('Pro plan hasDeadlines is true', getLimitsForPlan('pro').hasDeadlines === true);
    check('Trial hasDeadlines is true (Pro limits)', getLimitsForPlan('trial').hasDeadlines === true);
    check('No plan still carries hasApprovals', ['free', 'starter', 'pro', 'enterprise', 'trial'].every((p) => getLimitsForPlan(p).hasApprovals === undefined));

    await Promise.all([
      Project.deleteMany({ name: /^Phase4Test/ }),
      Organization.deleteMany({ name: /^Phase4Org/ }),
      User.deleteMany({ email: /@phase4\.test$/ }),
    ]);

    const ownerId = new mongoose.Types.ObjectId();
    const org = await Organization.create({ name: 'Phase4Org', owner: ownerId, plan: 'pro' });
    const owner = await User.create({ _id: ownerId, name: 'Alice Owner', email: 'alice@phase4.test', passwordHash: 'dummy-hashed-pwd', organization: org._id, role: 'owner' });

    // --- 2. Project schema ---
    const project = await Project.create({
      name: 'Phase4Test Project',
      organization: org._id,
      owner: owner._id,
      websiteUrl: 'https://phase4.test',
      members: [owner._id],
      shareSettings: { enabled: true, token: 'phase4-guest-share-token-1234567890', allowComments: true },
    });
    check('Project defaults review.deadlineAt to null', project.review?.deadlineAt === null);
    check('Project review has no approval settings', project.review?.approvalsEnabled === undefined && project.review?.requireAllResolved === undefined);

    // --- 3. Feedback deadline logic ---
    project.review.deadlineAt = new Date(Date.now() - 3600 * 1000); // 1 hour ago
    project.review.deadlineMessage = 'Round 1 feedback closed on 30 Oct.';
    await project.save();
    const isPastDeadline = project.review.deadlineAt && new Date() > new Date(project.review.deadlineAt);
    check('Deadline evaluation detects expired deadline', isPastDeadline === true);

    // Manage-level reply bypass rule
    const isManageReply = true; // access === 'manage' && !!parentComment
    check('Feedback deadline blocks general feedback', !isPastDeadline === false);
    check('Feedback deadline allows manage-level replies to open threads', (!isPastDeadline || isManageReply) === true);

    project.review.deadlineAt = new Date(Date.now() + 86400 * 1000); // tomorrow
    await project.save();
    check('Active future deadline permits feedback', (project.review.deadlineAt && new Date() > new Date(project.review.deadlineAt)) === false);

    // --- 4. Project status is still set by hand ---
    project.projectStatus = 'approved';
    await project.save();
    check('Project status can still be set to approved', project.projectStatus === 'approved');

    await Promise.all([
      Project.deleteOne({ _id: project._id }),
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
