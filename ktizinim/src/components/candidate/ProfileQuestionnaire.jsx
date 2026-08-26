import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

// Displays the candidate's pre-screening questionnaire responses, grouped by section.
export default function ProfileQuestionnaire({ candidate }) {
  const [sections, setSections] = useState(null);
  const qData = candidate.questionnaire_data || {};

  useEffect(() => {
    base44.entities.QuestionnaireQuestion.filter({ question_type: 'pre_screening', is_active: true })
      .then((questions) => {
        const sorted = questions.sort((a, b) => a.section_number - b.section_number || a.sort_order - b.sort_order);
        const grouped = {};
        sorted.forEach((q) => {
          if (!grouped[q.section_number]) grouped[q.section_number] = { name: q.section_name, questions: [] };
          grouped[q.section_number].questions.push(q);
        });
        setSections(Object.values(grouped));
      })
      .catch(() => setSections([]));
  }, []);

  if (!sections) return <div className="text-center py-6 text-slate-400">טוען שאלון...</div>;
  if (!sections.length || !Object.keys(qData).length) return null;

  return (
    <div className="space-y-3">
      <h2 className="font-display text-lg font-bold">שאלון מקדים</h2>
      {sections.map((section, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5">
          {section.name && <h3 className="font-bold text-primary mb-3">{section.name}</h3>}
          <div className="space-y-1">
            {section.questions.map((q) => {
              const val = qData[q.field_key];
              if (val == null || val === '') return null;
              return (
                <div key={q.id} className="flex gap-3 text-sm border-b border-slate-50 last:border-0 py-2">
                  <span className="text-slate-500 flex-1">{q.question_text}</span>
                  <span className="font-medium text-slate-800 flex-1">{String(val)}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}