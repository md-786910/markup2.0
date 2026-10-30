/**
 * Compute health score (0-100) and band (healthy/watch/at_risk) for all organizations.
 * Usage: node scripts/computeHealth.js
 */

require('../config/env');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { computeHealthForAllOrgs } = require('../utils/customerHealth');

async function main() {
  await connectDB();
  console.log('Computing customer health scores for all organizations...');
  const start = Date.now();
  const summary = await computeHealthForAllOrgs();
  console.log(`Finished in ${Date.now() - start}ms:`, summary);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

