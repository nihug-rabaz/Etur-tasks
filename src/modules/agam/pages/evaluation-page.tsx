"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { PassFailPicker } from "@/modules/agam/components/pass-fail-picker";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { ScoringEngine } from "@/modules/agam/lib/scoring";
import {
  dividerTopClass,
  fieldClass,
  formShellClass,
  panelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/modules/agam/lib/ui";
import type { AgamCriterion, AgamDayEvaluation } from "@/modules/agam/types";

const SCORE_OPTIONS = [1, 2, 3, 4, 5] as const;
const SCORE_HINTS: Record<(typeof SCORE_OPTIONS)[number], string> = {
  1: "חלש",
  2: "נמוך",
  3: "בינוני",
  4: "טוב",
  5: "מצוין",
};

function ScorePicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div
        className="grid grid-cols-5 gap-1.5 rounded-2xl bg-surface-2 p-1.5"
        role="radiogroup"
        aria-label="ציון 1 עד 5"
      >
        {SCORE_OPTIONS.map((option) => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${option} — ${SCORE_HINTS[option]}`}
              onClick={() => onChange(option)}
              className={`flex h-12 flex-col items-center justify-center rounded-xl text-sm font-extrabold transition ${
                selected
                  ? "bg-text-primary text-white shadow-sm"
                  : "bg-surface-1 text-text-primary hover:bg-surface-1/80"
              }`}
            >
              <span className="text-base leading-none">{option}</span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between px-0.5 text-[10px] font-bold text-text-muted">
        <span>1 · חלש</span>
        <span className="text-xs font-extrabold text-text-primary">
          {SCORE_HINTS[value as (typeof SCORE_OPTIONS)[number]] ?? "—"}
        </span>
        <span>5 · מצוין</span>
      </div>
    </div>
  );
}

export function AgamEvaluationPage({
  candidateId,
  evalId,
}: {
  candidateId: string;
  evalId?: string;
}) {
  const [criteria, setCriteria] = useState<AgamCriterion[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [finalScore, setFinalScore] = useState(70);
  const [finalFeedback, setFinalFeedback] = useState("");
  const [passed, setPassed] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void agamFetch<{ criteria: AgamCriterion[]; evaluation: AgamDayEvaluation | null }>(
      `/api/agam/evaluations${evalId ? `?evalId=${evalId}` : ""}`,
    )
      .then((json) => {
        setCriteria(json.criteria ?? []);
        const loadedScores = json.evaluation?.scores_data ?? {};
        const defaults =
          Object.keys(loadedScores).length > 0
            ? loadedScores
            : ScoringEngine.defaultScores(json.criteria ?? []);
        setScores(defaults);
        setFeedback(json.evaluation?.feedback_data ?? {});
        setFinalScore(json.evaluation?.final_score ?? 70);
        setFinalFeedback(json.evaluation?.final_feedback ?? "");
        setPassed(json.evaluation?.passed ?? null);
      })
      .catch(() => toast.error("טעינת טופס ההערכה נכשלה"))
      .finally(() => setLoaded(true));
  }, [evalId]);

  const liveWeighted = useMemo(
    () => ScoringEngine.calcWeightedScore(scores, criteria),
    [criteria, scores],
  );

  const onSave = async () => {
    if (passed == null) {
      toast.error("נא לבחור עבר או לא עבר");
      return;
    }
    setSaving(true);
    try {
      await agamFetch("/api/agam/evaluations", {
        method: "POST",
        body: JSON.stringify({
          candidateId,
          evalId,
          scoresData: scores,
          feedbackData: feedback,
          finalScore,
          finalFeedback,
          passed,
        }),
      });
      toast.success("ההערכה נשמרה");
      window.location.href = `/agam/candidates/${candidateId}?stage=day_selection`;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <p className="p-6 text-sm text-text-muted">טוען…</p>;
  if (criteria.length === 0) {
    return (
      <div className={formShellClass}>
        <div className={`${panelClass} p-8 text-sm text-text-muted`}>
          לא הוגדרו קריטריונים. הגדירו בפאנל הניהול.
        </div>
      </div>
    );
  }

  return (
    <div className={formShellClass}>
      <header className={`${panelClass} p-5 sm:p-6`}>
        <Link
          href={`/agam/candidates/${candidateId}?stage=day_selection`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-text-muted transition hover:text-text-primary"
        >
          <ChevronLeft size={14} className="rotate-180" />
          חזרה ליום המיונים
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
              תיק מועמד
            </p>
            <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">
              הערכת יום מיונים
            </h1>
            <p className="mt-1.5 text-sm text-text-secondary">
              לחצו על ציון 1–5 לכל קריטריון. ציון חסר נספר כ־0.
            </p>
          </div>
          <div className="rounded-2xl bg-surface-2 px-4 py-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
              משוקלל
            </p>
            <p className="mt-0.5 text-2xl font-extrabold text-text-primary">
              {liveWeighted ?? "—"}
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-4">
        {criteria.map((criterion, index) => {
          const score = scores[criterion.key] ?? 3;
          return (
            <section key={criterion.id} className={`${panelClass} p-5 sm:p-6`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-lg bg-surface-2 px-1.5 text-[11px] font-extrabold text-text-muted">
                      {index + 1}
                    </span>
                    <h2 className="text-base font-extrabold text-text-primary">{criterion.name}</h2>
                  </div>
                  {criterion.bullets ? (
                    <p className="mt-1 text-xs leading-relaxed text-text-muted">{criterion.bullets}</p>
                  ) : null}
                </div>
                <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-bold text-text-muted">
                  {criterion.weight}%
                </span>
              </div>

              <div className="mt-4">
                <ScorePicker
                  value={score}
                  onChange={(next) =>
                    setScores((current) => ({ ...current, [criterion.key]: next }))
                  }
                />
              </div>

              <label className="mt-4 block space-y-1.5">
                <span className="text-[11px] font-semibold text-text-muted">משוב לקריטריון</span>
                <textarea
                  className={fieldClass}
                  rows={2}
                  placeholder="התרשמות קצרה (אופציונלי)"
                  value={feedback[criterion.key] ?? ""}
                  onChange={(event) =>
                    setFeedback((current) => ({
                      ...current,
                      [criterion.key]: event.target.value,
                    }))
                  }
                />
              </label>
            </section>
          );
        })}
      </div>

      <section className={`${panelClass} space-y-5 p-5 sm:p-6`}>
        <div>
          <h2 className="text-base font-extrabold text-text-primary">סיכום והחלטה</h2>
          <p className="mt-1 text-xs text-text-muted">ציון סופי ידני והחלטת עבר / לא עבר</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-[11rem_1fr]">
          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold text-text-muted">ציון סופי (1–100)</span>
            <input
              type="number"
              min={1}
              max={100}
              dir="ltr"
              className={`${fieldClass} text-center text-xl font-extrabold`}
              value={finalScore}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (!Number.isFinite(next)) return;
                setFinalScore(Math.min(100, Math.max(1, Math.round(next))));
              }}
            />
            <p className="text-[11px] font-bold text-text-muted">
              משוקלל אוטומטי: {liveWeighted ?? "—"}
            </p>
          </label>

          <PassFailPicker value={passed} onChange={setPassed} label="החלטה" />
        </div>

        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold text-text-muted">הערה מסכמת</span>
          <textarea
            className={fieldClass}
            rows={3}
            placeholder="הערה מסכמת חופשית"
            value={finalFeedback}
            onChange={(event) => setFinalFeedback(event.target.value)}
          />
        </label>

        <div className={`flex flex-wrap gap-2 pt-1 ${dividerTopClass}`}>
          <button
            type="button"
            className={primaryButtonClass}
            onClick={() => void onSave()}
            disabled={saving}
          >
            {saving ? "שומר…" : "שמירת הערכה"}
          </button>
          <Link
            href={`/agam/candidates/${candidateId}?stage=day_selection`}
            className={secondaryButtonClass}
          >
            ביטול
          </Link>
        </div>
      </section>
    </div>
  );
}
