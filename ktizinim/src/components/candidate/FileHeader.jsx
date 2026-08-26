import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/scoring';

export default function FileHeader({ candidate }) {
  const navigate = useNavigate();
  return (
    <div>
      <button onClick={() => navigate('/candidates')}
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 mb-3 transition">
        <ArrowRight className="w-4 h-4" /> חזרה לרשימת מועמדים
      </button>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold">{candidate.full_name}</h1>
          <p className="text-slate-500 text-sm mt-1">
            מספר אישי: {candidate.personal_number}{candidate.phone && ` · ${candidate.phone}`}
          </p>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${STATUS_COLORS[candidate.status] || STATUS_COLORS.pending}`}>
          {STATUS_LABELS[candidate.status] || STATUS_LABELS.pending}
        </span>
      </div>
    </div>
  );
}