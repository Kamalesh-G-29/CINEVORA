const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// Update profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email required' });
    }
    // Check if email taken by another user
    const existing = await User.findOne({ email, _id: { $ne: req.user._id } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }
    req.user.name = name;
    req.user.email = email;
    await req.user.save();
    res.json({
      success: true,
      user: { id: req.user._id, email: req.user.email, name: req.user.name },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;