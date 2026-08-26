import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Clock, MessageSquare, Star, FileText, Gavel, FileCheck, ClipboardList } from 'lucide-react';

const EVENT_ICONS = {
  questionnaire: ClipboardList,
  interview: MessageSquare,
  evaluation: Star,
  document: FileText,
  decision: Gavel,
  stage_change: FileCheck,
  note: Clock,
};

export default function TimelineView({ candidateId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.CandidateTimeline.filter({ candidate_id: candidateId })
      .then((ev) => {
        setEvents(ev.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [candidateId]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <h2 className="font-bold mb-4">ציר זמן</h2>
      {loading ? (
        <div className="text-center py-6 text-slate-400">טוען...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-6 text-slate-400 text-sm">אין אירועים עדיין</div>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => {
            const Icon = EVENT_ICONS[ev.event_type] || Clock;
            return (
              <div key={ev.id} className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-slate-600" />
                </div>
                <div className="flex-1 pb-3 border-b border-slate-50 last:border-0">
                  <div className="text-sm font-medium">{ev.title}</div>
                  {ev.description && <div className="text-xs text-slate-500 mt-0.5">{ev.description}</div>}
                  <div className="text-xs text-slate-400 mt-1">
                    {new Date(ev.created_date).toLocaleString('he-IL')}
                    {ev.actor_name && ` · ${ev.actor_name}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}