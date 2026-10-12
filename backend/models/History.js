const mongoose = require('mongoose');

const HistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  movieId: {
    type: String,
    required: true,
  },
  title: String,
  year: String,
  poster: String,
  startedAt: {
    type: Date,
    default: Date.now,
  },
  endedAt: Date,
  watchDuration: {
    type: Number,
    default: 0,
    min: 0,
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  viewedAt: {
    type: Date,
    default: Date.now,
  },
}, { collection: 'watch_history' });

HistorySchema.index({ userId: 1, movieId: 1 }, { unique: true });

module.exports = mongoose.model('History', HistorySchema);