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
    size: { type: Number, default: null },
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
  context: {
    browser: { type: String, default: null },
    os: { type: String, default: null },
    screen: {
      _id: false,
      w: { type: Number, default: undefined },
      h: { type: Number, default: undefined },
      dpr: { type: Number, default: undefined },
    },
    pageTitle: { type: String, default: null },
    elementText: { type: String, default: null },
    consoleErrors: [{
      _id: false,
      level: { type: String, enum: ['error', 'warn'], default: 'error' },
      message: { type: String },
      at: { type: Date, default: Date.now },
    }],
    failedRequests: [{
      _id: false,
      method: { type: String, default: 'GET' },
      url: { type: String },
      status: { type: Number },
    }],
    timeZone: { type: String, default: null },
    language: { type: String, default: null },
  },
}, { timestamps: true });

pinSchema.index({ project: 1, pageUrl: 1, deviceMode: 1 });
pinSchema.index({ project: 1, pinNumber: 1 }, { unique: true, sparse: true });
// Unfiltered project pin list, sorted newest first
pinSchema.index({ project: 1, createdAt: -1 });

module.exports = mongoose.model('Pin', pinSchema);
