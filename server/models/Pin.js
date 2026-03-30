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
    default: null,
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
  documentWidth: {
    type: Number,
    default: null,
  },
  documentHeight: {
    type: Number,
    default: null,
  },
  deviceMode: {
    type: String,
    enum: ['desktop', 'tablet', 'mobile'],
    default: 'desktop',
  },
  pinNumber: {
    type: Number,
    default: null,
  },
  viewportXPercent: {
    type: Number,
    default: null,
  },
  viewportYPercent: {
    type: Number,
    default: null,
  },
  screenshot: {
    filename: { type: String, default: null },
    path: { type: String, default: null },
  },
  status: {
    type: String,
    enum: ['pending', 'resolved'],
    default: 'pending',
  },
  createdByGuest: {
    name: { type: String, default: null },
    email: { type: String, default: null },
  },
  version: {
    type: Schema.Types.ObjectId,
    ref: 'Version',
    default: null,
  },
}, { timestamps: true });

pinSchema.index({ project: 1, pageUrl: 1, deviceMode: 1 });
pinSchema.index({ project: 1, pinNumber: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Pin', pinSchema);
