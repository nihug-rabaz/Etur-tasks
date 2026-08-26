import React from 'react';
import { User } from 'lucide-react';

const REC_COLORS = {
  'ממליץ': 'text-emerald-600 bg-emerald-50',
  'ממליץ בהסתייגות': 'text-amber-600 bg-amber-50',
  'לא ממליץ': 'text-rose-600 bg-rose-50',
};

// Read-only summary of a single interview.
export default function InterviewSummary({ iv, questions }) {
  const data = iv.interview_data || {};
  const sortedQs = [...questions].sort((a, b) => a.section_number - b.section_number || a.sort_order - b.sort_order);
  const sections = {};
  sortedQs.forEach((q) => {
    if (data[q.field_key] != null && data[q.field_key] !== '') {
      if (!sections[q.section_number]) sections[q.section_number] = { name: q.section_name, items: [] };
      sections[q.section_number].items.push({ q: q.question_text, a: data[q.field_key] });
    }
  });
  const sectionList = Object.values(sections);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
          <User className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <div className="font-bold text-base">{iv.evaluator_name}</div>
          <div className="text-xs text-slate-400 mt-0.5">{new Date(iv.created_date).toLocaleDateString('he-IL')}</div>
        </div>
        {iv.recommendation && (
          <span className={`mr-auto text-xs font-bold px-3 py-1.5 rounded-full ${REC_COLORS[iv.recommendation] || 'text-slate-600 bg-slate-50'}`}>
            {iv.recommendation}
          </span>
        )}
      </div>
      {sectionList.map((s, i) => (
        <div key={i} className="mb-3">
          {s.name && <div className="text-xs font-semibold text-slate-500 mb-1">{s.name}</div>}
          {s.items.map((item, j) => (
            <div key={j} className="flex gap-3 text-sm border-b border-slate-50 last:border-0 py-2">
              <span className="text-slate-500 flex-1">{item.q}</span>
              <span className="font-medium text-slate-800 flex-1">{String(item.a)}</span>
            </div>
          ))}
        </div>
      ))}
      {iv.evaluator_assessment && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="text-xs font-semibold text-slate-500 mb-1">התרשמות המעריך</div>
          <p className="text-sm whitespace-pre-wrap">{iv.evaluator_assessment}</p>
        </div>
      )}
    </div>
  );
}