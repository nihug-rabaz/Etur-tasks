import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Save, Award } from 'lucide-react';
import { addTimelineEvent } from '@/lib/timeline';
import ThresholdTestField from '@/components/smach/ThresholdTestField';
import ProfessionalScoreField from '@/components/smach/ProfessionalScoreField';
import SmachReadOnlyCard from '@/components/smach/SmachReadOnlyCard';

const THRESHOLD_TESTS = [
  { key: 'mikraot_israel', name: 'מקראות ישראל', inputType: 'score' },
  { key: 'weapon_test', name: 'בוחן נשק', inputType: 'score' },
  { key: 'fitness_run', name: 'כושר גופני – ריצה', inputType: 'time', inputLabel: 'זמן ריצה:' },
  { key: 'fitness_strength', name: 'כושר גופני – כוח', inputType: 'count', inputLabel: 'כמות שכיבות סמיכה:' },
];

const PROFESSIONAL_CRITERIA = [
  { key: 'public_speaking', name: 'עמידה ודיבור בפני קהל' },
  { key: 'content_preparation', name: 'הכנת והעברת תוכן' },
  { key: 'odt_engagement', name: 'ODT ומעורבות' },
  { key: 'command_experience', name: 'התנסות פיקודית' },
  { key: 'self_confidence', name: 'ביטחון עצמי' },
  { key: 'command_simulations', name: 'סימולציות פיקודיות' },
  { key: 'general_conduct', name: 'התנהלות כללית (השתתפות, מעורבות, עמידה בזמנים, יחס לעמיתים וכד׳)' },
];

const DECISIONS = ['מומלץ', 'מומלץ בהסתייגות', 'לא מומלץ'];

function emptyForm() {
  const f = {
    weighted_score: '',
    key_points: '',
    decision: '',
    decision_reasoning: '',
  };
  THRESHOLD_TESTS.forEach((t) => {
    f[`${t.key}_pass`] = '';
    if (t.inputType === 'time') f[`${t.key}_time`] = '';
    else f[`${t.key}_${t.inputType === 'count' ? 'count' : 'score'}`] = '';
  });
  PROFESSIONAL_CRITERIA.forEach((c) => {
    f[`${c.key}_score`] = '';
    f[`${c.key}_feedback`] = '';
  });
  return f;
}

