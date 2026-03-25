const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
    select: false,
  },
  role: {
    type: String,
    enum: ['admin', 'member'],
    default: 'member',
  },
  avatar: {
    type: String,
    default: null,
  },
  lastSeen: {
    type: Date,
    default: null,
  },
  resetPasswordToken: {
    type: String,
    select: false,
  },
  resetPasswordExpires: {
    type: Date,
    select: false,
  },
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('passwordHash')) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
