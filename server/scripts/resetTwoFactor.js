/**
 * Turn off two-step sign-in for an account that lost its authenticator and
 * recovery codes. Run on the server after confirming who is asking.
 * Usage: node scripts/resetTwoFactor.js <email>
 * The person signs in with their password and sets up 2FA again (admins are
 * asked to right away when ADMIN_REQUIRE_2FA is on).
 */

require('../config/env');
const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../models/User');
const connectDB = require('../config/db');

async function main() {
  const [,, email] = process.argv;
  if (!email) {
    console.error('Usage: node scripts/resetTwoFactor.js <email>');
    process.exit(1);
  }
  await connectDB();
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    console.error(`No account with the email ${email}.`);
    process.exit(1);
  }
  user.twoFactor = { enabled: false, enabledAt: null, secret: null, pendingSecret: null, pendingCreatedAt: null, lastUsedStep: 0, recoveryCodes: [] };
  // Sign out every session too
  user.sessionToken = crypto.randomBytes(32).toString('hex');
  await user.save({ validateBeforeSave: false });
  console.log(`Two-step sign-in is off for ${user.email}, and all their sessions are signed out.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
