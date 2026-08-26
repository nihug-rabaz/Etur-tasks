const STATUS_LABELS = { pending: 'ממתין', passed: 'עבר', not_passed: 'לא עבר' };

export const CANDIDATE_FIELDS = [
  { key: 'candidate.full_name', label: 'שם מלא', get: c => c.full_name },
  { key: 'candidate.personal_number', label: 'מספר אישי', get: c => c.personal_number },
  { key: 'candidate.phone', label: 'טלפון', get: c => c.phone },
  { key: 'candidate.status', label: 'סטטוס', get: c => STATUS_LABELS[c.status] || c.status },
  { key: 'candidate.ramad_notes', label: 'הערות רמ"ד', get: c => c.ramad_notes },
];

export const INTERVIEW_FIELDS = [
  { key: 'interview.evaluator_name', label: 'שם מראיין', get: (c, ctx) => ctx.interview?.evaluator_name },
  { key: 'interview.evaluator_assessment', label: 'הערכת מראיין', get: (c, ctx) => ctx.interview?.evaluator_assessment },
  { key: 'interview.recommendation', label: 'המלצת מראיין', get: (c, ctx) => ctx.interview?.recommendation },
];

export const STATIC_DAY_FIELDS = [
  { key: 'day.final_score', label: 'ציון מסכם (ממוצע)', get: (c, ctx) => ctx.dayFinal.final_score },
  { key: 'day.final_feedback', label: 'הערה מסכמת', get: (c, ctx) => ctx.dayFinal.final_feedback },
  { key: 'day.weighted_score', label: 'ציון משוקלל (ממוצע)', get: (c, ctx) => ctx.dayFinal.weighted_score },
];

export function buildDayCriterionFields(criteria) {
  return criteria.flatMap(cr => [
    { key: `day.score.${cr.key}`, label: `${cr.name} - ציון (ממוצע)`, get: (c, ctx) => ctx.criterionScoreAvg(cr.key) },
    { key: `day.feedback.${cr.key}`, label: `${cr.name} - הערה`, get: (c, ctx) => ctx.criterionFeedback(cr.key) },
  ]);
}

export function buildCandidateContext(candidateId, interviews, dayEvals) {
  const interview = interviews.find(i => i.candidate_id === candidateId);
  const evals = dayEvals.filter(d => d.candidate_id === candidateId);
  const avg = (key) => {
    const nums = evals.map(e => e[key]).filter(v => typeof v === 'number');
    return nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : '';
  };
  return {
    interview,
    dayFinal: {
      final_score: avg('final_score'),
      weighted_score: avg('weighted_score'),
      final_feedback: evals.map(e => e.final_feedback).filter(Boolean).join(' | '),
    },
    criterionScoreAvg: (ckey) => {
      const nums = evals.map(e => e.scores_data?.[ckey]).filter(v => typeof v === 'number');
      return nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : '';
    },
    criterionFeedback: (ckey) => evals.map(e => e.feedback_data?.[ckey]).filter(Boolean).join(' | '),
  };
}