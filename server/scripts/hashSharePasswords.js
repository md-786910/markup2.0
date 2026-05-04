/**
 * One-off migration: bcrypt-hash any plaintext share-link passwords stored
 * in `Project.shareSettings.password` and write the hash to
 * `shareSettings.passwordHash`. The plaintext field is then cleared.
 *
 * Usage:
 *   cd server && node scripts/hashSharePasswords.js
 *
 * Safe to re-run: only matches projects with plaintext password set and
 * passwordHash unset. After all environments are migrated, the plaintext
 * field + the read-time fallback in guest.controller.js can be removed.
 */

require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Project = require('../models/Project');

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('[hash-share-pwd] MONGODB_URI not set');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[hash-share-pwd] connected to MongoDB');

  const projects = await Project.find({
    'shareSettings.password': { $ne: null, $exists: true },
    $or: [
      { 'shareSettings.passwordHash': null },
      { 'shareSettings.passwordHash': { $exists: false } },
    ],
  }).select('_id shareSettings');

  console.log(`[hash-share-pwd] ${projects.length} projects to migrate`);

  let migrated = 0;
  for (const p of projects) {
    if (!p.shareSettings || !p.shareSettings.password) continue;
    const hash = await bcrypt.hash(String(p.shareSettings.password), 10);
    p.shareSettings.passwordHash = hash;
    p.shareSettings.password = null;
    await p.save();
    migrated += 1;
  }

  console.log(`[hash-share-pwd] migrated ${migrated} projects`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[hash-share-pwd] failed:', err);
  process.exit(1);
});
