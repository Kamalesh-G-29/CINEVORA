const POSITIVE_WORDS = new Set([
  'amazing', 'awesome', 'beautiful', 'brilliant', 'captivating', 'charming',
  'enjoy', 'enjoyed', 'excellent', 'fantastic', 'favorite', 'fun', 'good',
  'great', 'impressive', 'incredible', 'love', 'loved', 'masterpiece',
  'moving', 'perfect', 'powerful', 'recommend', 'recommended', 'refreshing',
  'solid', 'strong', 'superb', 'wonderful', 'worthwhile',
]);

const NEGATIVE_WORDS = new Set([
  'annoying', 'awful', 'bad', 'boring', 'disappoint', 'disappointed',
  'disappointing', 'dreadful', 'fail', 'failed', 'forgettable', 'hate',
  'hated', 'horrible', 'mediocre', 'mess', 'poor', 'predictable', 'ridiculous',
  'slow', 'terrible', 'waste', 'weak', 'worst',
]);

const NEGATIONS = new Set(['aint', 'cannot', 'dont', 'isnt', 'never', 'no', 'not', 'wasnt', 'without', 'wont']);

function classifySentiment(text = '') {
  const words = String(text).toLowerCase().match(/[a-z']+/g) || [];
  let score = 0;
  let negationWindow = 0;

  for (const word of words) {
    if (NEGATIONS.has(word.replace(/'/g, ''))) {
      negationWindow = 3;
      continue;
    }

    let wordScore = POSITIVE_WORDS.has(word) ? 1 : NEGATIVE_WORDS.has(word) ? -1 : 0;
    if (wordScore && negationWindow) wordScore *= -1;
    score += wordScore;
    if (negationWindow) negationWindow -= 1;
  }

  return score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral';
}

module.exports = { classifySentiment };