export default function SmachStage({ candidate, cid }) {
  const { user } = useAuth();
  const [evals, setEvals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myEvalId, setMyEvalId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = () => {
    base44.entities.SmachEvaluation.filter({ candidate_id: cid })
      .then((all) => {
        const sorted = all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        setEvals(sorted);
        const mine = sorted.find((e) => e.evaluator_id === user?.id);
        if (mine) {
          setMyEvalId(mine.id);
          setForm(unpack(mine));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };
  useEffect(load, [cid, user?.id]);

  const unpack = (mine) => {
    const f = emptyForm();
    const tt = mine.threshold_tests || {};
    THRESHOLD_TESTS.forEach((t) => {
      const d = tt[t.key] || {};
      f[`${t.key}_pass`] = d.pass === true ? 'pass' : d.pass === false ? 'fail' : '';
      if (t.inputType === 'time') f[`${t.key}_time`] = d.time || '';
      else if (t.inputType === 'count') f[`${t.key}_count`] = d.count ?? '';
      else f[`${t.key}_score`] = d.score ?? '';
    });
    const ps = mine.professional_scores || {};
    const pf = mine.professional_feedback || {};
    PROFESSIONAL_CRITERIA.forEach((c) => {
      f[`${c.key}_score`] = ps[c.key] ?? '';
      f[`${c.key}_feedback`] = pf[c.key] || '';
    });
    f.weighted_score = mine.weighted_score ?? '';
    f.key_points = mine.key_points || '';
    f.decision = mine.decision || '';
    f.decision_reasoning = mine.decision_reasoning || '';
    return f;
  };

  const set = (key) => (val) => { setForm((f) => ({ ...f, [key]: val })); setSaved(false); };

  const save = async () => {
    setSaving(true);
    const num = (v) => (v === '' || v === null ? null : Number(v));
    const threshold_tests = {};
    THRESHOLD_TESTS.forEach((t) => {
      const entry = { pass: form[`${t.key}_pass`] === 'pass' ? true : form[`${t.key}_pass`] === 'fail' ? false : null };
      if (t.inputType === 'time') entry.time = form[`${t.key}_time`] || null;
      else if (t.inputType === 'count') entry.count = num(form[`${t.key}_count`]);
      else entry.score = num(form[`${t.key}_score`]);
      threshold_tests[t.key] = entry;
    });
    const professional_scores = {};
    const professional_feedback = {};
    PROFESSIONAL_CRITERIA.forEach((c) => {
      professional_scores[c.key] = num(form[`${c.key}_score`]);
      professional_feedback[c.key] = form[`${c.key}_feedback`];
    });
    const payload = {
      candidate_id: cid,
      evaluator_id: user?.id,
      evaluator_name: user?.full_name || 'מעריך',
      threshold_tests,
      professional_scores,
      professional_feedback,
      weighted_score: num(form.weighted_score),
      key_points: form.key_points,
      decision: form.decision || null,
      decision_reasoning: form.decision_reasoning,
    };
    try {
      if (myEvalId) {
        await base44.entities.SmachEvaluation.update(myEvalId, payload);
        await addTimelineEvent({ candidate_id: cid, event_type: 'evaluation', title: 'הערכת סמ״ח עודכנה', actor_name: user?.full_name, stage_key: 'smach' });
      } else {
        const created = await base44.entities.SmachEvaluation.create(payload);
        setMyEvalId(created.id);
        await addTimelineEvent({ candidate_id: cid, event_type: 'evaluation', title: 'נוספה הערכת סמ״ח', actor_name: user?.full_name, stage_key: 'smach' });
      }
      setSaved(true);
      load();
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert('שגיאה בשמירת ההערכה');
    }
    setSaving(false);
  };

  if (loading) return <div className="text-center py-12 text-slate-400">טוען...</div>;

  const others = evals.filter((e) => e.evaluator_id !== user?.id);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 bg-cyan-50 rounded-2xl border border-cyan-100 p-4">
        <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center shrink-0">
          <Award className="w-5 h-5 text-cyan-600" />
        </div>
        <div>
          <h2 className="font-bold text-cyan-700">הערכת סמ"ח</h2>
          <p className="text-xs text-cyan-600/70 mt-0.5">
            ההערכה שלך כמעריך. בעתיד יתמך המודול במספר מעריכים — כל מעריך ממלא הערכה נפרדת.
          </p>
        </div>
      </div>

      {/* Part A — Threshold Tests */}
      <div>
        <h3 className="font-display text-lg font-bold mb-3">חלק א' — מבחני סף</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {THRESHOLD_TESTS.map((t) => (
            <ThresholdTestField
              key={t.key}
              title={t.name}
              inputType={t.inputType}
              inputLabel={t.inputLabel}
              pass={form[`${t.key}_pass`]}
              onPass={set(`${t.key}_pass`)}
              value={t.inputType === 'time' ? form[`${t.key}_time`] : form[`${t.key}_${t.inputType === 'count' ? 'count' : 'score'}`]}
              onValue={set(t.inputType === 'time' ? `${t.key}_time` : `${t.key}_${t.inputType === 'count' ? 'count' : 'score'}`)}
            />
          ))}
        </div>
      </div>

      {/* Part B — Professional Evaluation */}
      <div>
        <h3 className="font-display text-lg font-bold mb-3">חלק ב' — הערכה מקצועית</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PROFESSIONAL_CRITERIA.map((c) => (
            <ProfessionalScoreField
              key={c.key}
              title={c.name}
              score={form[`${c.key}_score`]}
              onScore={set(`${c.key}_score`)}
              feedback={form[`${c.key}_feedback`]}
              onFeedback={set(`${c.key}_feedback`)}
            />
          ))}
        </div>
      </div>

      {/* Part C — Weighted Score */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h3 className="font-display text-lg font-bold mb-1">חלק ג' — ציון משוקלל</h3>
        <p className="text-xs text-slate-400 mb-4">הזנה ידנית. בעתיד יחושב אוטומטית על בסיס משקלי הקריטריונים.</p>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            min={0}
            max={100}
            value={form.weighted_score}
            onChange={(e) => set('weighted_score')(e.target.value === '' ? '' : e.target.value)}
            className="w-24 text-center text-lg font-bold"
            placeholder="—"
          />
          <span className="text-sm text-slate-400">ציון 0–100</span>
        </div>
      </div>

      {/* Part D — Key Points */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h3 className="font-display text-lg font-bold mb-1">חלק ד' — נקודות משמעותיות מתוך התהליך</h3>
        <p className="text-xs text-slate-400 mb-4">ריכוז הנקודות המרכזיות שעלו במהלך הסמ"ח.</p>
        <Textarea
          rows={5}
          placeholder="נקודות משמעותיות..."
          value={form.key_points}
          onChange={(e) => set('key_points')(e.target.value)}
        />
      </div>

      {/* Part E — Decision */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h3 className="font-display text-lg font-bold mb-4">חלק ה' — החלטת הסמ"ח</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {DECISIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => set('decision')(d)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                form.decision === d
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="text-xs font-semibold text-slate-500 mb-1">נימוק להחלטה</div>
        <Textarea
          rows={4}
          placeholder="נימוק מפורט להחלטה..."
          value={form.decision_reasoning}
          onChange={(e) => set('decision_reasoning')(e.target.value)}
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="gap-2 min-w-32">
          <Save className="w-4 h-4" />
          {saved ? 'נשמר ✓' : saving ? 'שומר...' : myEvalId ? 'עדכן הערכה' : 'שמור הערכה'}
        </Button>
      </div>

      {others.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="font-bold text-slate-700 text-sm">הערכות מעריכים נוספים ({others.length})</h3>
          {others.map((ev) => <SmachReadOnlyCard key={ev.id} ev={ev} />)}
        </div>
      )}
    </div>
  );
}