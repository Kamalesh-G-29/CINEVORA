const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const History = require('../models/History');

// Get user's history
router.get('/', auth, async (req, res) => {
  try {
    const items = await History.find({ userId: req.user._id }).sort({ viewedAt: -1 });
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Add to history (or update timestamp)
router.post('/', auth, async (req, res) => {
  try {
    const { movieId, title, year, poster } = req.body;
    if (!movieId) return res.status(400).json({ success: false, message: 'movieId required' });

    // Upsert
    const item = await History.findOneAndUpdate(
      { userId: req.user._id, movieId },
      { title, year, poster, viewedAt: Date.now() },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Remove from history
router.delete('/', auth, async (req, res) => {
  try {
    const { movieId } = req.body;
    if (!movieId) return res.status(400).json({ success: false, message: 'movieId required' });
    const result = await History.findOneAndDelete({ userId: req.user._id, movieId });
    if (!result) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    res.json({ success: true, message: 'Removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Clear all history
router.delete('/all', auth, async (req, res) => {
  try {
    await History.deleteMany({ userId: req.user._id });
    res.json({ success: true, message: 'History cleared' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;