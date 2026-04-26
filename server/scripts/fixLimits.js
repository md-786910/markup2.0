const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const { getLimitsForPlanAsync } = require('../config/plans');
require('dotenv').config({ path: '.env' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const orgs = await Organization.find({});
  for (const org of orgs) {
    const defaultLimits = await getLimitsForPlanAsync(org.plan);
    
    let changed = false;
    if (org.limits.hasIntegrations !== defaultLimits.hasIntegrations) {
      org.limits.hasIntegrations = defaultLimits.hasIntegrations;
      changed = true;
    }
    if (org.limits.hasActivityLogs !== defaultLimits.hasActivityLogs) {
      org.limits.hasActivityLogs = defaultLimits.hasActivityLogs;
      changed = true;
    }
    if (org.limits.hasVersionHistory !== defaultLimits.hasVersionHistory) {
      org.limits.hasVersionHistory = defaultLimits.hasVersionHistory;
      changed = true;
    }

    if (changed) {
      await org.save();
      console.log(`Updated limits for org ${org.name} (${org.plan})`);
    } else {
      console.log(`Org ${org.name} limits up to date`);
    }
  }

  console.log('Done');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
