"use client";

import { useEffect } from "react";
import { CheckCircle2, Plus, Trash2, XCircle, FastForward } from "lucide-react";
import { BIYENISH_LABEL } from "@/modules/malshabim/lib/question-bank";
import { CANDIDATE_STATUSES, INSTRUCTION_STATUSES } from "@/modules/malshabim/lib/status";
import { fieldClass, secondaryButtonClass } from "@/modules/malshabim/lib/ui";
import type {
  InstructionItem,
  InterviewFormData,
} from "@/modules/malshabim/components/interview/types";
import type { MalshabimInstructionStatus } from "@/modules/malshabim/types";

const PASS_MIN_CORRECT = 11;
const SKIP_MIN_CORRECT = 4;

export function StepSummary({
  data,
  onChange,
}: {
  data: InterviewFormData;
  onChange: (next: InterviewFormData) => void;
}) {
  const skipped = data.quiz_skipped === true;
  const allQuestions = data.quiz_questions || [];
  const questions = skipped ? allQuestions.slice(0, 5) : allQuestions;
  const correct = questions.filter((q) => q.is_correct).length;
  const total = questions.length || 1;
  const score = Math.round((correct / total) * 100);
  const passed = skipped ? correct >= SKIP_MIN_CORRECT : correct >= PASS_MIN_CORRECT;

  useEffect(() => {
    if (data.quiz_score === score && data.quiz_passed === passed) return;
    onChange({ ...data, quiz_score: score, quiz_passed: passed });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, passed]);

  const set = <K extends keyof InterviewFormData>(key: K, value: InterviewFormData[K]) =>
    onChange({ ...data, [key]: value });

  const items = (data.instruction_items || []) as InstructionItem[];
  const updateItems = (next: InstructionItem[]) =>
    onChange({ ...data, instruction_items: next });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-2xl bg-accent-primary p-5 text-white">
        <div>
          <p className="text-sm opacity-80">
            תוצאת המבחן {skipped ? `(${BIYENISH_LABEL})` : ""}
          </p>
          <p className="text-4xl font-black">{score}</p>
          <p className="text-sm opacity-80">
            {correct} מתוך {total} תשובות נכונות
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {skipped ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-white/20 px-2.5 py-1 text-xs font-bold">
              <FastForward className="h-3.5 w-3.5" /> דילוג {BIYENISH_LABEL}
            </span>
          ) : null}
          <span
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-bold text-white ${
              passed ? "bg-green-600" : "bg-rose-600"
            }`}
          >
            {passed ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {passed ? "עבר" : "לא עבר"}
          </span>
        </div>
      </div>

      <label className="block space-y-1.5 text-sm font-bold text-text-primary">
        סטטוס
        <select
          className={fieldClass}
          value={data.candidate_status || "ממתין לריאיון"}
          onChange={(e) => set("candidate_status", e.target.value)}
        >
          {CANDIDATE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5 text-sm font-bold text-text-primary">
        סיכום הראיון
        <textarea
          className={`${fieldClass} min-h-32`}
          placeholder="כתוב סיכום חופשי של הראיון..."
          value={data.interview_summary || ""}
          onChange={(e) => set("interview_summary", e.target.value)}
        />
      </label>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-text-primary">הנחיות לביצוע</p>
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() =>
              updateItems([
                ...items,
                { text: "", status: "בטיפול", recipients: [], sent_at: null },
              ])
            }
          >
            <Plus className="h-4 w-4" /> הוסף הנחיה
          </button>
        </div>
        {items.length === 0 ? (
          <p className="rounded-xl bg-surface-2/60 px-3 py-3 text-sm text-text-muted">
            אין הנחיות עדיין — הוסף הנחיה חדשה.
          </p>
        ) : null}
        {items.map((item, idx) => (
          <div key={idx} className="space-y-2 rounded-2xl bg-surface-2/70 p-4">
            <div className="flex items-start gap-2">
              <span className="mt-2 text-sm font-bold text-text-muted">{idx + 1}.</span>
              <textarea
                className={`${fieldClass} min-h-20 flex-1`}
                placeholder="תוכן ההנחיה..."
                value={item.text || ""}
                onChange={(e) =>
                  updateItems(
                    items.map((it, i) => (i === idx ? { ...it, text: e.target.value } : it)),
                  )
                }
              />
              <button
                type="button"
                className="mt-1 rounded-lg p-2 text-rose-600 hover:bg-rose-500/10"
                onClick={() => updateItems(items.filter((_, i) => i !== idx))}
                aria-label="מחק הנחיה"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <label className="mr-6 block space-y-1 text-xs font-bold text-text-muted">
              סטטוס הנחיה
              <select
                className={fieldClass}
                value={item.status || "בטיפול"}
                onChange={(e) =>
                  updateItems(
                    items.map((it, i) =>
                      i === idx
                        ? { ...it, status: e.target.value as MalshabimInstructionStatus }
                        : it,
                    ),
                  )
                }
              >
                {INSTRUCTION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
