/**
 * One-time migration script to assign pinNumber to existing pins.
 * Groups pins by project, sorts by createdAt ascending, and assigns sequential numbers.
 *
 * Usage: node server/scripts/migrate-pin-numbers.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Pin = require('../models/Pin');

async function migrate() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('No MONGO_URI or MONGODB_URI found in environment');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const projects = await Pin.distinct('project');
  console.log(`Found ${projects.length} project(s) with pins`);

  let totalUpdated = 0;

  for (const projectId of projects) {
    const pins = await Pin.find({ project: projectId }).sort({ createdAt: 1 });
    console.log(`  Project ${projectId}: ${pins.length} pin(s)`);

    for (let i = 0; i < pins.length; i++) {
      if (pins[i].pinNumber == null) {
        await Pin.updateOne({ _id: pins[i]._id }, { $set: { pinNumber: i + 1 } });
        totalUpdated++;
      }
    }
  }

  console.log(`Migration complete. Updated ${totalUpdated} pin(s).`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
