const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const History = require('../models/History');

function normalizedProgress(value) {
  const progress = Number(value);
  if (!Number.isFinite(progress)) return 0;
  return Math.min(100, Math.max(0, progress));
}

function normalizedDuration(value) {
  const duration = Number(value);
  if (!Number.isFinite(duration)) return 0;
  return Math.max(0, Math.floor(duration));
}

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

// Start or resume a playback record
router.post('/watch/start', auth, async (req, res) => {
  try {
    const { movieId, title, year, poster } = req.body;
    if (!movieId) return res.status(400).json({ success: false, message: 'movieId required' });

    const item = await History.findOneAndUpdate(
      { userId: req.user._id, movieId: String(movieId) },
      {
        $set: {
          title,
          year,
          poster,
          startedAt: new Date(),
          viewedAt: new Date(),
          endedAt: null,
          watchDuration: 0,
          progress: 0,
          completed: false,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Persist playback progress when the player closes or periodically updates
router.patch('/watch/update', auth, async (req, res) => {
  try {
    const { movieId, watchDuration, progress, completed } = req.body;
    if (!movieId) return res.status(400).json({ success: false, message: 'movieId required' });

    const item = await History.findOneAndUpdate(
      { userId: req.user._id, movieId: String(movieId) },
      {
        $set: {
          endedAt: new Date(),
          watchDuration: normalizedDuration(watchDuration),
          progress: normalizedProgress(progress),
          completed: Boolean(completed) || normalizedProgress(progress) >= 90,
          viewedAt: new Date(),
        },
      },
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ success: false, message: 'Playback record not found' });
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