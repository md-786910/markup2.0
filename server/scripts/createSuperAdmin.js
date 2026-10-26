/**
 * Create an admin panel account, or set a new password for an existing one.
 * Usage: node scripts/createSuperAdmin.js <email> <password> [name]
 * Admin accounts live in AdminUser, apart from customer accounts. More admins
 * can then be invited from the admin panel (Settings → Admin team).
 * The admin turns on two-step sign-in at the first sign-in.
 */

require('../config/env');
const mongoose = require('mongoose');
const AdminUser = require('../models/AdminUser');
const connectDB = require('../config/db');
const { validatePassword } = require('../utils/passwordPolicy');
const { newSessionToken } = require('../utils/adminSession');

async function main() {
  const [,, email, password, ...nameParts] = process.argv;
  if (!email || !password) {
    console.error('Usage: node scripts/createSuperAdmin.js <email> <password> [name]');
    process.exit(1);
  }
  const policy = validatePassword(password, { role: 'superadmin' });
  if (!policy.ok) {
    console.error(policy.message);
    process.exit(1);
  }
  await connectDB();
  const normalized = email.toLowerCase().trim();
  const name = nameParts.join(' ').trim() || normalized.split('@')[0];
  let admin = await AdminUser.findOne({ email: normalized });
  if (admin) {
    admin.passwordHash = password;
    admin.status = 'active';
    admin.sessionToken = newSessionToken();
    await admin.save();
    console.log(`Updated the password of admin ${normalized} and signed out their sessions.`);
  } else {
    admin = await AdminUser.create({ name, email: normalized, passwordHash: password, status: 'active' });
    console.log(`Created admin ${normalized}.`);
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
