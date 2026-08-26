import { base44 } from '@/api/base44Client';

// Per-stage configuration for the "ניהול מועמדים" management screen.
// Each view defines a label, an async loader (returns a map keyed by candidate_id),
// a summary column header + cell renderer, and a quick-access action (evalPath +
// actionLabel) used to jump straight into that stage's evaluation per candidate.
// To add a new stage view in the future, add an entry here — no other changes required.

export const STAGE_VIEWS = [
  {
    key: 'day_selection',
    label: 'יום המיונים',
    isEvaluation: true,
    actionLabel: 'הערכת יום מיונים',
    evalPath: (c) => `/evaluation?candidateId=${c.id}`,
    load: async () => {
      const evals = await base44.entities.DayEvaluation.list('-created_date', 500);
      const byCand = {};
      evals.forEach((e) => {
        const cur = byCand[e.candidate_id];
        if (!cur || new Date(e.created_date) > new Date(cur.created_date)) byCand[e.candidate_id] = e;
      });
      return byCand;
    },
    columnHeader: 'ציון יום מיונים',
    cell: (c, data) => {
      const e = data[c.id];
      if (!e) return <span className="text-slate-300 text-xs">—</span>;
      return <span className="font-bold text-primary">{e.final_score ?? e.weighted_score ?? '-'}</span>;
    },
  },
  {
    key: 'preparation_day',
    label: 'היום המכין',
    isEvaluation: true,
    actionLabel: 'הערכת היום המכין',
    evalPath: (c) => `/candidate?id=${c.id}&stage=preparation_day`,
    load: async () => {
      const all = await base44.entities.PreparationDayEvaluation.list('-created_date', 500);
      const byCand = {};
      all.forEach((e) => {
        if (!byCand[e.candidate_id]) byCand[e.candidate_id] = e;
      });
      return byCand;
    },
    columnHeader: 'ממוצע היום המכין',
    cell: (c, data) => {
      const e = data[c.id];
      if (!e) return <span className="text-slate-300 text-xs">—</span>;
      const scores = [e.mikra_score, e.conversation_score, e.social_dynamics_score].filter((x) => x != null);
      const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
      return <span className="font-bold text-primary">{avg ?? '-'}</span>;
    },
  },
  {
    key: 'smach',
    label: 'סמ"ח',
    isEvaluation: true,
    actionLabel: 'הערכת סמ"ח',
    evalPath: (c) => `/candidate?id=${c.id}&stage=smach`,
    load: async () => {
      const all = await base44.entities.SmachEvaluation.list('-created_date', 500);
      const byCand = {};
      all.forEach((e) => {
        if (!byCand[e.candidate_id]) byCand[e.candidate_id] = e;
      });
      return byCand;
    },
    columnHeader: 'סמ"ח',
    cell: (c, data) => {
      const e = data[c.id];
      if (!e) return <span className="text-slate-300 text-xs">—</span>;
      return (
        <div className="flex items-center gap-2">
          {e.weighted_score != null && <span className="font-bold text-primary">{e.weighted_score}</span>}
          {e.decision && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              e.decision === 'מומלץ' ? 'bg-emerald-100 text-emerald-600'
                : e.decision === 'מומלץ בהסתייגות' ? 'bg-amber-100 text-amber-600'
                : 'bg-rose-100 text-rose-600'
            }`}>{e.decision}</span>
          )}
        </div>
      );
    },
  },
  {
    key: 'documents',
    label: 'מסמכים',
    isEvaluation: false,
    actionLabel: 'פתח מסמכים',
    evalPath: (c) => `/candidate?id=${c.id}&stage=documents`,
    load: async () => {
      const docs = await base44.entities.CandidateDocument.list('-created_date', 1000);
      const byCand = {};
      docs.forEach((d) => {
        byCand[d.candidate_id] = (byCand[d.candidate_id] || 0) + 1;
      });
      return byCand;
    },
    columnHeader: 'מסמכים',
    cell: (c, data) => {
      const n = data[c.id] || 0;
      return <span className={`text-sm font-medium ${n ? 'text-slate-700' : 'text-slate-300'}`}>{n}</span>;
    },
  },
  {
    key: 'final_decision',
    label: 'החלטה סופית',
    isEvaluation: false,
    actionLabel: 'פתח החלטה סופית',
    evalPath: (c) => `/candidate?id=${c.id}&stage=final_decision`,
    load: async () => ({}),
    columnHeader: 'החלטה',
    cell: () => <span className="text-slate-300 text-xs">—</span>,
  },
];