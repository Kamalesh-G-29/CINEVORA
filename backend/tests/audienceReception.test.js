const test = require('node:test');
const assert = require('node:assert/strict');
const { classifySentiment } = require('../services/sentiment');
const { calculatePrediction, summarizeSentiment } = require('../services/audienceReception');

test('classifies review text as positive, negative, or neutral', () => {
  assert.equal(classifySentiment('A brilliant and moving film'), 'positive');
  assert.equal(classifySentiment('Not a good film; it was boring'), 'negative');
  assert.equal(classifySentiment('The movie was released last year'), 'neutral');
});

test('normalizes prediction weights when data sources are missing', () => {
  assert.equal(calculatePrediction({
    tmdbRating: 8,
    imdbRating: null,
    reviews: [],
    social: { total: 0, positive: 0, neutral: 0, negative: 0 },
  }), 80);
});

test('combines ratings and review sentiment while keeping the score in range', () => {
  const score = calculatePrediction({
    tmdbRating: 8,
    imdbRating: 6,
    reviews: [{ text: 'Terrible and boring' }],
    social: { total: 0, positive: 0, neutral: 0, negative: 0 },
  });
  assert.equal(score, 58);
  assert.ok(score >= 0 && score <= 100);
});

test('aggregates user and social sentiment to percentages totaling 100', () => {
  const summary = summarizeSentiment(
    [{ text: 'Amazing story' }],
    { total: 3, positive: 0, neutral: 2, negative: 1 },
  );
  assert.deepEqual(summary.percentages, { positive: 25, neutral: 50, negative: 25 });
  assert.equal(summary.total, 4);
});

test('reports no score when no reception signals are available', () => {
  assert.equal(calculatePrediction({
    tmdbRating: null,
    imdbRating: null,
    reviews: [],
    social: { total: 0, positive: 0, neutral: 0, negative: 0 },
  }), null);
});
