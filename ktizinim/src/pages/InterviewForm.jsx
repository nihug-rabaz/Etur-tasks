import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowRight, Save } from "lucide-react";
import { addTimelineEvent } from "@/lib/timeline";

export default function InterviewForm() {
  const params = new URLSearchParams(window.location.search);
  const candidateId = params.get('candidateId');
  const interviewId = params.get('interviewId');
  const { user } = useAuth();
  const navigate = useNavigate();

  const [candidate, setCandidate] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [formData, setFormData] = useState({});
  const [assessment, setAssessment] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loads = [
      base44.entities.Candidate.get(candidateId),
      base44.entities.QuestionnaireQuestion.filter({ question_type: 'interview', is_active: true }),
    ];
    if (interviewId) loads.push(base44.entities.Interview.get(interviewId));
    Promise.all(loads).then(([c, qs, iv]) => {
      setCandidate(c);
      setQuestions(qs.sort((a, b) => (a.section_number - b.section_number) || (a.sort_order - b.sort_order)));
      if (iv) {
        setFormData(iv.interview_data || {});
        setAssessment(iv.evaluator_assessment || '');
        setRecommendation(iv.recommendation || '');
      }
      setLoading(false);
    });
  }, [candidateId, interviewId]);

  const sections = useMemo(() => {
    const grouped = {};
    questions.forEach(q => {
      if (!grouped[q.section_number]) grouped[q.section_number] = { number: q.section_number, name: q.section_name, questions: [] };
      grouped[q.section_number].questions.push(q);
    });
    return Object.values(grouped).sort((a, b) => a.number - b.number);
  }, [questions]);

  const setField = (key, val) => { setFormData(prev => ({ ...prev, [key]: val })); setSaved(false); };

  const save = async () => {
    setSaving(true);
    const payload = {
      candidate_id: candidateId,
      evaluator_id: user?.id,
      evaluator_name: user?.full_name || 'מעריך',
      interview_data: formData,
      evaluator_assessment: assessment,
      recommendation: recommendation || undefined,
    };
    if (interviewId) {
      await base44.entities.Interview.update(interviewId, payload);
      await addTimelineEvent({
        candidate_id: candidateId,
        event_type: 'interview',
        title: 'ריאיון עודכן',
        description: recommendation ? `המלצה: ${recommendation}` : '',
        actor_name: user?.full_name,
        stage_key: 'day_selection',
      });
    } else {
      await base44.entities.Interview.create(payload);
      await addTimelineEvent({
        candidate_id: candidateId,
        event_type: 'interview',
        title: 'נוסף ריאיון חדש',
        description: recommendation ? `המלצה: ${recommendation}` : '',
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
        <h1 className="font-display text-2xl font-bold">ריאיון אישי</h1>
        <p className="text-slate-500 text-sm">{candidate?.full_name} · {candidate?.personal_number}</p>
      </div>

      {sections.map(section => (
        <div key={section.number} className="bg-white rounded-2xl border border-slate-100 p-6">
          <h2 className="font-bold text-primary mb-4">{section.name}</h2>
          <div className="space-y-5">
            {section.questions.map(q => (
              <div key={q.id}>
                <Label className="text-sm font-medium mb-2 block">{q.question_text}</Label>
                {q.field_type === 'text' ? (
                  <Input value={formData[q.field_key] || ''} onChange={e => setField(q.field_key, e.target.value)} />
                ) : (
                  <Textarea rows={3} value={formData[q.field_key] || ''} onChange={e => setField(q.field_key, e.target.value)} placeholder="כתוב כאן..." />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h2 className="font-bold text-primary mb-4">התרשמות והערכת המעריך</h2>
        <Textarea rows={5} value={assessment} onChange={e => { setAssessment(e.target.value); setSaved(false); }}
          placeholder="כתוב את התרשמותך והערכתך הכוללת על המועמד..." />
        <div className="mt-4">
          <Label className="block mb-2">המלצה</Label>
          <div className="flex gap-2 flex-wrap">
            {['ממליץ', 'ממליץ בהסתייגות', 'לא ממליץ'].map(opt => (
              <button key={opt} onClick={() => { setRecommendation(opt); setSaved(false); }}
                className={`px-4 py-2 rounded-xl border text-sm font-medium transition ${recommendation === opt ? 'bg-primary text-primary-foreground border-primary' : 'border-slate-200 hover:border-slate-300'}`}>
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving || saved} className="gap-2 min-w-32">
          <Save className="w-4 h-4" />
          {saved ? 'נשמר ✓' : saving ? 'שומר...' : 'שמור ריאיון'}
        </Button>
      </div>
    </div>
  );
}