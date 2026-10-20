/**
 * One-time migration script: Set up Organization and convert first admin to owner.
 *
 * Run: node server/scripts/migrateRoles.js
 *
 * What it does:
 * 1. Finds the first user (by createdAt) and changes role from 'admin' to 'owner'
 * 2. Creates an Organization doc linked to the owner
 * 3. Links ALL existing users to the organization
 * 4. Links ALL existing projects to the organization
 * 5. Updates existing invitations with the organization reference
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Project = require('../models/Project');
const Invitation = require('../models/Invitation');

async function migrate() {
  const dbUri = process.env.MONGO_URI || 'mongodb://localhost:27017/markup_mvp';
  console.log(`Connecting to ${dbUri}...`);
  await mongoose.connect(dbUri);

  // Step 1: Find the first user
  const firstUser = await User.findOne().sort({ createdAt: 1 });
  if (!firstUser) {
    console.log('No users found. Nothing to migrate.');
    process.exit(0);
  }

  console.log(`First user: ${firstUser.name} (${firstUser.email}), current role: ${firstUser.role}`);

  // Step 2: Check if organization already exists
  let org = await Organization.findOne({ owner: firstUser._id });
  if (org) {
    console.log(`Organization already exists: ${org.name} (${org._id})`);
  } else {
    // Create organization
    org = await Organization.create({
      name: firstUser.name + "'s Workspace",
      owner: firstUser._id,
      plan: 'trial',
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    console.log(`Created organization: ${org.name} (${org._id})`);
  }

  // Step 3: Promote first user to owner
  if (firstUser.role !== 'owner') {
    firstUser.role = 'owner';
    console.log(`Changed ${firstUser.name}'s role to 'owner'`);
  }
  firstUser.organization = org._id;
  await firstUser.save({ validateBeforeSave: false });

  // Step 4: Link all other users to the organization
  const result = await User.updateMany(
    { _id: { $ne: firstUser._id }, organization: null },
    { $set: { organization: org._id } }
  );
  console.log(`Linked ${result.modifiedCount} user(s) to organization`);

  // Step 5: Link all projects to the organization
  const projectResult = await Project.updateMany(
    { organization: null },
    { $set: { organization: org._id } }
  );
  console.log(`Linked ${projectResult.modifiedCount} project(s) to organization`);

  // Step 6: Update invitations with organization
  const inviteResult = await Invitation.updateMany(
    { organization: null },
    { $set: { organization: org._id } }
  );
  console.log(`Linked ${inviteResult.modifiedCount} invitation(s) to organization`);

  console.log('\nMigration complete!');
  console.log(`Organization: ${org.name}`);
  console.log(`Plan: ${org.plan} (trial ends: ${org.trialEndsAt})`);
  console.log(`Limits: ${org.limits.maxMembers} members, ${org.limits.maxGuests} guests, ${org.limits.maxProjects} projects`);

  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
