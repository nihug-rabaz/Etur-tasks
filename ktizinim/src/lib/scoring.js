// Weighted score: sum of score(1-5) * criterion weight(%), scaled to 1-100.
export const calcWeightedScore = (scoresData, criteria) => {
  if (!criteria || criteria.length === 0) return null;
  const totalWeight = criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
  if (!totalWeight) return null;
  const weightedSum = criteria.reduce((sum, c) => sum + ((Number(scoresData?.[c.key]) || 0) * (Number(c.weight) || 0)), 0);
  return Math.round((weightedSum / totalWeight) * 20);
};

export const STATUS_LABELS = {
  pending: 'ממתין',
  passed: 'עבר',
  not_passed: 'לא עבר',
};

export const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-800',
  passed: 'bg-emerald-100 text-emerald-800',
  not_passed: 'bg-rose-100 text-rose-800',
};

export const RECOMMENDATION_COLORS = {
  'ממליץ': 'bg-emerald-100 text-emerald-800',
  'ממליץ בהסתייגות': 'bg-amber-100 text-amber-800',
  'לא ממליץ': 'bg-rose-100 text-rose-800',
};