import React from 'react';
import { Textarea } from '@/components/ui/textarea';

// Part B — professional evaluation field: score 1-5 + free-text feedback.
export default function ProfessionalScoreField({ title, score, onScore, feedback, onFeedback }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <h3 className="font-bold text-primary mb-3">{title}</h3>
      <div className="flex items-center gap-2 mb-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onScore(Number(n))}
            className={`w-9 h-9 rounded-lg text-sm font-bold transition ${
              Number(score) === n ? 'bg-primary text-primary-foreground' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {n}
          </button>
        ))}
        <span className="text-sm text-slate-400 mr-2">ציון 1–5</span>
      </div>
      <Textarea
        rows={2}
        placeholder="התרשמות מילולית"
        value={feedback}
        onChange={(e) => onFeedback(e.target.value)}
      />
    </div>
  );
}