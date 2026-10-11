const mongoose = require('mongoose');

const MovieReceptionSchema = new mongoose.Schema({
  movieId: { type: String, required: true, unique: true },
  tmdbRating: { type: Number, default: null },
  tmdbVotes: { type: Number, default: 0 },
  imdbRating: { type: Number, default: null },
  imdbVotes: { type: String, default: '' },
  social: {
    total: { type: Number, default: 0 },
    engagement: { type: Number, default: 0 },
    positive: { type: Number, default: 0 },
    neutral: { type: Number, default: 0 },
    negative: { type: Number, default: 0 },
    source: { type: String, default: 'Reddit' },
  },
  sourceStatus: {
    imdb: { available: { type: Boolean, default: false }, message: { type: String, default: '' } },
    social: { available: { type: Boolean, default: false }, message: { type: String, default: '' } },
  },
  checkedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('MovieReception', MovieReceptionSchema);
