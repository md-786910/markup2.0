/**
 * Create or promote a user to superadmin.
 * Usage: node scripts/createSuperAdmin.js <email> <password>
 *   - If the email exists, promotes that user to superadmin.
 *   - If not, creates a new superadmin user (no organization).
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/db');

async function main() {
  const [,, email, password] = process.argv;

  if (!email || !password) {
    console.error('Usage: node scripts/createSuperAdmin.js <email> <password>');
    process.exit(1);
  }

  await connectDB();

  const existing = await User.findOne({ email: email.toLowerCase().trim() });

  if (existing) {
    existing.role = 'superadmin';
    await existing.save({ validateBeforeSave: false });
    console.log(`Promoted ${email} to superadmin.`);
  } else {
    const crypto = require('crypto');
    await User.create({
      name: 'Super Admin',
      email: email.toLowerCase().trim(),
      passwordHash: password,
      role: 'superadmin',
      sessionToken: crypto.randomBytes(32).toString('hex'),
    });
    console.log(`Created superadmin: ${email}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
