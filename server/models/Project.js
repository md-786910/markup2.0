const mongoose = require('mongoose');
const { Schema } = mongoose;

const projectSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
  },
  websiteUrl: {
    type: String,
    required: [true, 'Website URL is required'],
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  members: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active',
  },
}, { timestamps: true });

projectSchema.index({ owner: 1 });
projectSchema.index({ members: 1 });

module.exports = mongoose.model('Project', projectSchema);
