"use client";

import { useEffect } from "react";
import { OBSERVANCE_QUESTIONS } from "@/modules/malshabim/lib/question-bank";
import { fieldClass } from "@/modules/malshabim/lib/ui";
import type { InterviewFormData } from "@/modules/malshabim/components/interview/types";

function YesNoToggle({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const isYes = value === "כן";
  return (
    <div className="flex items-center gap-1 rounded-full bg-surface-2 p-1 select-none" dir="ltr">
      <button
        type="button"
        onClick={() => onChange("לא")}
        className={`rounded-full px-4 py-1 text-sm font-medium transition ${
          !isYes ? "bg-rose-600 text-white shadow" : "text-text-muted hover:text-text-primary"
        }`}
      >
        לא
      </button>
      <button
        type="button"
        onClick={() => onChange("כן")}
        className={`rounded-full px-4 py-1 text-sm font-medium transition ${
          isYes ? "bg-green-600 text-white shadow" : "text-text-muted hover:text-text-primary"
        }`}
      >
        כן
      </button>
    </div>
  );
}

export function StepObservance({
  data,
  onChange,
}: {
  data: InterviewFormData;
  onChange: (next: InterviewFormData) => void;
}) {
  const observance = data.observance || {};

  const setAnswer = (key: string, field: "answer" | "note", value: string) => {
    onChange({
      ...data,
      observance: {
        ...observance,
        [key]: { ...(observance[key] || {}), [field]: value },
      },
    });
  };

  useEffect(() => {
    const updated = { ...observance };
    let changed = false;
    OBSERVANCE_QUESTIONS.forEach((q) => {
      if (!updated[q.key]?.answer) {
        updated[q.key] = { ...(updated[q.key] || {}), answer: "לא" };
        changed = true;
      }
    });
    if (changed) onChange({ ...data, observance: updated });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed defaults once on mount
  }, []);

  return (
    <div className="space-y-4">
      {OBSERVANCE_QUESTIONS.map((q, i) => (
        <div key={q.key} className="rounded-2xl bg-surface-2/70 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-bold text-text-primary">
              {i + 1}. {q.label}
            </p>
            <YesNoToggle
              value={observance[q.key]?.answer || "לא"}
              onChange={(v) => setAnswer(q.key, "answer", v)}
            />
          </div>
          <input
            className={`${fieldClass} mt-3`}
            placeholder="הערה (רשות)"
            value={observance[q.key]?.note || ""}
            onChange={(e) => setAnswer(q.key, "note", e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}
