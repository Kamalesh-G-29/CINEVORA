const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const Session = require('../models/Session');

// ─── REGISTER ──────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Basic validation
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, password, and name'
      });
    }

    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Create new user (password will be hashed by pre-save hook in User model)
    const user = new User({ email, password, name });
    await user.save();

    res.status(201).json({
      success: true,
      message: 'User created successfully'
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// ─── LOGIN ──────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Compare password (using instance method from User model)
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT
    const session = await Session.create({
      userId: user._id,
      device: req.get('user-agent') || 'unknown',
    });
    user.lastLogin = session.loginTime;
    await user.save();

    const token = jwt.sign(
      { id: user._id, sessionId: session._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// ─── LOGOUT (Protected) ───────────────────────────────────
router.post('/logout', auth, async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.sessionId,
      userId: req.user._id,
      active: true,
    });
    if (session) {
      const logoutTime = new Date();
      session.logoutTime = logoutTime;
      session.duration = Math.max(0, Math.floor((logoutTime - session.loginTime) / 1000));
      session.active = false;
      await session.save();
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET CURRENT USER (Protected) ─────────────────────────
router.get('/me', auth, async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

module.exports = router;