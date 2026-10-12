const { GoogleGenAI } = require('@google/genai');

const PILLARS = ['verified_ratings', 'critical_craft', 'audience_satisfaction', 'theatrical_cultural_impact'];
const WEIGHTS = { verified_ratings: 3.5, critical_craft: 3.5, audience_satisfaction: 2, theatrical_cultural_impact: 1 };

const SYSTEM_PROMPT = `You are CINEVORA AI, an authoritative, objective cinematic intelligence and evaluation engine.
Evaluate and rank 2 to 5 movies by true cinematic excellence, verified audience reception, and critical consensus.
Never penalize older films, direct-to-OTT releases, or smaller independent dramas because they have lower current social media activity. Never equate marketing budget or viral teaser buzz with quality. Score films with prestigious honors, permanent artistic merit, and word-of-mouth legacy on those merits rather than temporary hashtag volume.
Use exactly four pillars, each scored from 1.0 to 10.0: verified_ratings (35%), critical_craft (35%), audience_satisfaction (20%), theatrical_cultural_impact (10%).
Calculate composite_score exactly as (verified_ratings * 3.5) + (critical_craft * 3.5) + (audience_satisfaction * 2.0) + (theatrical_cultural_impact * 1.0).
Use these exact categories: 85.0-100.0 MUST WATCH; 75.0-84.9 GOOD; 65.0-74.9 ABOVE AVERAGE; 50.0-64.9 AVERAGE; below 50.0 BAD / SKIP.
Return only valid raw JSON with exactly the keys comparison_summary and movies. comparison_summary must contain winner, a two-sentence winner_reason, and total_compared. Each movie must contain rank, title, year, scores, composite_score, verdict_category, recommendation, key_highlights, and verdict_summary. recommendation must be exactly THEATRE, OTT, or SKIP. Do not use markdown or code fences.`;

const roundScore = value => Math.round(Math.max(1, Math.min(10, Number(value) || 1)) * 10) / 10;
const roundComposite = value => Math.round(Math.max(0, Math.min(100, value)) * 10) / 10;

const getVerdictCategory = score => {
  if (score >= 85) return 'MUST WATCH';
  if (score >= 75) return 'GOOD';
  if (score >= 65) return 'ABOVE AVERAGE';
  if (score >= 50) return 'AVERAGE';
  return 'BAD / SKIP';
};

const twoSentenceReason = (reason, winner) => {
  const sentences = String(reason || '').match(/[^.!?]+[.!?]+/g) || [];
  if (sentences.length >= 2) return sentences.slice(0, 2).join(' ').trim();
  return `${winner} achieved the highest weighted composite score in this comparison. Its storytelling and critical standing place it at the top of the ranking.`;
};

const parseModelJson = text => {
  const cleaned = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    throw new Error('Gemini returned invalid JSON');
  }
};

const normalizeComparison = (comparison, titles) => {
  if (!comparison || !comparison.comparison_summary || !Array.isArray(comparison.movies) || comparison.movies.length !== titles.length) {
    throw new Error('Gemini returned an invalid comparison shape');
  }
  const movies = comparison.movies.map((movie, index) => {
    if (!movie || typeof movie.title !== 'string' || !movie.scores || !PILLARS.every(pillar => pillar in movie.scores)) {
      throw new Error('Gemini returned incomplete movie scores');
    }
    const scores = Object.fromEntries(PILLARS.map(pillar => [pillar, roundScore(movie.scores[pillar])]));
    const compositeScore = roundComposite(PILLARS.reduce((total, pillar) => total + scores[pillar] * WEIGHTS[pillar], 0));
    return {
      rank: index + 1,
      title: movie.title,
      year: Number.isInteger(Number(movie.year)) ? Number(movie.year) : 0,
      scores,
      composite_score: compositeScore,
      verdict_category: getVerdictCategory(compositeScore),
      recommendation: ['THEATRE', 'OTT', 'SKIP'].includes(movie.recommendation) ? movie.recommendation : 'OTT',
      key_highlights: Array.isArray(movie.key_highlights) ? movie.key_highlights.map(String).slice(0, 5) : [],
      verdict_summary: String(movie.verdict_summary || 'A balanced result across verified ratings, craft, audience satisfaction, and cultural impact.'),
    };
  });
  const winner = movies.reduce((best, movie) => movie.composite_score > best.composite_score ? movie : best);
  movies.sort((left, right) => right.composite_score - left.composite_score).forEach((movie, index) => { movie.rank = index + 1; });
  return {
    comparison_summary: {
      winner: winner.title,
      winner_reason: twoSentenceReason(comparison.comparison_summary.winner_reason, winner.title),
      total_compared: movies.length,
    },
    movies,
  };
};

async function getCinevoraComparison(movieList) {
  if (!Array.isArray(movieList) || movieList.length < 2 || movieList.length > 5 || movieList.some(title => typeof title !== 'string' || !title.trim())) {
    throw new Error('movieList must contain 2 to 5 non-empty movie titles');
  }
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');
  const titles = movieList.map(title => title.trim());
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Compare and evaluate the following films: ${titles.join(', ')}`,
    config: { systemInstruction: SYSTEM_PROMPT, responseMimeType: 'application/json' },
  });
  return normalizeComparison(parseModelJson(response.text), titles);
}

module.exports = { getCinevoraComparison, normalizeComparison, getVerdictCategory, SYSTEM_PROMPT };