import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Save, User, CalendarCheck } from 'lucide-react';
import { addTimelineEvent } from '@/lib/timeline';

function ScoreField({ title, subtitle, value, onChange }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6">
      <h2 className="font-bold text-primary mb-1">{title}</h2>
      {subtitle && <p className="text-xs text-slate-400 mb-4">{subtitle}</p>}
      <div className="flex items-center gap-3">
        <Input
          type="number"
          min={1}
          max={100}
          value={value}
          onChange={(e) => onChange(e.target.value === '' ? '' : e.target.value)}
          className="w-24 text-center text-lg font-bold"
          placeholder="—"
        />
        <span className="text-sm text-slate-400">ציון 1–100</span>
      </div>
    </div>
  );
}

function ScoredPart({ title, subtitle, score, onScore, feedback, onFeedback }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6">
      <h2 className="font-bold text-primary mb-1">{title}</h2>
      {subtitle && <p className="text-xs text-slate-400 mb-4">{subtitle}</p>}
      <div className="flex items-center gap-3 mb-4">
        <Input
          type="number"
          min={1}
          max={100}
          value={score}
          onChange={(e) => onScore(e.target.value === '' ? '' : e.target.value)}
          className="w-24 text-center text-lg font-bold"
          placeholder="—"
        />
        <span className="text-sm text-slate-400">ציון 1–100</span>
      </div>
      <Textarea
        rows={3}
        placeholder="התרשמות מילולית"
        value={feedback}
        onChange={(e) => onFeedback(e.target.value)}
      />
    </div>
  );
}

function ReadOnlyCard({ ev }) {
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
          <div className="text-xs font-semibold text-slate-500 mb-1">התרשמות — העברת שיחה</div>
          <p className="whitespace-pre-wrap">{ev.conversation_feedback}</p>
        </div>
      )}
      {ev.social_dynamics_feedback && (
        <div className="text-sm bg-slate-50 rounded-xl p-3 mb-2">
          <div className="text-xs font-semibold text-slate-500 mb-1">התרשמות — דינמיקות חברתיות</div>
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

export default function PreparationDayStage({ candidate, cid }) {
  const { user } = useAuth();
  const [evals, setEvals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myEvalId, setMyEvalId] = useState(null);
  const [form, setForm] = useState({
    mikra_score: '',
    conversation_score: '',
    conversation_feedback: '',
    social_dynamics_score: '',
    social_dynamics_feedback: '',
    general_impression: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = () => {
    base44.entities.PreparationDayEvaluation.filter({ candidate_id: cid })
      .then((all) => {
        const sorted = all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        setEvals(sorted);
        const mine = sorted.find((e) => e.evaluator_id === user?.id);
        if (mine) {
          setMyEvalId(mine.id);
          setForm({
            mikra_score: mine.mikra_score ?? '',
            conversation_score: mine.conversation_score ?? '',
            conversation_feedback: mine.conversation_feedback || '',
            social_dynamics_score: mine.social_dynamics_score ?? '',
            social_dynamics_feedback: mine.social_dynamics_feedback || '',
            general_impression: mine.general_impression || '',
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };
  useEffect(load, [cid, user?.id]);

  const set = (key) => (val) => { setForm((f) => ({ ...f, [key]: val })); setSaved(false); };

  const save = async () => {
    setSaving(true);
    const num = (v) => (v === '' || v === null ? null : Number(v));
    const payload = {
      candidate_id: cid,
      evaluator_id: user?.id,
      evaluator_name: user?.full_name || 'מעריך',
      mikra_score: num(form.mikra_score),
      conversation_score: num(form.conversation_score),
      conversation_feedback: form.conversation_feedback,
      social_dynamics_score: num(form.social_dynamics_score),
      social_dynamics_feedback: form.social_dynamics_feedback,
      general_impression: form.general_impression,
    };
    try {
      if (myEvalId) {
        await base44.entities.PreparationDayEvaluation.update(myEvalId, payload);
        await addTimelineEvent({
          candidate_id: cid,
          event_type: 'evaluation',
          title: 'הערכת היום המכין עודכנה',
          actor_name: user?.full_name,
          stage_key: 'preparation_day',
        });
      } else {
        const created = await base44.entities.PreparationDayEvaluation.create(payload);
        setMyEvalId(created.id);
        await addTimelineEvent({
          candidate_id: cid,
          event_type: 'evaluation',
          title: 'נוספה הערכת היום המכין',
          actor_name: user?.full_name,
          stage_key: 'preparation_day',
        });
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
      <div className="flex items-start gap-3 bg-purple-50 rounded-2xl border border-purple-100 p-4">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
          <CalendarCheck className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h2 className="font-bold text-purple-700">הערכת היום המכין</h2>
          <p className="text-xs text-purple-600/70 mt-0.5">
            ההערכה שלך כמעריך. בעתיד יתמך המודול במספר מעריכים — כל מעריך ממלא הערכה נפרדת.
          </p>
        </div>
      </div>

      <ScoreField
        title='מבחן "מקראות ישראל"'
        subtitle="הזנת ציון בלבד"
        value={form.mikra_score}
        onChange={set('mikra_score')}
      />

      <ScoredPart
        title="התנסות בהעברת שיחה"
        score={form.conversation_score}
        onScore={set('conversation_score')}
        feedback={form.conversation_feedback}
        onFeedback={set('conversation_feedback')}
      />

      <ScoredPart
        title="דינמיקות חברתיות"
        score={form.social_dynamics_score}
        onScore={set('social_dynamics_score')}
        feedback={form.social_dynamics_feedback}
        onFeedback={set('social_dynamics_feedback')}
      />

      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h2 className="font-bold text-primary mb-1">התרשמות כללית של המעריך מהמועמד לאורך היום</h2>
        <p className="text-xs text-slate-400 mb-4">סיכום חופשי — ללא ציון</p>
        <Textarea
          rows={5}
          placeholder="כתוב סיכום חופשי של התרשמותך מהמועמד לאורך היום..."
          value={form.general_impression}
          onChange={(e) => set('general_impression')(e.target.value)}
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
          {others.map((ev) => <ReadOnlyCard key={ev.id} ev={ev} />)}
        </div>
      )}
    </div>
  );
}