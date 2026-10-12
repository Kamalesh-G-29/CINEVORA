const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Session = require('../models/Session');

router.get('/', auth, async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.user._id })
      .sort({ loginTime: -1 })
      .limit(50);
    res.json({ success: true, data: sessions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/logout', auth, async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.sessionId,
      userId: req.user._id,
      active: true,
    });
    if (!session) return res.json({ success: true, message: 'No active session' });

    const logoutTime = new Date();
    session.logoutTime = logoutTime;
    session.duration = Math.max(0, Math.floor((logoutTime - session.loginTime) / 1000));
    session.active = false;
    await session.save();

    res.json({ success: true, data: session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
