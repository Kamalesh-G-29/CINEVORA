const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  movieId: {
    type: String,
    required: true,
  },
  stars: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  text: {
    type: String,
    required: true,
    trim: true,
  },
  name: String,   // denormalized for quick display
  email: String,  // denormalized
  date: {
    type: String,
    default: () => new Date().toLocaleDateString(),
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

ReviewSchema.index({ userId: 1, movieId: 1 });

module.exports = mongoose.model('Review', ReviewSchema);