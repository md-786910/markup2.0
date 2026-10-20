const mongoose = require('mongoose');
const { Schema } = mongoose;

const commentSchema = new Schema({
  pin: {
    type: Schema.Types.ObjectId,
    ref: 'Pin',
    required: true,
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  body: {
    type: String,
    required: [true, 'Comment body is required'],
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    path: String,
  }],
  parentComment: {
    type: Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
  },
  mentions: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  authorGuest: {
    name: { type: String, default: null },
    email: { type: String, default: null },
  },
}, { timestamps: true });

commentSchema.index({ pin: 1, createdAt: 1 });

module.exports = mongoose.model('Comment', commentSchema);
