const User = require('../models/User');
const AdminUser = require('../models/AdminUser');
const Activity = require('../models/Activity');
const AdminNote = require('../models/AdminNote');
const Organization = require('../models/Organization');

/**
 * Moves admin accounts that still live in the customer User collection
 * (role 'superadmin', from before AdminUser existed) into AdminUser: same
 * password hash and 2FA, their action-log entries and notes re-pointed, then
 * the old User removed (or, for a customer who had been promoted, kept with
 * their organization role). Safe to run any number of times and from several
 * processes at once (upserts by email). Returns how many were moved.
 */
async function migrateLegacyAdmins() {
  // Raw documents: keeps every stored field, including 2FA from before the move
  const legacy = await User.collection.find({ role: 'superadmin' }).toArray();
  let moved = 0;
  for (const old of legacy) {
    const email = String(old.email || '').toLowerCase().trim();
    if (!email) continue;
    // Raw update: the stored hash must not be hashed again by the save hook
    await AdminUser.collection.updateOne(
      { email },
      {
        $setOnInsert: {
          name: old.name,
          email,
          passwordHash: old.passwordHash,
          status: 'active',
          invitedBy: null,
          sessionToken: null,
          lastLoginAt: null,
          lastLoginIp: old.lastLoginIp || null,
          lastSeen: old.lastSeen || null,
          twoFactor: old.twoFactor?.enabled ? old.twoFactor : { enabled: false, enabledAt: null, lastUsedStep: 0, recoveryCodes: [] },
          createdAt: old.createdAt || new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );
    const admin = await AdminUser.findOne({ email }).select('_id');
    await AdminNote.updateMany({ author: old._id }, { $set: { author: admin._id } });
    if (old.organization) {
      // A customer who had been promoted to superadmin: keep the customer
      // account (projects, pins and the org still point at it), back at the
      // organization role it had, and move only the admin-panel actions.
      const org = await Organization.findById(old.organization).select('owner').lean();
      const role = org && String(org.owner) === String(old._id) ? 'owner' : 'admin';
      await Activity.updateMany(
        { actor: old._id, 'metadata.actorRole': 'superadmin' },
        { $set: { adminActor: admin._id, actor: null } },
      );
      await User.collection.updateOne({ _id: old._id, role: 'superadmin' }, { $set: { role } });
    } else {
      await Activity.updateMany({ actor: old._id }, { $set: { adminActor: admin._id, actor: null } });
      await User.deleteOne({ _id: old._id });
    }
    moved += 1;
    console.log(`[admins] moved ${email} to the admin accounts`);
  }
  return moved;
}

module.exports = { migrateLegacyAdmins };
