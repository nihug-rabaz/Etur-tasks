import React from 'react';

// Read-only final decision section: status badge + ramad notes.
export default function ProfileDecision({ candidate }) {
  if (!candidate.ramad_notes && candidate.status === 'pending') return null;

  const statusLabel = candidate.status === 'passed' ? 'עבר' : candidate.status === 'not_passed' ? 'לא עבר' : 'ממתין';
  const statusClass = candidate.status === 'passed'
    ? 'bg-emerald-100 text-emerald-600'
    : candidate.status === 'not_passed'
      ? 'bg-rose-100 text-rose-600'
      : 'bg-slate-100 text-slate-600';

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6">
      <h2 className="font-display text-lg font-bold mb-4">החלטה סופית</h2>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm text-slate-500">סטטוס:</span>
        <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${statusClass}`}>{statusLabel}</span>
      </div>
      {candidate.ramad_notes && (
        <div>
          <div className="text-xs font-semibold text-slate-500 mb-1">הערות רמ"ד איתור</div>
          <p className="text-sm whitespace-pre-wrap">{candidate.ramad_notes}</p>
        </div>
      )}
    </div>
  );
}