import React from 'react';
import { User } from 'lucide-react';

const THRESHOLD_TESTS = [
  { key: 'mikraot_israel', name: 'מקראות ישראל', inputType: 'score' },
  { key: 'weapon_test', name: 'בוחן נשק', inputType: 'score' },
  { key: 'fitness_run', name: 'כושר גופני – ריצה', inputType: 'time' },
  { key: 'fitness_strength', name: 'כושר גופני – כוח', inputType: 'count' },
];

const PROFESSIONAL_CRITERIA = [
  { key: 'public_speaking', name: 'עמידה ודיבור בפני קהל' },
  { key: 'content_preparation', name: 'הכנת והעברת תוכן' },
  { key: 'odt_engagement', name: 'ODT ומעורבות' },
  { key: 'command_experience', name: 'התנסות פיקודית' },
  { key: 'self_confidence', name: 'ביטחון עצמי' },
  { key: 'command_simulations', name: 'סימולציות פיקודיות' },
  { key: 'general_conduct', name: 'התנהלות כללית' },
];

function ThresholdDisplay({ test, data }) {
  const passLabel = data?.pass === false ? 'לא עבר' : data?.pass === true ? 'עבר' : '—';
  let detail = '';
  if (test.inputType === 'score') detail = data?.score != null ? `ציון ${data.score}` : '';
  else if (test.inputType === 'time') detail = data?.time || '';
  else if (test.inputType === 'count') detail = data?.count != null ? `${data.count} שכיבות סמיכה` : '';
  return (
    <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between gap-2">
      <span className="text-sm text-slate-600">{test.name}</span>
      <span className="text-sm font-medium">
        <span className={`ml-2 ${data?.pass === false ? 'text-rose-500' : data?.pass === true ? 'text-emerald-600' : 'text-slate-400'}`}>
          {passLabel}
        </span>
        {detail && <span className="text-slate-500">{detail}</span>}
      </span>
    </div>
  );
}

export default function SmachReadOnlyCard({ ev }) {
  const tt = ev.threshold_tests || {};
  const ps = ev.professional_scores || {};
  const pf = ev.professional_feedback || {};
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center">
          <User className="w-5 h-5 text-cyan-600" />
        </div>
        <div>
          <div className="font-bold text-base">{ev.evaluator_name}</div>
          <div className="text-xs text-slate-400 mt-0.5">{new Date(ev.created_date).toLocaleDateString('he-IL')}</div>
        </div>
      </div>

      {/* Part A */}
      <div className="text-xs font-semibold text-slate-500 mb-2">מבחני סף</div>
      <div className="space-y-2 mb-4">
        {THRESHOLD_TESTS.map((t) => <ThresholdDisplay key={t.key} test={t} data={tt[t.key]} />)}
      </div>

      {/* Part B */}
      <div className="text-xs font-semibold text-slate-500 mb-2">הערכה מקצועית</div>
      <div className="space-y-2 mb-4">
        {PROFESSIONAL_CRITERIA.map((c) => (
          <div key={c.key} className="bg-slate-50 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-slate-600">{c.name}</span>
              <span className="text-sm font-bold text-primary">{ps[c.key] ?? '—'} / 5</span>
            </div>
            {pf[c.key] && <p className="text-xs text-slate-500 whitespace-pre-wrap">{pf[c.key]}</p>}
          </div>
        ))}
      </div>

      {/* Part C */}
      {ev.weighted_score != null && (
        <div className="bg-cyan-50 rounded-xl p-3 mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-cyan-700">ציון משוקלל</span>
          <span className="text-2xl font-bold text-cyan-700">{ev.weighted_score}</span>
        </div>
      )}

      {/* Part D */}
      {ev.key_points && (
        <div className="text-sm bg-slate-50 rounded-xl p-3 mb-2">
          <div className="text-xs font-semibold text-slate-500 mb-1">נקודות משמעותיות מתוך התהליך</div>
          <p className="whitespace-pre-wrap">{ev.key_points}</p>
        </div>
      )}

      {/* Part E */}
      {ev.decision && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-500">החלטה:</span>
            <span className="text-sm font-bold">{ev.decision}</span>
          </div>
          {ev.decision_reasoning && <p className="text-sm text-slate-600 whitespace-pre-wrap mt-1">{ev.decision_reasoning}</p>}
        </div>
      )}
    </div>
  );
}