/**
 * One-time cleanup for all pending invitations.
 *
 * Run from the server directory:
 *   npm run clear:pending-invitations
 *
 * This permanently deletes every invitation with status "pending" from the
 * database selected by MONGODB_URI. Accepted invitations are not affected.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Invitation = require('../models/Invitation');

async function clearPendingInvitations() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured');
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const pendingCount = await Invitation.countDocuments({ status: 'pending' });
  const result = await Invitation.deleteMany({ status: 'pending' });

  console.log(`Deleted ${result.deletedCount} pending invitation(s) out of ${pendingCount} found.`);
}

clearPendingInvitations()
  .catch((err) => {
    console.error('Failed to clear pending invitations:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
