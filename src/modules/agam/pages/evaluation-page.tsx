"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
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
      })
      .catch(() => toast.error("טעינת טופס ההערכה נכשלה"))
      .finally(() => setLoaded(true));
  }, [evalId]);

  const liveWeighted = useMemo(
    () => ScoringEngine.calcWeightedScore(scores, criteria),
    [criteria, scores],
  );

  const onSave = async () => {
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">תיק מועמד</p>
            <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">
              הערכת יום מיונים
            </h1>
            <p className="mt-1.5 text-sm text-text-secondary">
              כל קריטריון מדורג 1–5 לפי משקלו. ציון חסר נספר כ־0.
            </p>
          </div>
          <div className="rounded-2xl bg-surface-2 px-4 py-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">משוקלל</p>
            <p className="mt-0.5 text-2xl font-extrabold text-text-primary">{liveWeighted ?? "—"}</p>
          </div>
        </div>
      </header>

      {criteria.map((criterion) => (
        <section key={criterion.id} className={`${panelClass} space-y-3 p-5 sm:p-6`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-text-primary">{criterion.name}</h2>
              {criterion.bullets ? <p className="mt-1 text-xs text-text-muted">{criterion.bullets}</p> : null}
            </div>
            <span className="shrink-0 text-xs font-semibold text-text-muted">{criterion.weight}%</span>
          </div>
          <label className="block text-sm font-semibold text-text-primary">
            ציון: {scores[criterion.key] ?? 3}
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              className="mt-2 w-full accent-[var(--text-primary)]"
              value={scores[criterion.key] ?? 3}
              onChange={(event) =>
                setScores((current) => ({ ...current, [criterion.key]: Number(event.target.value) }))
              }
            />
          </label>
          <textarea
            className={fieldClass}
            placeholder="משוב לקריטריון"
            value={feedback[criterion.key] ?? ""}
            onChange={(event) =>
              setFeedback((current) => ({ ...current, [criterion.key]: event.target.value }))
            }
          />
        </section>
      ))}

      <section className={`${panelClass} space-y-3 p-5 sm:p-6`}>
        <label className="block text-sm font-semibold text-text-primary">
          ציון סופי ידני: {finalScore}
          <input
            type="range"
            min={1}
            max={100}
            step={1}
            className="mt-2 w-full accent-[var(--text-primary)]"
            value={finalScore}
            onChange={(event) => setFinalScore(Number(event.target.value))}
          />
        </label>
        <textarea
          className={fieldClass}
          placeholder="הערה מסכמת חופשית"
          value={finalFeedback}
          onChange={(event) => setFinalFeedback(event.target.value)}
        />
        <div className={`flex flex-wrap gap-2 pt-2 ${dividerTopClass}`}>
          <button type="button" className={primaryButtonClass} onClick={() => void onSave()} disabled={saving}>
            {saving ? "שומר…" : "שמירת הערכה"}
          </button>
          <Link href={`/agam/candidates/${candidateId}?stage=day_selection`} className={secondaryButtonClass}>
            ביטול
          </Link>
        </div>
      </section>
    </div>
  );
}
