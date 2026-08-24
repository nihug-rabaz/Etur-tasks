"use client";

import { parseQuestionOptions } from "@/modules/agam/lib/questions";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/modules/agam/lib/ui";
import type { AgamQuestion } from "@/modules/agam/types";

export function AgamQuestionField({
  question,
  value,
  onChange,
}: {
  question: AgamQuestion;
  value: string;
  onChange: (value: string) => void;
}) {
  const options = parseQuestionOptions(question.options);
  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-text-secondary">
        {question.question_text}
        {question.is_required ? " *" : ""}
      </p>
      {question.field_type === "select" ? (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              className={value === option ? primaryButtonClass : secondaryButtonClass}
              onClick={() => onChange(option)}
            >
              {option}
            </button>
          ))}
        </div>
      ) : question.field_type === "textarea" ? (
        <textarea className={fieldClass} rows={4} value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input
          type={question.field_type === "number" ? "number" : "text"}
          className={fieldClass}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}
