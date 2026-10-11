const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { getYear, isBlocked } = require('../utils/helpers');
const { compareMovies } = require('../services/movieComparison');
const { getCinevoraComparison } = require('../services/geminiComparison');

const TMDB_BASE = 'https://api.themoviedb.org/3';
const getApiKey = () => process.env.TMDB_API_KEY || '7248c5cc1f2080c7baf7361d2427fb80';

// Helper to call TMDB
const tmdbFetch = async (endpoint, params = {}) => {
  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.search = new URLSearchParams({
    api_key: getApiKey(),
    language: 'en-US',
    ...params,
  });
  const res = await fetch(url.toString());
  return res.json();
};

// Filter movies
const filterMovies = (movies) => {
  if (!movies || !Array.isArray(movies)) return [];
  return movies.filter(m => m && !isBlocked(m.title || m.name || ''));
};

// Trending
router.get('/trending', async (req, res) => {
  try {
    const data = await tmdbFetch('/trending/movie/day');
    const results = filterMovies(data.results || []);
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Top rated
router.get('/top-rated', async (req, res) => {
  try {
    const data = await tmdbFetch('/movie/top_rated');
    res.json({ success: true, results: filterMovies(data.results) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Now playing
router.get('/now-playing', async (req, res) => {
  try {
    const data = await tmdbFetch('/movie/now_playing');
    res.json({ success: true, results: filterMovies(data.results) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Popular
router.get('/popular', async (req, res) => {
  try {
    const data = await tmdbFetch('/movie/popular');
    res.json({ success: true, results: filterMovies(data.results) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Discover with filters
router.get('/discover', async (req, res) => {
  try {
    const { genre, language, sort } = req.query;
    const params = {
      sort_by: sort || 'popularity.desc',
      'vote_count.gte': 100,
    };
    if (genre && genre !== 'all') params.with_genres = genre;
    if (language && language !== 'all') params.with_original_language = language;
    const data = await tmdbFetch('/discover/movie', params);
    res.json({ success: true, results: filterMovies(data.results) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Search
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const data = await tmdbFetch('/search/movie', { query });
    res.json({ success: true, results: filterMovies(data.results) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/compare', async (req, res) => {
  try {
    const titles = req.body?.movies || req.body?.titles;
    if (!Array.isArray(titles) || titles.length < 2 || titles.length > 5) {
      return res.status(400).json({ success: false, message: 'Provide an array of 2 to 5 movie titles' });
    }
    const normalizedTitles = titles.map(title => typeof title === 'string' ? title.trim() : '');
    if (normalizedTitles.some(title => !title || title.length > 200)) {
      return res.status(400).json({ success: false, message: 'Each movie title must be a non-empty string under 200 characters' });
    }
    if (new Set(normalizedTitles.map(title => title.toLowerCase())).size !== normalizedTitles.length) {
      return res.status(400).json({ success: false, message: 'Movie titles must be unique' });
    }
    const comparison = await compareMovies({
      titles: normalizedTitles,
      searchMovie: title => tmdbFetch('/search/movie', { query: title }),
      getDetails: id => tmdbFetch(`/movie/${id}`, { append_to_response: 'videos,credits' }),
    });
    return res.json(comparison);
  } catch (err) {
    return res.status(502).json({ success: false, message: err.message });
  }
});

router.post('/compare-ai', async (req, res) => {
  try {
    const titles = req.body?.movies || req.body?.titles;
    if (!Array.isArray(titles) || titles.length < 2 || titles.length > 5) {
      return res.status(400).json({ message: 'Provide an array of 2 to 5 movie titles' });
    }
    return res.json(await getCinevoraComparison(titles));
  } catch (err) {
    const status = err.message === 'GEMINI_API_KEY is not configured' ? 503 : 502;
    return res.status(status).json({ message: err.message });
  }
});

// Movie detail
router.get('/detail/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await tmdbFetch(`/movie/${id}`, { append_to_response: 'videos,credits,recommendations' });
    if (!data || data.status_code) {
      return res.status(404).json({ success: false, message: 'Movie not found' });
    }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Find by IMDb ID
router.get('/find/:imdbId', async (req, res) => {
  try {
    const { imdbId } = req.params;
    const data = await tmdbFetch('/find/' + imdbId, { external_source: 'imdb_id' });
    const results = data?.movie_results || [];
    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    const movie = results[0];
    if (isBlocked(movie.title)) {
      return res.status(403).json({ success: false, message: 'Blocked content' });
    }
    res.json({ success: true, data: movie });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;