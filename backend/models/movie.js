const fetch = require('node-fetch');
const { getYear, isBlocked } = require('../utils/helpers');

const TMDB_BASE = 'https://api.themoviedb.org/3';
const API_KEY = process.env.TMDB_API_KEY;

const tmdbFetch = async (endpoint, params = {}) => {
  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.search = new URLSearchParams({
    api_key: API_KEY,
    language: 'en-US',
    ...params,
  });
  const res = await fetch(url);
  return res.json();
};

const filterMovies = (movies) => {
  if (!movies) return [];
  return movies.filter(m => !isBlocked(m.title || m.name));
};

// Trending
exports.getTrending = async (req, res) => {
  try {
    const data = await tmdbFetch('/trending/movie/day');
    res.json({ success: true, results: filterMovies(data.results || []) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Top Rated
exports.getTopRated = async (req, res) => {
  try {
    const data = await tmdbFetch('/movie/top_rated');
    res.json({ success: true, results: filterMovies(data.results) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Now Playing
exports.getNowPlaying = async (req, res) => {
  try {
    const data = await tmdbFetch('/movie/now_playing');
    res.json({ success: true, results: filterMovies(data.results) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Popular
exports.getPopular = async (req, res) => {
  try {
    const data = await tmdbFetch('/movie/popular');
    res.json({ success: true, results: filterMovies(data.results) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Discover
exports.discover = async (req, res) => {
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
};

// Search
exports.search = async (req, res) => {
  try {
    const { query } = req.params;
    const data = await tmdbFetch('/search/movie', { query });
    res.json({ success: true, results: filterMovies(data.results) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Detail
exports.getDetail = async (req, res) => {
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
};

// Find by IMDb ID
exports.findByImdb = async (req, res) => {
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
};