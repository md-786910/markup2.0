/**
 * One-off backfill: set `provider: 'razorpay'` on every existing Invoice
 * doc that pre-dates the multi-provider migration. Mongoose applies the
 * default on read, but we want it persisted explicitly so future provider-
 * aware queries can rely on a present `provider` field.
 *
 * Usage:
 *   cd server && node scripts/backfillInvoiceProvider.js
 *
 * Safe to re-run: matches only documents missing the field.
 */

require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('[backfill] MONGODB_URI not set');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[backfill] connected to MongoDB');

  const result = await Invoice.updateMany(
    { provider: { $exists: false } },
    { $set: { provider: 'razorpay' } }
  );
  console.log(`[backfill] matched=${result.matchedCount} modified=${result.modifiedCount}`);

  await mongoose.disconnect();
  console.log('[backfill] done');
}

main().catch((err) => {
  console.error('[backfill] fatal:', err);
  process.exit(1);
});
