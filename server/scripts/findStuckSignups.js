/**
 * Read-only: list accounts without an organization, left by sign-ups that
 * stopped between creating the account and creating its organization (before
 * signup created both in one request). Their email can't sign up again.
 * Usage: node scripts/findStuckSignups.js   (in Docker: docker compose exec server node scripts/findStuckSignups.js)
 * Fix: the person signs in with that email and password; sign-in now creates
 * their organization. Changes nothing itself.
 */

require('../config/env');
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/db');

async function main() {
  await connectDB();
  const users = await User.find({ $or: [{ organization: null }, { organization: { $exists: false } }] })
    .select('name email role createdAt lastSeen')
    .sort({ createdAt: -1 })
    .lean();
  if (!users.length) {
    console.log('No accounts without an organization.');
  } else {
    console.log(`${users.length} account(s) without an organization:`);
    for (const u of users) {
      console.log(`- ${u.email}  (${u.name || 'no name'}, role ${u.role}, created ${u.createdAt?.toISOString?.() || '?'})`);
    }
  }
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
