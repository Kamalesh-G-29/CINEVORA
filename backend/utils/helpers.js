// Helper to get year from date string
const getYear = (date) => (date ? date.split('-')[0] : '');

// Filter blocked titles
const BLOCKED = ['nude', 'porn', 'xxx', 'sex', 'adult', 'erotic', 'uncensored'];
const isBlocked = (title) => {
  if (!title) return false;
  const lower = title.toLowerCase().trim();
  return BLOCKED.some(b => lower === b || lower.includes(b));
};

module.exports = { getYear, isBlocked };