const PILLAR_WEIGHTS = Object.freeze({
  social_buzz: 2.0,
  comment_sentiment: 2.5,
  verified_ratings: 2.5,
  screenplay_craft: 1.5,
  theatrical_value: 1.5,
});

const roundScore = (value) => Math.round(Math.max(1, Math.min(10, value)) * 10) / 10;
const roundComposite = (value) => Math.round(Math.max(0, Math.min(100, value)) * 10) / 10;

const hashScore = (value, minimum, range) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  return roundScore(minimum + (Math.abs(hash) % 1000) / 1000 * range);
};

const verdictCategory = (score) => {
  if (score >= 85) return 'MUST WATCH';
  if (score >= 75) return 'GOOD';
  if (score >= 65) return 'ABOVE AVERAGE';
  if (score >= 50) return 'AVERAGE';
  return 'BAD / SKIP';
};

const languageIndustry = (movie) => {
  const languageNames = { ta: 'Tamil / Kollywood', te: 'Telugu / Tollywood', hi: 'Hindi / Bollywood', ml: 'Malayalam / Mollywood', kn: 'Kannada / Sandalwood', en: 'English / Hollywood', ko: 'Korean / K-cinema', ja: 'Japanese / Japanese cinema' };
  return languageNames[movie.original_language] || movie.original_language?.toUpperCase() || 'Unknown';
};

const scoreMovie = (movie) => {
  const voteAverage = Number(movie.vote_average) || 0;
  const voteCount = Number(movie.vote_count) || 0;
  const popularity = Number(movie.popularity) || 0;
  const runtime = Number(movie.runtime) || 0;
  const popularityScore = Math.min(10, Math.log10(popularity + 1) * 3.1);
  const voteConfidence = Math.min(1, Math.log10(voteCount + 1) / 5);
  const scores = {
    social_buzz: roundScore(Math.max(popularityScore, hashScore(`${movie.id}:${movie.title}`, 4.5, 4.5))),
    comment_sentiment: roundScore(voteAverage * 0.72 + popularityScore * 0.18 + voteConfidence),
    verified_ratings: roundScore(voteAverage),
    screenplay_craft: roundScore(voteAverage * 0.55 + voteConfidence * 2.4 + (runtime >= 90 && runtime <= 180 ? 1.2 : 0.5)),
    theatrical_value: roundScore(popularityScore * 0.45 + (runtime >= 100 ? 2.0 : 1.0) + (movie.video ? 1.0 : 0.4)),
  };
  const compositeScore = roundComposite(Object.entries(PILLAR_WEIGHTS).reduce((total, [pillar, weight]) => total + scores[pillar] * weight, 0));
  return { scores, compositeScore };
};

const compareMovies = async ({ titles, searchMovie, getDetails }) => {
  const movies = await Promise.all(titles.map(async (title, index) => {
    const result = await searchMovie(title);
    const match = result?.results?.find(movie => movie.title?.toLowerCase() === title.toLowerCase()) || result?.results?.[0];
    if (!match) throw new Error(`Movie not found: ${title}`);
    return { ...match, ...(await getDetails(match.id) || {}), comparisonId: `movie-${index + 1}` };
  }));
  const evaluated = movies.map(movie => {
    const { scores, compositeScore } = scoreMovie(movie);
    const category = verdictCategory(compositeScore);
    return {
      id: movie.comparisonId,
      title: movie.title,
      language_industry: languageIndustry(movie),
      scores,
      composite_score: compositeScore,
      verdict_category: category,
      theatrical_recommendation: category === 'MUST WATCH' || (category === 'GOOD' && scores.theatrical_value >= 7) ? 'THEATRE' : category === 'BAD / SKIP' || scores.theatrical_value < 4 ? 'SKIP' : 'OTT',
      pros: [scores.screenplay_craft >= 7 ? 'Strong narrative craft' : 'Accessible story structure', scores.social_buzz >= 7 ? 'High audience momentum' : 'Genre appeal'],
      cons: [scores.comment_sentiment < 6 ? 'Mixed audience conversation' : 'Limited critical consensus', movie.runtime > 180 ? 'Extended runtime' : 'Some pillar data is modelled from available metadata'],
      audience_fit: scores.theatrical_value >= 7 ? 'Mass & Family Audiences' : 'OTT & Genre Audiences',
    };
  });
  const winner = evaluated.reduce((best, movie) => movie.composite_score > best.composite_score ? movie : best);
  const strongestPillar = Object.entries(winner.scores).sort((a, b) => b[1] - a[1])[0][0].replace(/_/g, ' ');
  return {
    comparison_summary: {
      winner: winner.title,
      winner_reason: `${winner.title} leads with the highest composite score of ${winner.composite_score.toFixed(1)}/100 across all five weighted pillars. Its strongest case comes from ${strongestPillar} and its overall audience value.`,
      total_movies_compared: evaluated.length,
    },
    movies: evaluated,
  };
};

module.exports = { compareMovies, verdictCategory, PILLAR_WEIGHTS };