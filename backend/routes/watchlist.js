const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Watchlist = require('../models/Watchlist');

// Get user's watchlist
router.get('/', auth, async (req, res) => {
  try {
    const items = await Watchlist.find({ userId: req.user._id }).sort({ addedAt: -1 });
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Add to watchlist
router.post('/', auth, async (req, res) => {
  try {
    const { movieId, title, year, poster } = req.body;
    if (!movieId) return res.status(400).json({ success: false, message: 'movieId required' });

    const existing = await Watchlist.findOne({ userId: req.user._id, movieId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Already in watchlist' });
    }

    const item = new Watchlist({
      userId: req.user._id,
      movieId,
      title,
      year,
      poster,
    });
    await item.save();
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Remove from watchlist
router.delete('/', auth, async (req, res) => {
  try {
    const { movieId } = req.body;
    if (!movieId) return res.status(400).json({ success: false, message: 'movieId required' });
    const result = await Watchlist.findOneAndDelete({ userId: req.user._id, movieId });
    if (!result) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    res.json({ success: true, message: 'Removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;