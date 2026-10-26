/**
 * Turn off two-step sign-in for an admin who lost their authenticator and
 * recovery codes, when no other admin can do it from Settings → Admin team.
 * Usage: node scripts/resetTwoFactor.js <email>
 * They sign in with their password and set up 2FA again.
 */

require('../config/env');
const mongoose = require('mongoose');
const AdminUser = require('../models/AdminUser');
const connectDB = require('../config/db');
const { newSessionToken } = require('../utils/adminSession');
const { TWO_FACTOR_OFF } = require('../controllers/adminAuth.controller');

async function main() {
  const [,, email] = process.argv;
  if (!email) {
    console.error('Usage: node scripts/resetTwoFactor.js <email>');
    process.exit(1);
  }
  await connectDB();
  const admin = await AdminUser.findOne({ email: email.toLowerCase().trim() });
  if (!admin) {
    console.error(`No admin account with the email ${email}.`);
    process.exit(1);
  }
  admin.twoFactor = { ...TWO_FACTOR_OFF };
  admin.sessionToken = newSessionToken(); // signs out every session
  await admin.save({ validateBeforeSave: false });
  console.log(`Two-step sign-in is off for ${admin.email}, and all their sessions are signed out.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
