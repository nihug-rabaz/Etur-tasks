import React from 'react';
import { User } from 'lucide-react';

// Read-only summary of a single preparation-day evaluation.
export default function PrepDaySummary({ ev }) {
  const scores = [
    { label: 'מקראות ישראל', value: ev.mikra_score },
    { label: 'העברת שיחה', value: ev.conversation_score },
    { label: 'דינמיקות חברתיות', value: ev.social_dynamics_score },
  ];
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
          <User className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <div className="font-bold text-base">{ev.evaluator_name}</div>
          <div className="text-xs text-slate-400 mt-0.5">{new Date(ev.created_date).toLocaleDateString('he-IL')}</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {scores.map((s) => (
          <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center">
            <div className="text-xl font-bold">{s.value ?? '-'}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
      {ev.conversation_feedback && (
        <div className="text-sm bg-slate-50 rounded-xl p-3 mb-2">
          <div className="text-xs font-semibold text-slate-500 mb-1">העברת שיחה</div>
          <p className="whitespace-pre-wrap">{ev.conversation_feedback}</p>
        </div>
      )}
      {ev.social_dynamics_feedback && (
        <div className="text-sm bg-slate-50 rounded-xl p-3 mb-2">
          <div className="text-xs font-semibold text-slate-500 mb-1">דינמיקות חברתיות</div>
          <p className="whitespace-pre-wrap">{ev.social_dynamics_feedback}</p>
        </div>
      )}
      {ev.general_impression && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="text-xs font-semibold text-slate-500 mb-1">התרשמות כללית</div>
          <p className="text-sm whitespace-pre-wrap">{ev.general_impression}</p>
        </div>
      )}
    </div>
  );
}