"use client";

import { FastForward, RotateCcw } from "lucide-react";
import { BIYENISH_LABEL } from "@/modules/malshabim/lib/question-bank";
import { secondaryButtonClass } from "@/modules/malshabim/lib/ui";
import type { InterviewFormData } from "@/modules/malshabim/components/interview/types";

function CorrectToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-surface-2 p-1 select-none" dir="ltr">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`rounded-full px-4 py-1 text-sm font-medium transition ${
          !value ? "bg-rose-600 text-white shadow" : "text-text-muted hover:text-text-primary"
        }`}
      >
        לא
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`rounded-full px-4 py-1 text-sm font-medium transition ${
          value ? "bg-green-600 text-white shadow" : "text-text-muted hover:text-text-primary"
        }`}
      >
        כן
      </button>
    </div>
  );
}

const PREVIEW_COUNT = 5;

export function StepQuiz({
  data,
  onChange,
}: {
  data: InterviewFormData;
  onChange: (next: InterviewFormData) => void;
}) {
  const questions = data.quiz_questions || [];
  const skipped = data.quiz_skipped === true;
  const visibleQuestions = skipped ? questions.slice(0, PREVIEW_COUNT) : questions;

  const setQ = (idx: number, isCorrect: boolean) => {
    const updated = questions.map((q, i) =>
      i === idx ? { ...q, is_correct: isCorrect } : q,
    );
    onChange({ ...data, quiz_questions: updated });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">
        {questions.length} שאלות נבחרו אקראית מתוך המאגר. סמן האם כל תשובה נכונה.
      </p>

      {!skipped && questions.length > PREVIEW_COUNT ? (
        <button
          type="button"
          className={`${secondaryButtonClass} w-full`}
          onClick={() => onChange({ ...data, quiz_skipped: true })}
        >
          <FastForward className="h-4 w-4" />
          {BIYENISH_LABEL} — דלג על יתר שאלות הידע (הסתפק ב-{PREVIEW_COUNT} הראשונות)
        </button>
      ) : null}

      {skipped ? (
        <div className="flex flex-col gap-3 rounded-2xl bg-accent-primary/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-accent-primary">
            סומן {BIYENISH_LABEL} — לאחר {PREVIEW_COUNT} השאלות הראשונות דולגו יתר שאלות הידע.
          </p>
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() => onChange({ ...data, quiz_skipped: false })}
          >
            <RotateCcw className="h-4 w-4" /> החזר את כל השאלות
          </button>
        </div>
      ) : null}

      {visibleQuestions.map((q, i) => (
        <div key={`${q.question}-${i}`} className="rounded-2xl bg-surface-2/70 p-4">
          <p className="text-sm font-bold leading-relaxed text-text-primary">
            {i + 1}. {q.question}
          </p>
          {q.answer ? (
            <p className="mt-1.5 text-sm text-text-muted">תשובה: {q.answer}</p>
          ) : null}
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-sm text-text-muted">האם ענה נכון?</span>
            <CorrectToggle
              value={q.is_correct === true}
              onChange={(v) => setQ(i, v)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
