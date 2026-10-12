const fetch = require('node-fetch');
const MovieReception = require('../models/MovieReception');
const Review = require('../models/Review');
const { classifySentiment } = require('./sentiment');

const TMDB_BASE = 'https://api.themoviedb.org/3';
const OMDB_BASE = 'https://www.omdbapi.com/';
const REDDIT_TOKEN_URL = 'https://www.reddit.com/api/v1/access_token';
const REDDIT_API_BASE = 'https://oauth.reddit.com';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

async function readJson(response, source) {
  if (!response.ok) throw new Error(`${source} returned HTTP ${response.status}`);
  return response.json();
}

async function fetchExternal(url, options, source) {
  try {
    return await fetch(url, { timeout: 10000, ...options });
  } catch (err) {
    const code = err.code || err.type;
    throw new Error(`${source} request failed${code ? ` (${code})` : ''}`);
  }
}

async function getTmdbMovie(movieId) {
  if (!process.env.TMDB_API_KEY) throw new Error('TMDB_API_KEY is not configured');
  const url = new URL(`${TMDB_BASE}/movie/${encodeURIComponent(movieId)}`);
  url.search = new URLSearchParams({
    api_key: process.env.TMDB_API_KEY,
    language: 'en-US',
  });
  const movie = await readJson(await fetchExternal(url.toString(), {}, 'TMDB'), 'TMDB');
  if (movie.status_code || !movie.id) throw new Error('Movie was not found on TMDB');
  return movie;
}

async function getOmdbRating(imdbId) {
  if (!process.env.OMDB_API_KEY) {
    return { rating: null, votes: '', status: { available: false, message: 'OMDb API key is not configured' } };
  }
  if (!imdbId) {
    return { rating: null, votes: '', status: { available: false, message: 'IMDb ID is not available' } };
  }

  const url = new URL(OMDB_BASE);
  url.search = new URLSearchParams({ apikey: process.env.OMDB_API_KEY, i: imdbId, r: 'json' });
  const data = await readJson(await fetchExternal(url.toString(), {}, 'OMDb'), 'OMDb');
  const imdbRating = Number(data.imdbRating);
  if (data.Response !== 'True' || !Number.isFinite(imdbRating)) {
    return { rating: null, votes: '', status: { available: false, message: data.Error || 'IMDb rating is unavailable' } };
  }
  return {
    rating: imdbRating,
    votes: data.imdbVotes || '',
    status: { available: true, message: '' },
  };
}

async function getRedditSentiment(title, releaseDate) {
  const { REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USER_AGENT } = process.env;
  if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET || !REDDIT_USER_AGENT) {
    return {
      social: { total: 0, engagement: 0, positive: 0, neutral: 0, negative: 0, source: 'Reddit' },
      status: { available: false, message: 'Reddit API credentials are not configured' },
    };
  }

  const auth = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString('base64');
  const tokenResponse = await fetchExternal(REDDIT_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': REDDIT_USER_AGENT,
    },
    body: 'grant_type=client_credentials',
  }, 'Reddit OAuth');
  const tokenData = await readJson(tokenResponse, 'Reddit OAuth');
  if (!tokenData.access_token) throw new Error('Reddit OAuth did not return an access token');

  const year = String(releaseDate || '').slice(0, 4);
  const query = [title, year].filter(Boolean).join(' ');
  const url = new URL(`${REDDIT_API_BASE}/search.json`);
  url.search = new URLSearchParams({ q: query, sort: 'relevance', limit: '50', type: 'link' });
  const searchResponse = await fetchExternal(url.toString(), {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'User-Agent': REDDIT_USER_AGENT,
    },
  }, 'Reddit Search');
  const searchData = await readJson(searchResponse, 'Reddit Search');
  const posts = (searchData.data?.children || []).map(item => item.data).filter(Boolean);
  const counts = { total: posts.length, engagement: 0, positive: 0, neutral: 0, negative: 0, source: 'Reddit' };
  for (const post of posts) {
    const sentiment = classifySentiment(`${post.title || ''} ${post.selftext || ''}`);
    const reactions = Math.max(0, Number(post.score) || 0) + Math.max(0, Number(post.num_comments) || 0);
    counts.engagement += reactions;
    counts[sentiment] += reactions || 1;
  }
  return { social: counts, status: { available: true, message: '' } };
}

function summarizeSentiment(reviews, social) {
  const counts = { positive: 0, neutral: 0, negative: 0 };
  for (const review of reviews) {
    counts[classifySentiment(review.text)] += 1;
  }
  for (const sentiment of ['positive', 'neutral', 'negative']) {
    counts[sentiment] += social[sentiment] || 0;
  }

  const total = counts.positive + counts.neutral + counts.negative;
  const percentages = { positive: 0, neutral: 0, negative: 0 };
  if (total) {
    const values = Object.entries(counts).map(([key, value]) => {
      const exact = (value / total) * 100;
      percentages[key] = Math.floor(exact);
      return { key, remainder: exact - percentages[key] };
    }).sort((a, b) => b.remainder - a.remainder);
    const remaining = 100 - Object.values(percentages).reduce((sum, value) => sum + value, 0);
    for (let index = 0; index < remaining; index += 1) {
      percentages[values[index].key] += 1;
    }
  }
  return { counts, percentages, total };
}

