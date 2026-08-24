"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { ScoringEngine } from "@/modules/agam/lib/scoring";
import { fieldClass, primaryButtonClass } from "@/modules/agam/lib/ui";
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
        setScores(json.evaluation?.scores_data ?? {});
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
      <div className="mx-auto max-w-3xl p-6">
        <div className="dashboard-glass rounded-3xl p-8">לא הוגדרו קריטריונים. הגדירו בפאנל הניהול.</div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="dashboard-glass rounded-3xl p-6">
        <h1 className="text-3xl font-extrabold text-text-primary">הערכת יום מיונים</h1>
        <p className="mt-2 text-sm text-text-secondary">ציון משוקלל: {liveWeighted ?? "—"}</p>
        <Link href={`/agam/candidates/${candidateId}?stage=day_selection`} className="mt-2 inline-block text-xs font-bold text-accent-primary">
          חזרה ליום המיונים
        </Link>
      </div>
      {criteria.map((criterion) => (
        <section key={criterion.id} className="dashboard-glass space-y-3 rounded-3xl p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-text-primary">{criterion.name}</h2>
              {criterion.bullets ? (
                <p className="text-xs text-text-muted">{criterion.bullets}</p>
              ) : null}
            </div>
            <span className="text-sm text-text-muted">{criterion.weight}%</span>
          </div>
          <label className="block text-sm font-bold text-text-secondary">
            ציון 1–5: {scores[criterion.key] ?? 3}
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              className="mt-2 w-full accent-[var(--accent-primary)]"
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
      <section className="dashboard-glass space-y-3 rounded-3xl p-6">
        <label className="block text-sm font-bold text-text-secondary">
          ציון סופי ידני 1–100: {finalScore}
          <input
            type="range"
            min={1}
            max={100}
            step={1}
            className="mt-2 w-full accent-[var(--accent-primary)]"
            value={finalScore}
            onChange={(event) => setFinalScore(Number(event.target.value))}
          />
        </label>
        <textarea
          className={fieldClass}
          placeholder="סיכום"
          value={finalFeedback}
          onChange={(event) => setFinalFeedback(event.target.value)}
        />
        <button type="button" className={primaryButtonClass} onClick={() => void onSave()} disabled={saving}>
          {saving ? "שומר…" : "שמירה"}
        </button>
      </section>
    </div>
  );
}
