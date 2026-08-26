import React from 'react';
import { User } from 'lucide-react';

// Read-only summary of a single day-selection evaluation.
export default function DayEvalSummary({ ev, criteria }) {
  const scores = ev.scores_data || {};
  const feedback = ev.feedback_data || {};
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
          <User className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <div className="font-bold text-base">{ev.evaluator_name}</div>
          <div className="text-xs text-slate-400 mt-0.5">{new Date(ev.created_date).toLocaleDateString('he-IL')}</div>
        </div>
        {ev.final_score != null && (
          <div className="mr-auto bg-blue-50 rounded-xl px-4 py-2 text-center">
            <div className="text-xl font-bold text-blue-600">{ev.final_score}</div>
            <div className="text-xs text-slate-400">ציון סופי</div>
          </div>
        )}
      </div>
      {criteria.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {criteria.map((c) => {
            const s = scores[c.key];
            if (s == null) return null;
            return (
              <div key={c.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2">
                <span className="text-sm text-slate-600">{c.name}</span>
                <span className="font-bold text-primary">{s}</span>
              </div>
            );
          })}
        </div>
      )}
      {Object.keys(feedback).length > 0 && (
        <div className="space-y-2">
          {Object.entries(feedback).map(([key, text]) => {
            if (!text) return null;
            const criterion = criteria.find((c) => c.key === key);
            return (
              <div key={key} className="text-sm bg-slate-50 rounded-xl p-3">
                {criterion && <div className="text-xs font-semibold text-slate-500 mb-1">{criterion.name}</div>}
                <p className="whitespace-pre-wrap">{text}</p>
              </div>
            );
          })}
        </div>
      )}
      {ev.final_feedback && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="text-xs font-semibold text-slate-500 mb-1">הערכה כללית</div>
          <p className="text-sm whitespace-pre-wrap">{ev.final_feedback}</p>
        </div>
      )}
    </div>
  );
}