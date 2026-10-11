const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SearchHistory = require('../models/SearchHistory');

router.get('/', auth, async (req, res) => {
  try {
    const items = await SearchHistory.find({ userId: req.user._id })
      .sort({ searchedAt: -1 })
      .limit(100);
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const query = String(req.body.query || '').trim();
    if (!query) return res.status(400).json({ success: false, message: 'query required' });

    const item = await SearchHistory.create({ userId: req.user._id, query });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/', auth, async (req, res) => {
  try {
    await SearchHistory.deleteMany({ userId: req.user._id });
    res.json({ success: true, message: 'Search history cleared' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