function calculatePrediction({ tmdbRating, imdbRating, reviews, social }) {
  const candidates = [];
  if (Number.isFinite(tmdbRating) && tmdbRating > 0) {
    candidates.push({ value: tmdbRating * 10, weight: 0.35 });
  }
  if (Number.isFinite(imdbRating) && imdbRating > 0) {
    candidates.push({ value: imdbRating * 10, weight: 0.35 });
  }
  if (reviews.length) {
    const reviewCounts = { positive: 0, neutral: 0, negative: 0 };
    for (const review of reviews) reviewCounts[classifySentiment(review.text)] += 1;
    const total = reviews.length;
    candidates.push({
      value: ((reviewCounts.positive + reviewCounts.neutral * 0.5) / total) * 100,
      weight: 0.15,
    });
  }
  const socialSampleSize = social.positive + social.neutral + social.negative;
  if (socialSampleSize > 0) {
    candidates.push({
      value: ((social.positive + social.neutral * 0.5) / socialSampleSize) * 100,
      weight: 0.15,
    });
  }

  const weightTotal = candidates.reduce((sum, item) => sum + item.weight, 0);
  if (!weightTotal) return null;
  return Math.round(candidates.reduce((sum, item) => sum + item.value * item.weight, 0) / weightTotal);
}

async function refreshExternalSources(movie, cached) {
  if (cached && Date.now() - cached.checkedAt.getTime() < CACHE_TTL_MS) return cached;

  const [imdbResult, socialResult] = await Promise.all([
    getOmdbRating(movie.imdb_id).catch(error => ({
      rating: null,
      votes: '',
      status: { available: false, message: error.message },
    })),
    getRedditSentiment(movie.title, movie.release_date).catch(error => ({
      social: { total: 0, engagement: 0, positive: 0, neutral: 0, negative: 0, source: 'Reddit' },
      status: { available: false, message: error.message },
    })),
  ]);

  const snapshot = await MovieReception.findOneAndUpdate(
    { movieId: String(movie.id) },
    {
      movieId: String(movie.id),
      tmdbRating: movie.vote_average != null && Number.isFinite(Number(movie.vote_average))
        ? Number(movie.vote_average)
        : null,
      tmdbVotes: Number(movie.vote_count) || 0,
      imdbRating: imdbResult.rating,
      imdbVotes: imdbResult.votes,
      social: socialResult.social,
      sourceStatus: { imdb: imdbResult.status, social: socialResult.status },
      checkedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return snapshot;
}

async function getAudienceReception(movieId) {
  const movie = await getTmdbMovie(movieId);
  const cached = await MovieReception.findOne({ movieId: String(movie.id) });
  const snapshot = await refreshExternalSources(movie, cached);
  const reviews = await Review.find({ movieId: String(movie.id) }).select('text stars');
  const social = snapshot.social || { total: 0, engagement: 0, positive: 0, neutral: 0, negative: 0, source: 'Reddit' };
  const sentiment = summarizeSentiment(reviews, social);
  const score = calculatePrediction({
    tmdbRating: snapshot.tmdbRating,
    imdbRating: snapshot.imdbRating,
    reviews,
    social,
  });

  return {
    movie: { id: String(movie.id), title: movie.title },
    score,
    prediction: score === null ? 'Not enough data' : score >= 70 ? 'Likely positive' : score >= 45 ? 'Mixed reception' : 'At risk of negative reception',
    confidence: Math.min(100, Math.round(
      (Math.min(snapshot.tmdbVotes || 0, 1000) / 1000) * 35
      + (snapshot.imdbRating ? 25 : 0)
      + (Math.min(reviews.length, 50) / 50) * 20
      + (Math.min(social.total || 0, 50) / 50) * 20,
    )),
    sentiment: { ...sentiment, reviews: reviews.length, social: social.total || 0 },
    sources: {
      tmdb: { rating: snapshot.tmdbRating, scale: 10, votes: snapshot.tmdbVotes || 0, available: snapshot.tmdbRating !== null },
      imdb: {
        rating: snapshot.imdbRating,
        scale: 10,
        votes: snapshot.imdbVotes || '',
        ...snapshot.sourceStatus.imdb.toObject(),
      },
      reviews: { count: reviews.length, averageStars: reviews.length
        ? Math.round((reviews.reduce((sum, review) => sum + review.stars, 0) / reviews.length) * 10) / 10
        : null },
      social: { ...social.toObject(), ...snapshot.sourceStatus.social.toObject() },
    },
    updatedAt: snapshot.checkedAt,
  };
}

module.exports = { getAudienceReception, calculatePrediction, summarizeSentiment };
