const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Review = require('../models/Review');

// Get reviews for a movie
router.get('/:movieId', async (req, res) => {
  try {
    const reviews = await Review.find({ movieId: req.params.movieId }).sort({ createdAt: -1 });
    res.json({ success: true, data: reviews });
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
    if (!movieId || !stars || !text) {
      return res.status(400).json({ success: false, message: 'Missing fields' });
    }
    const review = new Review({
      userId: req.user._id,
      movieId,
      stars,
      text,
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
    // If reviewId is numeric index, we need to find by userId and movieId, then remove by index
    // But we store _id, so we can use findByIdAndDelete with ownership check
    const review = await Review.findOne({ _id: reviewId, userId: req.user._id });
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