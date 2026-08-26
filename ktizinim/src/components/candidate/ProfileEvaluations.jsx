import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import DayEvalSummary from '@/components/candidate/DayEvalSummary';
import PrepDaySummary from '@/components/candidate/PrepDaySummary';
import SmachReadOnlyCard from '@/components/smach/SmachReadOnlyCard';
import InterviewSummary from '@/components/candidate/InterviewSummary';

// Consolidates all evaluations and interviews for a candidate into read-only sections.
export default function ProfileEvaluations({ cid }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.DayEvaluation.filter({ candidate_id: cid }),
      base44.entities.DayEvaluationCriterion.filter({ is_active: true }),
      base44.entities.PreparationDayEvaluation.filter({ candidate_id: cid }),
      base44.entities.SmachEvaluation.filter({ candidate_id: cid }),
      base44.entities.Interview.filter({ candidate_id: cid }),
      base44.entities.QuestionnaireQuestion.filter({ question_type: 'interview', is_active: true }),
    ])
      .then(([dayEvals, criteria, prepEvals, smachEvals, interviews, intQs]) => {
        setData({ dayEvals, criteria, prepEvals, smachEvals, interviews, intQs });
      })
      .catch(() => setData({}));
  }, [cid]);

  if (!data) return <div className="text-center py-6 text-slate-400">טוען הערכות...</div>;

  const { dayEvals = [], criteria = [], prepEvals = [], smachEvals = [], interviews = [], intQs = [] } = data;
  const sortedCriteria = [...criteria].sort((a, b) => a.sort_order - b.sort_order);
  const byDate = (a, b) => new Date(b.created_date) - new Date(a.created_date);
  const hasAny = dayEvals.length || prepEvals.length || smachEvals.length || interviews.length;
  if (!hasAny) return null;

  return (
    <div className="space-y-5">
      <h2 className="font-display text-lg font-bold">הערכות וראיונות</h2>

      {dayEvals.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-slate-700 text-sm">יום המיונים</h3>
          {[...dayEvals].sort(byDate).map((ev) => <DayEvalSummary key={ev.id} ev={ev} criteria={sortedCriteria} />)}
        </div>
      )}

      {prepEvals.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-slate-700 text-sm">היום המכין</h3>
          {[...prepEvals].sort(byDate).map((ev) => <PrepDaySummary key={ev.id} ev={ev} />)}
        </div>
      )}

      {smachEvals.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-slate-700 text-sm">סמ"ח</h3>
          {[...smachEvals].sort(byDate).map((ev) => <SmachReadOnlyCard key={ev.id} ev={ev} />)}
        </div>
      )}

      {interviews.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-slate-700 text-sm">ראיונות</h3>
          {[...interviews].sort(byDate).map((iv) => <InterviewSummary key={iv.id} iv={iv} questions={intQs} />)}
        </div>
      )}
    </div>
  );
}