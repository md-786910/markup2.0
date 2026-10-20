const mongoose = require('mongoose');

// Atomic sequences (e.g. tax invoice numbers). One document per sequence name.
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', counterSchema);

// Returns the next value of a sequence (1, 2, 3, ...). Safe under concurrency.
async function nextSequence(name) {
  const doc = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' },
  );
  return doc.seq;
}

module.exports = { Counter, nextSequence };
