import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrgSettings } from "@/hooks/useOrgSettings";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { STATUS_LABELS, RECOMMENDATION_COLORS } from "@/lib/scoring";
import { ArrowRight, Download, Check, X } from "lucide-react";
import { addTimelineEvent } from "@/lib/timeline";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

function Block({ title, children }) {
  return (
    <div className="mb-6">
      <h3 className="font-bold text-primary border-b border-slate-200 pb-2 mb-3">{title}</h3>
      {children}
    </div>
  );
}
function DataRow({ label, value }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex gap-3 py-1.5 text-sm border-b border-slate-50 last:border-0">
      <span className="text-slate-400 shrink-0 min-w-44">{label}</span>
      <span className="font-medium">{String(value)}</span>
    </div>
  );
}

export default function Summary(props) {
  const candidateId = props.candidateId || new URLSearchParams(window.location.search).get('candidateId');
  const { user } = useAuth();
  const { isRamad } = useUserRole();
  const { settings } = useOrgSettings();
  const navigate = useNavigate();
  const reportRef = useRef();

  const [candidate, setCandidate] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [evals, setEvals] = useState([]);
  const [preQs, setPreQs] = useState([]);
  const [interviewQs, setInterviewQs] = useState([]);
  const [dayCriteria, setDayCriteria] = useState([]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('pending');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Candidate.get(candidateId),
      base44.entities.Interview.filter({ candidate_id: candidateId }),
      base44.entities.DayEvaluation.filter({ candidate_id: candidateId }),
      base44.entities.QuestionnaireQuestion.filter({ question_type: 'pre_screening', is_active: true }),
      base44.entities.QuestionnaireQuestion.filter({ question_type: 'interview', is_active: true }),
      base44.entities.DayEvaluationCriterion.filter({ is_active: true }),
    ]).then(([c, iv, ev, pqs, iqs, crs]) => {
      setCandidate(c);
      setInterviews(iv);
      setEvals(ev);
      setPreQs(pqs.sort((a, b) => a.section_number - b.section_number || a.sort_order - b.sort_order));
      setInterviewQs(iqs.sort((a, b) => a.section_number - b.section_number || a.sort_order - b.sort_order));
      setDayCriteria(crs.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
      setNotes(c.ramad_notes || '');
      setStatus(c.status || 'pending');
      setLoading(false);
    });
  }, [candidateId]);

  const saveDecision = async (newStatus) => {
    setStatus(newStatus);
    setSaving(true);
    await base44.entities.Candidate.update(candidateId, { status: newStatus, ramad_notes: notes });
    await addTimelineEvent({
      candidate_id: candidateId,
      event_type: 'decision',
      title: `החלטה: ${newStatus === 'passed' ? 'עבר' : 'לא עבר'}`,
      actor_name: user?.full_name,
      stage_key: 'final_decision',
    });
    setSaving(false);
  };
  const saveNotes = async () => {
    setSaving(true);
    await base44.entities.Candidate.update(candidateId, { ramad_notes: notes });
    setSaving(false);
  };

  const exportPdf = async () => {
    setExporting(true);
    const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    const img = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const w = 210; const h = (canvas.height * w) / canvas.width;
    const pageH = 297;
    if (h <= pageH) {
      pdf.addImage(img, 'PNG', 0, 0, w, h);
    } else {
      let offset = 0;
      while (offset < h) {
        if (offset > 0) pdf.addPage();
        pdf.addImage(img, 'PNG', 0, -offset, w, h);
        offset += pageH;
      }
    }
    pdf.save(`${candidate?.full_name}_${candidate?.personal_number}.pdf`);
    setExporting(false);
  };

  if (!isRamad) return <div className="text-center py-20 text-slate-500">דף זה זמין לרמ"ד איתור בלבד</div>;
  if (loading) return <div className="text-center py-20 text-slate-400">טוען...</div>;

  const qData = candidate?.questionnaire_data || {};
  const iqMap = Object.fromEntries(interviewQs.map(q => [q.field_key, q.question_text]));
  const avgScore = evals.length ? Math.round(evals.reduce((s, e) => s + (e.final_score ?? e.weighted_score ?? 0), 0) / evals.length) : null;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        {!props.embedded && (
          <button onClick={() => navigate(`/candidate?id=${candidateId}`)}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition">
            <ArrowRight className="w-4 h-4" /> חזרה לפרופיל
          </button>
        )}
        <Button onClick={exportPdf} disabled={exporting} variant="outline" className="gap-2">
          <Download className="w-4 h-4" /> {exporting ? 'מייצא...' : 'ייצוא PDF'}
        </Button>
      </div>

      {/* Decision panel - not in PDF */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h2 className="font-display font-bold text-lg mb-4">החלטת רמ"ד</h2>
        <div className="flex gap-3 mb-5">
          <button onClick={() => saveDecision('passed')}
            className={`flex-1 py-3 rounded-2xl border font-semibold flex items-center justify-center gap-2 transition text-base ${status === 'passed' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-slate-200 hover:border-emerald-400'}`}>
            <Check className="w-5 h-5" /> עבר
          </button>
          <button onClick={() => saveDecision('not_passed')}
            className={`flex-1 py-3 rounded-2xl border font-semibold flex items-center justify-center gap-2 transition text-base ${status === 'not_passed' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white border-slate-200 hover:border-rose-400'}`}>
            <X className="w-5 h-5" /> לא עבר
          </button>
        </div>
        <Textarea rows={3} placeholder='הערות אישיות של רמ"ד איתור' value={notes}
          onChange={e => setNotes(e.target.value)} onBlur={saveNotes} />
        {saving && <p className="text-xs text-slate-400 mt-2">שומר...</p>}
      </div>

      {/* Printable report */}
      <div ref={reportRef} dir="rtl" className="bg-white rounded-2xl border border-slate-100 p-8 space-y-0 font-body">
        {/* Report header */}
        <div className="border-b-2 border-primary pb-5 mb-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              {settings?.logo_url && (
                <img src={settings.logo_url} alt="לוגו" className="w-12 h-12 object-contain" />
              )}
              <div>
                <div className="text-primary font-bold text-sm">{settings?.unit_name || 'מדור איתור'} · יום מיונים קציני דת</div>
                <div className="text-xs text-slate-400">תאריך הפקת המסמך: {new Date().toLocaleDateString('he-IL')}</div>
              </div>
            </div>
            <div className="text-xs text-slate-500 text-left shrink-0">מספר סימוכין/תיק: {candidate?.personal_number}</div>
          </div>
          <h1 className="font-display text-3xl font-bold mt-1">{candidate?.full_name}</h1>
          <p className="text-slate-500">מספר אישי: {candidate?.personal_number}</p>
          <div className="flex gap-3 mt-3 flex-wrap">
            <span className={`text-xs px-3 py-1.5 rounded-full font-bold ${status === 'passed' ? 'bg-emerald-100 text-emerald-800' : status === 'not_passed' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
              החלטה: {STATUS_LABELS[status]}
            </span>
            {avgScore != null && (
              <span className="text-xs px-3 py-1.5 rounded-full font-medium bg-blue-100 text-blue-800">
                ממוצע ציונים: {avgScore}
              </span>
            )}
          </div>
        </div>

        <Block title="מידע אישי מהשאלון">
          {preQs.map(q => <DataRow key={q.id} label={q.question_text} value={qData[q.field_key]} />)}
        </Block>

        <Block title="ריאיונות אישיים">
          {interviews.length === 0 ? <p className="text-sm text-slate-400">אין ריאיונות</p> : interviews.map((iv, idx) => (
            <div key={iv.id} className="mb-4 pb-4 border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-sm">מעריך {idx + 1}: {iv.evaluator_name}</span>
                {iv.recommendation && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${RECOMMENDATION_COLORS[iv.recommendation] || 'bg-slate-100 text-slate-600'}`}>
                    {iv.recommendation}
                  </span>
                )}
              </div>
              {Object.entries(iv.interview_data || {}).map(([k, v]) => v ? (
                <div key={k} className="text-sm mb-2">
                  <div className="text-xs font-semibold text-slate-500 mb-0.5">{iqMap[k] || k}</div>
                  <div>{v}</div>
                </div>
              ) : null)}
              {iv.evaluator_assessment && (
                <div className="mt-2 bg-slate-50 rounded-xl p-3">
                  <div className="text-xs font-semibold text-slate-500 mb-1">התרשמות המעריך</div>
                  <p className="text-sm">{iv.evaluator_assessment}</p>
                </div>
              )}
            </div>
          ))}
        </Block>

        <Block title="סיכום יום מיונים">
          {evals.length === 0 ? <p className="text-sm text-slate-400">אין הערכות</p> : (
            <table className="w-full text-sm">
              <thead><tr className="text-slate-500 text-xs">
                <th className="text-right py-2">מעריך</th>
                {dayCriteria.map(cr => <th key={cr.key} className="text-center py-2">{cr.name}</th>)}
                <th className="text-center py-2">ציון</th>
              </tr></thead>
              <tbody>
                {evals.map((ev, idx) => (
                  <tr key={ev.id} className="border-t border-slate-100">
                    <td className="py-2">מעריך {idx + 1}: {ev.evaluator_name}</td>
                    {dayCriteria.map(cr => <td key={cr.key} className="text-center py-2 font-bold">{ev.scores_data?.[cr.key] ?? '-'}</td>)}
                    <td className="text-center py-2 font-bold text-primary">{ev.final_score ?? ev.weighted_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {evals.some(e => e.final_feedback) && (
            <div className="mt-3 space-y-2">
              {evals.map((ev, idx) => ev.final_feedback ? (
                <div key={ev.id} className="text-sm bg-slate-50 rounded-xl p-3">
                  <span className="text-xs font-semibold text-slate-500">מעריך {idx + 1}: </span>{ev.final_feedback}
                </div>
              ) : null)}
            </div>
          )}
        </Block>

        <Block title='הערות רמ"ד והחלטה'>
          <div className={`inline-block text-sm px-3 py-1.5 rounded-full font-bold mb-3 ${status === 'passed' ? 'bg-emerald-100 text-emerald-800' : status === 'not_passed' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
            {STATUS_LABELS[status]}
          </div>
          <p className="text-sm whitespace-pre-wrap">{notes || '—'}</p>
        </Block>

        <div className="mt-10 pt-6 border-t border-slate-200 flex justify-end">
          <div className="text-center">
            <div className="w-56 border-b border-slate-400 mb-1.5"></div>
            <p className="text-xs text-slate-500">חתימת רמ"ד איתור</p>
          </div>
        </div>
      </div>
    </div>
  );
}