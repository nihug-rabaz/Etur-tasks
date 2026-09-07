"use client";

import { parseQuestionOptions } from "@/modules/agam/lib/questions";
import { fieldClass, secondaryButtonClass } from "@/modules/agam/lib/ui";
import type { AgamQuestion } from "@/modules/agam/types";

export function AgamQuestionField({
  question,
  value,
  onChange,
  disabled = false,
}: {
  question: AgamQuestion;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const options = parseQuestionOptions(question.options);
  return (
    <div className={`space-y-2 ${disabled ? "opacity-70" : ""}`}>
      <p className="text-sm font-semibold text-text-primary">
        {question.question_text}
        {question.is_required ? <span className="text-text-muted"> *</span> : null}
      </p>
      {question.field_type === "select" ? (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              disabled={disabled}
              className={
                value === option
                  ? "inline-flex items-center justify-center rounded-xl bg-text-primary px-3.5 py-2 text-sm font-bold text-white"
                  : secondaryButtonClass
              }
              onClick={() => onChange(option)}
            >
              {option}
            </button>
          ))}
        </div>
      ) : question.field_type === "textarea" ? (
        <textarea
          className={fieldClass}
          rows={4}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          type={question.field_type === "number" ? "number" : "text"}
          className={fieldClass}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}
