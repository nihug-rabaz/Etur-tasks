import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ArrowRight, Save } from "lucide-react";
import { calcWeightedScore } from "@/lib/scoring";
import { addTimelineEvent } from "@/lib/timeline";

export default function DayEvaluationForm() {
  const params = new URLSearchParams(window.location.search);
  const candidateId = params.get('candidateId');
  const evalId = params.get('evalId');
  const { user } = useAuth();
  const navigate = useNavigate();

  const [candidate, setCandidate] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [scoresData, setScoresData] = useState({});
  const [feedbackData, setFeedbackData] = useState({});
  const [finalScore, setFinalScore] = useState(70);
  const [finalFeedback, setFinalFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loads = [
      base44.entities.Candidate.get(candidateId),
      base44.entities.DayEvaluationCriterion.filter({ is_active: true }),
    ];
    if (evalId) loads.push(base44.entities.DayEvaluation.get(evalId));
    Promise.all(loads).then(([c, cr, ev]) => {
      const sortedCriteria = cr.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      setCandidate(c);
      setCriteria(sortedCriteria);
      if (ev) {
        setScoresData(ev.scores_data || {});
        setFeedbackData(ev.feedback_data || {});
        setFinalScore(ev.final_score ?? ev.weighted_score ?? 70);
        setFinalFeedback(ev.final_feedback || '');
      } else {
        setScoresData(Object.fromEntries(sortedCriteria.map(c => [c.key, 3])));
      }
      setLoading(false);
    });
  }, [candidateId, evalId]);

  const weighted = calcWeightedScore(scoresData, criteria);

  const save = async () => {
    setSaving(true);
    const payload = {
      candidate_id: candidateId,
      evaluator_id: user?.id,
      evaluator_name: user?.full_name || 'מעריך',
      scores_data: scoresData,
      feedback_data: feedbackData,
      final_score: finalScore,
      final_feedback: finalFeedback,
      weighted_score: weighted,
    };
    if (evalId) {
      await base44.entities.DayEvaluation.update(evalId, payload);
      await addTimelineEvent({
        candidate_id: candidateId,
        event_type: 'evaluation',
        title: 'הערכת יום מיונים עודכנה',
        description: `ציון סופי: ${finalScore}`,
        actor_name: user?.full_name,
        stage_key: 'day_selection',
      });
    } else {
      await base44.entities.DayEvaluation.create(payload);
      await addTimelineEvent({
        candidate_id: candidateId,
        event_type: 'evaluation',
        title: 'נוספה הערכת יום מיונים',
        description: `ציון סופי: ${finalScore}`,
        actor_name: user?.full_name,
        stage_key: 'day_selection',
      });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => navigate(`/candidate?id=${candidateId}`), 1000);
  };

  if (loading) return <div className="text-center py-16 text-slate-400">טוען...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <button onClick={() => navigate(`/candidate?id=${candidateId}`)}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 mb-3 transition">
          <ArrowRight className="w-4 h-4" /> חזרה לפרופיל
        </button>
        <h1 className="font-display text-2xl font-bold">סיכום יום מיונים</h1>
        <p className="text-slate-500 text-sm">{candidate?.full_name} · {candidate?.personal_number}</p>
      </div>

      {criteria.length === 0 && (
        <div className="text-center py-10 text-slate-400 bg-white rounded-2xl border border-slate-100">
          לא הוגדרו קריטריונים להערכה. ניתן להגדיר קריטריונים בפאנל הניהול.
        </div>
      )}

      {criteria.map(cr => (
        <div key={cr.key} className="bg-white rounded-2xl border border-slate-100 p-6">
          <h2 className="font-bold text-primary mb-1">{cr.name}</h2>
          {cr.bullets && <p className="text-xs text-slate-400 mb-5">{cr.bullets}</p>}
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex flex-col items-center justify-center font-bold text-xl shrink-0">
              {scoresData[cr.key] ?? 5}
            </div>
            <Slider min={1} max={5} step={1} value={[scoresData[cr.key] ?? 3]}
              onValueChange={([v]) => { setScoresData(s => ({ ...s, [cr.key]: v })); setSaved(false); }}
              className="flex-1" />
            <span className="text-sm text-slate-400 shrink-0">1–5</span>
          </div>
          <Textarea rows={2} placeholder={`התרשמות - ${cr.name}`}
            value={feedbackData[cr.key] || ''}
            onChange={e => { setFeedbackData(f => ({ ...f, [cr.key]: e.target.value })); setSaved(false); }} />
        </div>
      ))}

      {criteria.length > 0 && (
        <div className="bg-primary/5 rounded-2xl border border-primary/20 p-5 text-center">
          <div className="text-sm text-primary/70 mb-1">ציון משוקלל מחושב אוטומטית</div>
          <div className="text-4xl font-bold font-display text-primary">{weighted ?? '-'}</div>
          <div className="text-xs text-slate-400 mt-1">{criteria.map(c => `${c.weight}% ${c.name}`).join(' · ')}</div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h2 className="font-bold text-primary mb-4">ציון מסכם סופי</h2>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 text-white flex items-center justify-center font-bold text-xl shrink-0">
            {finalScore}
          </div>
          <Slider min={1} max={100} step={1} value={[finalScore]}
            onValueChange={([v]) => { setFinalScore(v); setSaved(false); }}
            className="flex-1" />
          <span className="text-sm text-slate-400 shrink-0">1–100</span>
        </div>
        <Label className="block mb-2">הערה מסכמת חופשית</Label>
        <Textarea rows={3} placeholder="כתוב הערה מסכמת כללית על המועמד..."
          value={finalFeedback} onChange={e => { setFinalFeedback(e.target.value); setSaved(false); }} />
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving || saved} className="gap-2 min-w-32">
          <Save className="w-4 h-4" />
          {saved ? 'נשמר ✓' : saving ? 'שומר...' : 'שמור הערכה'}
        </Button>
      </div>
    </div>
  );
}