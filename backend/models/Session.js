const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  loginTime: {
    type: Date,
    default: Date.now,
  },
  logoutTime: Date,
  duration: {
    type: Number,
    default: 0,
    min: 0,
  },
  device: {
    type: String,
    trim: true,
    default: 'unknown',
  },
  active: {
    type: Boolean,
    default: true,
    index: true,
  },
}, { timestamps: true, collection: 'sessions' });

SessionSchema.index({ userId: 1, loginTime: -1 });

module.exports = mongoose.model('Session', SessionSchema);
