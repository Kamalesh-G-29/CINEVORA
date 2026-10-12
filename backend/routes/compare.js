const express = require('express');
const { getCinevoraComparison } = require('../services/geminiComparison');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { movies } = req.body || {};
    if (!Array.isArray(movies) || movies.length < 2 || movies.length > 5) {
      return res.status(400).json({ error: 'Please provide between 2 and 5 movie titles.' });
    }

    const titles = movies.map(movie => typeof movie === 'string' ? movie.trim() : '');
    if (titles.some(title => !title || title.length > 200)) {
      return res.status(400).json({ error: 'Each movie title must be a non-empty string under 200 characters.' });
    }
    if (new Set(titles.map(title => title.toLowerCase())).size !== titles.length) {
      return res.status(400).json({ error: 'Movie titles must be unique.' });
    }

    return res.status(200).json(await getCinevoraComparison(titles));
  } catch (error) {
    console.error('Cinevora Engine Error:', error.message);
    const status = error.message === 'GEMINI_API_KEY is not configured' ? 503 : 502;
    return res.status(status).json({ error: 'Failed to generate comparison verdict.' });
  }
});

module.exports = router;