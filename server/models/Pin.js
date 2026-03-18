const mongoose = require('mongoose');
const { Schema } = mongoose;

const pinSchema = new Schema({
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  pageUrl: {
    type: String,
    required: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  xPercent: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  yPercent: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  selector: {
    type: String,
    default: null,
  },
  elementOffsetX: {
    type: Number,
    default: null,
  },
  elementOffsetY: {
    type: Number,
    default: null,
  },
  status: {
    type: String,
    enum: ['pending', 'resolved'],
    default: 'pending',
  },
}, { timestamps: true });

pinSchema.index({ project: 1, pageUrl: 1 });

module.exports = mongoose.model('Pin', pinSchema);
