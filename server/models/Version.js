const mongoose = require('mongoose');
const { Schema } = mongoose;

const versionSchema = new Schema({
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  versionNumber: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    default: null,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  notes: {
    type: String,
    default: '',
  },
  pinSnapshot: {
    type: Number,
    default: 0,
  },
  resolvedSnapshot: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

versionSchema.index({ project: 1, versionNumber: -1 });

module.exports = mongoose.model('Version', versionSchema);
