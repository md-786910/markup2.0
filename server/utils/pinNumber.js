const Pin = require('../models/Pin');

// Creates a pin with the project's next pin number. Numbers are unique per
// project (index { project, pinNumber }); two pins posted at the same moment
// can pick the same number, so a duplicate-key clash retries with a new one.
async function createNumberedPin(projectId, fields, attempts = 5) {
  for (let i = 0; ; i += 1) {
    const last = await Pin.findOne({ project: projectId }).sort({ pinNumber: -1 }).select('pinNumber').lean();
    const pinNumber = (last?.pinNumber || 0) + 1;
    try {
      return await Pin.create({ ...fields, project: projectId, pinNumber });
    } catch (err) {
      const clash = err?.code === 11000 && /pinNumber/.test(String(err.message || '') + JSON.stringify(err.keyPattern || {}));
      if (!clash || i >= attempts - 1) throw err;
    }
  }
}

module.exports = { createNumberedPin };
