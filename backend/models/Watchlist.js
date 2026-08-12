const mongoose = require('mongoose');

const WatchlistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  movieId: {
    type: String, // TMDB or IMDb ID
    required: true,
  },
  title: String,
  year: String,
  poster: String,
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure a user can't add the same movie twice
WatchlistSchema.index({ userId: 1, movieId: 1 }, { unique: true });

module.exports = mongoose.model('Watchlist', WatchlistSchema);