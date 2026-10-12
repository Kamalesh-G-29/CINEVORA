const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Review = require('../models/Review');
const { classifySentiment } = require('../services/sentiment');

// Get reviews for a movie
router.get('/:movieId', async (req, res) => {
  if (!/^\d{1,12}$/.test(req.params.movieId)) {
    return res.status(400).json({ success: false, message: 'A valid TMDB movie ID is required' });
  }
  try {
    const reviews = await Review.find({ movieId: req.params.movieId }).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: reviews.map(review => ({
        ...review.toObject(),
        sentiment: classifySentiment(review.text),
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all reviews for current user (for profile)
router.get('/', auth, async (req, res) => {
  try {
    const reviews = await Review.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create a review
router.post('/', auth, async (req, res) => {
  try {
    const { movieId, stars, text } = req.body;
    if (!/^\d{1,12}$/.test(String(movieId || ''))) {
      return res.status(400).json({ success: false, message: 'A valid TMDB movie ID is required' });
    }
    if (!Number.isInteger(Number(stars)) || Number(stars) < 1 || Number(stars) > 5) {
      return res.status(400).json({ success: false, message: 'Stars must be an integer from 1 to 5' });
    }
    if (typeof text !== 'string' || !text.trim() || text.trim().length > 2000) {
      return res.status(400).json({ success: false, message: 'Review text must be between 1 and 2000 characters' });
    }
    const review = new Review({
      userId: req.user._id,
      movieId: String(movieId),
      stars: Number(stars),
      text: text.trim(),
      sentiment: classifySentiment(text),
      name: req.user.name,
      email: req.user.email,
    });
    await review.save();
    res.json({ success: true, data: review });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete a review (only if owned)
router.delete('/', auth, async (req, res) => {
  try {
    const { movieId, reviewId } = req.body;
    if (!movieId || reviewId === undefined) {
      return res.status(400).json({ success: false, message: 'movieId and reviewId required' });
    }
    if (!/^\d{1,12}$/.test(String(movieId))) {
      return res.status(400).json({ success: false, message: 'A valid TMDB movie ID is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ success: false, message: 'A valid review ID is required' });
    }
    const review = await Review.findOne({ _id: reviewId, userId: req.user._id, movieId: String(movieId) });
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found or not owned' });
    }
    await review.deleteOne();
    res.json({ success: true, message: 'Review deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;