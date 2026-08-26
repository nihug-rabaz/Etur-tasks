import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Shield, ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";
import { addTimelineEvent } from "@/lib/timeline";

const evalCondition = (q, data) => {
  if (!q.condition_field) return true;
  const val = data[q.condition_field];
  const cv = q.condition_value;
  switch (q.condition_operator || 'eq') {
    case 'eq': return String(val ?? '') === String(cv ?? '');
    case 'neq': return String(val ?? '') !== String(cv ?? '');
    case 'gt': return Number(val) > Number(cv);
    case 'lt': return Number(val) < Number(cv);
    case 'gte': return Number(val) >= Number(cv);
    case 'lte': return Number(val) <= Number(cv);
    default: return String(val ?? '') === String(cv ?? '');
  }
};

function QuestionField({ q, value, onChange }) {
  if (q.field_type === 'select') {
    const opts = (() => { try { return JSON.parse(q.options || '[]'); } catch { return []; } })();
    return (
      <div className="space-y-2 mt-2">
        {opts.map(opt => (
          <label key={opt} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${value === opt ? 'border-primary bg-primary/5 font-medium' : 'border-slate-200 hover:border-slate-300'}`}>
            <input type="radio" name={q.field_key} value={opt} checked={value === opt} onChange={() => onChange(opt)} className="accent-primary" />
            <span className="text-sm">{opt}</span>
          </label>
        ))}
      </div>
    );
  }
  if (q.field_type === 'textarea') {
    return <Textarea rows={3} value={value || ''} onChange={e => onChange(e.target.value)} placeholder="כתוב כאן..." className="mt-2" />;
  }
  return <Input type={q.field_type === 'number' ? 'number' : 'text'} value={value || ''} onChange={e => onChange(e.target.value)} placeholder="הקלד כאן..." className="mt-2" />;
}

export default function Questionnaire() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    base44.entities.QuestionnaireQuestion.filter({ question_type: 'pre_screening', is_active: true })
      .then(qs => { setQuestions(qs); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const sections = useMemo(() => {
    const grouped = {};
    questions.forEach(q => {
      if (!grouped[q.section_number]) grouped[q.section_number] = { number: q.section_number, name: q.section_name, questions: [] };
      grouped[q.section_number].questions.push(q);
    });
    return Object.values(grouped)
      .sort((a, b) => a.number - b.number)
      .map(s => ({ ...s, questions: s.questions.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)) }));
  }, [questions]);

  const currentSection = sections[step] || {};
  const visibleQs = (currentSection.questions || []).filter(q => evalCondition(q, formData));

  const validate = () => {
    const missing = visibleQs.find(q => q.is_required && (formData[q.field_key] === undefined || formData[q.field_key] === '' || formData[q.field_key] === null));
    if (missing) { setError('אנא מלא את כל שדות החובה'); return false; }
    setError(''); return true;
  };

  const next = () => { if (validate()) { setStep(s => s + 1); window.scrollTo(0, 0); } };
  const prev = () => { setStep(s => s - 1); setError(''); window.scrollTo(0, 0); };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const created = await base44.entities.Candidate.create({
        full_name: String(formData.full_name || ''),
        personal_number: String(formData.personal_number || ''),
        phone: String(formData.phone || ''),
        questionnaire_data: formData,
        status: 'pending',
      });
      await addTimelineEvent({
        candidate_id: created.id,
        event_type: 'questionnaire',
        title: 'מילוי שאלון מקדים',
        actor_name: formData.full_name || '',
        stage_key: 'day_selection',
      });
      setSubmitted(true);
    } catch {
      setError('שגיאה בשמירת הנתונים. אנא נסה שוב.');
    }
    setSubmitting(false);
  };

  const setField = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

  if (loading) return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (submitted) return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-primary/5 to-white flex items-center justify-center p-4 font-body">
      <div className="bg-white rounded-3xl shadow-lg p-10 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="font-display text-2xl font-bold text-primary mb-3">תודה!</h2>
        <p className="text-slate-600">תודה על מילוי השאלון, מחכים לפגוש אותך ביום המיונים!</p>
      </div>
    </div>
  );

  if (!sections.length) return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center p-4 font-body">
      <div className="text-center text-slate-500">השאלון אינו זמין כרגע. אנא פנה למנהל המערכת.</div>
    </div>
  );

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-primary/5 to-white py-10 px-4 font-body">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="font-display text-xl font-bold text-primary">שאלון לקראת יום מיונים לקורס קציני דת</h1>
        </div>

        {/* Progress */}
        <div className="flex gap-1.5 mb-8">
          {sections.map((_, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i <= step ? 'bg-primary' : 'bg-slate-200'}`} />
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <div className="mb-6">
            <div className="text-xs font-medium text-primary/60 mb-1">פרק {currentSection.number} מתוך {sections.length}</div>
            <h2 className="font-display text-xl font-bold text-primary">{currentSection.name}</h2>
          </div>

          <div className="space-y-6">
            {visibleQs.map(q => (
              <div key={q.id}>
                <Label className="font-medium text-sm">
                  {q.question_text}
                  {q.is_required && <span className="text-rose-500 mr-1">*</span>}
                </Label>
                <QuestionField q={q} value={formData[q.field_key]} onChange={val => setField(q.field_key, val)} />
              </div>
            ))}
          </div>

          {error && <p className="text-rose-500 text-sm mt-5 bg-rose-50 p-3 rounded-xl">{error}</p>}

          <div className="flex justify-between mt-8 pt-6 border-t border-slate-100">
            <Button variant="outline" onClick={prev} disabled={step === 0} className="gap-2">
              <ChevronRight className="w-4 h-4" /> הקודם
            </Button>
            {step < sections.length - 1 ? (
              <Button onClick={next} className="gap-2">
                הבא <ChevronLeft className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={submit} disabled={submitting} className="gap-2 min-w-28">
                {submitting ? 'שולח...' : 'שלח שאלון'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}