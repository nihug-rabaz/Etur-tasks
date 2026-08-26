import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import ExportFieldGroup from "./ExportFieldGroup";
import { rowsToCSV, downloadCSV } from "@/lib/csv";
import { CANDIDATE_FIELDS, INTERVIEW_FIELDS, STATIC_DAY_FIELDS, buildDayCriterionFields, buildCandidateContext } from "@/lib/exportFields";

export default function ExportTab() {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState({});

  useEffect(() => {
    Promise.all([
      base44.entities.Candidate.list(),
      base44.entities.Interview.list(),
      base44.entities.DayEvaluation.list(),
      base44.entities.QuestionnaireQuestion.filter({ question_type: 'pre_screening' }),
      base44.entities.QuestionnaireQuestion.filter({ question_type: 'interview' }),
      base44.entities.DayEvaluationCriterion.list(),
    ]).then(([candidates, interviews, dayEvals, preQuestions, interviewQuestions, criteria]) => {
      setData({ candidates, interviews, dayEvals, preQuestions, interviewQuestions, criteria });
    });
  }, []);

  const preFields = useMemo(() => (data?.preQuestions || []).map(q => ({
    key: `pre.${q.field_key}`, label: q.question_text, get: c => c.questionnaire_data?.[q.field_key],
  })), [data]);

  const interviewDynamicFields = useMemo(() => (data?.interviewQuestions || []).map(q => ({
    key: `interviewq.${q.field_key}`, label: q.question_text, get: (c, ctx) => ctx.interview?.interview_data?.[q.field_key],
  })), [data]);

  const dayFields = useMemo(() => [...STATIC_DAY_FIELDS, ...buildDayCriterionFields(data?.criteria || [])], [data]);

  const toggle = (key) => setSelected(s => ({ ...s, [key]: !s[key] }));
  const toggleAll = (fields, value) => setSelected(s => {
    const next = { ...s };
    fields.forEach(f => { next[f.key] = value; });
    return next;
  });

  if (!data) return <div className="text-center py-8 text-slate-400">טוען...</div>;

  const interviewFields = [...INTERVIEW_FIELDS, ...interviewDynamicFields];
  const allFields = [...CANDIDATE_FIELDS, ...preFields, ...interviewFields, ...dayFields];
  const selectedFields = allFields.filter(f => selected[f.key]);

  const handleExport = () => {
    if (selectedFields.length === 0) return;
    const rows = data.candidates.map(c => {
      const ctx = buildCandidateContext(c.id, data.interviews, data.dayEvals);
      const row = {};
      selectedFields.forEach(f => { row[f.key] = f.get(c, ctx); });
      return row;
    });
    const columns = selectedFields.map(f => ({ key: f.key, label: f.label }));
    downloadCSV(`דוח_מועמדים_${new Date().toISOString().slice(0, 10)}.csv`, rowsToCSV(rows, columns));
  };

  return (
    <div className="space-y-4">
      <ExportFieldGroup title="פרטי מועמד" fields={CANDIDATE_FIELDS} selected={selected} onToggle={toggle} onToggleAll={v => toggleAll(CANDIDATE_FIELDS, v)} />
      <ExportFieldGroup title="שאלון מקדים" fields={preFields} selected={selected} onToggle={toggle} onToggleAll={v => toggleAll(preFields, v)} />
      <ExportFieldGroup title="ריאיון" fields={interviewFields} selected={selected} onToggle={toggle} onToggleAll={v => toggleAll(interviewFields, v)} />
      <ExportFieldGroup title="יום מיונים" fields={dayFields} selected={selected} onToggle={toggle} onToggleAll={v => toggleAll(dayFields, v)} />
      <div className="flex justify-end">
        <Button onClick={handleExport} disabled={selectedFields.length === 0} className="gap-2">
          <Download className="w-4 h-4" /> ייצוא CSV ({selectedFields.length} שדות)
        </Button>
      </div>
    </div>
  );
}