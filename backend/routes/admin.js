const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Session = require('../models/Session');
const History = require('../models/History');
const SearchHistory = require('../models/SearchHistory');

router.use(auth, (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
});

router.get('/summary', async (req, res) => {
  try {
    const [users, sessions, activeSessions, watchHistory, searches, recentSessions, movieTotals, mostWatched, recentWatchHistory] = await Promise.all([
      User.countDocuments(),
      Session.countDocuments(),
      Session.countDocuments({ active: true }),
      History.countDocuments(),
      SearchHistory.countDocuments(),
      Session.find().populate('userId', 'name email').sort({ loginTime: -1 }).limit(20),
      History.distinct('movieId'),
      History.aggregate([
        { $group: { _id: { movieId: '$movieId', title: '$title' }, views: { $sum: 1 } } },
        { $sort: { views: -1 } },
        { $limit: 10 },
        { $project: { _id: 0, movieId: '$_id.movieId', title: { $ifNull: ['$_id.title', 'Untitled movie'] }, views: 1 } },
      ]),
      History.find().populate('userId', 'name email').sort({ viewedAt: -1 }).limit(20).lean(),
    ]);

    res.json({
      success: true,
      data: { users, sessions, activeSessions, watchHistory, searches, totalMovies: movieTotals.length, recentSessions, mostWatched, recentWatchHistory },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
