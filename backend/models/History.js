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
  viewedAt: {
    type: Date,
    default: Date.now,
  },
});

HistorySchema.index({ userId: 1, movieId: 1 }, { unique: true });

module.exports = mongoose.model('History', HistorySchema);