import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { MessageSquare, Star, Pencil, User } from 'lucide-react';
import { RECOMMENDATION_COLORS } from '@/lib/scoring';

function DataRow({ label, value }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-slate-400 text-sm shrink-0 min-w-44">{label}</span>
      <span className="text-sm font-medium text-slate-800">{String(value)}</span>
    </div>
  );
}

export default function DaySelectionStage({ candidate, cid, navigate }) {
  const [tab, setTab] = useState('questionnaire');
  const [interviews, setInterviews] = useState([]);
  const [evals, setEvals] = useState([]);
  const [preQs, setPreQs] = useState([]);
  const [interviewQs, setInterviewQs] = useState([]);
  const [dayCriteria, setDayCriteria] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Interview.filter({ candidate_id: cid }),
      base44.entities.DayEvaluation.filter({ candidate_id: cid }),
      base44.entities.QuestionnaireQuestion.filter({ question_type: 'pre_screening', is_active: true }),
      base44.entities.QuestionnaireQuestion.filter({ question_type: 'interview', is_active: true }),
      base44.entities.DayEvaluationCriterion.filter({ is_active: true }),
    ]).then(([iv, ev, pqs, iqs, crs]) => {
      setInterviews(iv);
      setEvals(ev);
      setPreQs(pqs.sort((a, b) => (a.section_number - b.section_number) || (a.sort_order - b.sort_order)));
      setInterviewQs(iqs.sort((a, b) => (a.section_number - b.section_number) || (a.sort_order - b.sort_order)));
      setDayCriteria(crs.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
      setLoading(false);
    });
  }, [cid]);

  if (loading) return <div className="text-center py-12 text-slate-400">טוען...</div>;

  const qData = candidate.questionnaire_data || {};
  const iqMap = Object.fromEntries(interviewQs.map((q) => [q.field_key, q.question_text]));
  const tabs = [
    { id: 'questionnaire', label: 'שאלון מקדים' },
    { id: 'interviews', label: `ריאיונות (${interviews.length})` },
    { id: 'evaluations', label: `יום מיונים (${evals.length})` },
  ];

  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap justify-end">
        <Button variant="outline" onClick={() => navigate(`/interview?candidateId=${cid}`)} className="gap-2 h-10">
          <MessageSquare className="w-4 h-4" /> ריאיון
        </Button>
        <Button variant="outline" onClick={() => navigate(`/evaluation?candidateId=${cid}`)} className="gap-2 h-10">
          <Star className="w-4 h-4" /> הערכת יום מיונים
        </Button>
      </div>

      <div className="flex gap-0 border-b border-slate-200 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'questionnaire' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          {preQs.length === 0 ? (
            <p className="text-slate-400 text-sm">אין שאלות מוגדרות</p>
          ) : (
            preQs.map((q) => <DataRow key={q.id} label={q.question_text} value={qData[q.field_key]} />)
          )}
        </div>
      )}

      {tab === 'interviews' && (
        <div className="space-y-4">
          <Button onClick={() => navigate(`/interview?candidateId=${cid}`)} className="gap-2 h-10">
            <MessageSquare className="w-4 h-4" /> הוסף ריאיון חדש
          </Button>
          {interviews.length === 0 && (
            <div className="text-center py-10 text-slate-400 bg-white rounded-2xl border border-slate-100">אין ריאיונות עדיין</div>
          )}
          {interviews.map((iv) => (
            <div key={iv.id} className="bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-bold text-base">{iv.evaluator_name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{new Date(iv.created_date).toLocaleDateString('he-IL')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {iv.recommendation && (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${RECOMMENDATION_COLORS[iv.recommendation] || 'bg-slate-100 text-slate-600'}`}>
                      {iv.recommendation}
                    </span>
                  )}
                  <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={() => navigate(`/interview?candidateId=${cid}&interviewId=${iv.id}`)}>
                    <Pencil className="w-3.5 h-3.5" /> ערוך
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                {Object.entries(iv.interview_data || {}).map(([k, v]) => v ? (
                  <div key={k} className="text-sm bg-slate-50 rounded-xl p-3">
                    <div className="text-xs font-semibold text-slate-500 mb-1">{iqMap[k] || k}</div>
                    <div className="whitespace-pre-wrap">{v}</div>
                  </div>
                ) : null)}
                {iv.evaluator_assessment && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="text-xs font-semibold text-slate-500 mb-2">התרשמות המעריך</div>
                    <p className="text-sm whitespace-pre-wrap">{iv.evaluator_assessment}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'evaluations' && (
        <div className="space-y-4">
          <Button onClick={() => navigate(`/evaluation?candidateId=${cid}`)} className="gap-2 h-10">
            <Star className="w-4 h-4" /> הוסף הערכה חדשה
          </Button>
          {evals.length === 0 && (
            <div className="text-center py-10 text-slate-400 bg-white rounded-2xl border border-slate-100">אין הערכות עדיין</div>
          )}
          {evals.map((ev) => (
            <div key={ev.id} className="bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-bold text-base">{ev.evaluator_name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{new Date(ev.created_date).toLocaleDateString('he-IL')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold font-display text-primary">{ev.final_score ?? ev.weighted_score ?? '-'}</div>
                    <div className="text-xs text-slate-400">ציון</div>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={() => navigate(`/evaluation?candidateId=${cid}&evalId=${ev.id}`)}>
                    <Pencil className="w-3.5 h-3.5" /> ערוך
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {dayCriteria.map((cr) => (
                  <div key={cr.key} className="bg-slate-50 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold">{ev.scores_data?.[cr.key] ?? '-'}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{cr.name}</div>
                    {ev.feedback_data?.[cr.key] && <div className="text-xs text-slate-400 mt-2 text-right">{ev.feedback_data[cr.key]}</div>}
                  </div>
                ))}
              </div>
              {ev.final_feedback && <p className="text-sm text-slate-600 mt-4 pt-3 border-t border-slate-100">{ev.final_feedback}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}