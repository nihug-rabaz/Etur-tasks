"use client";

import { useState } from "react";
import { toast } from "sonner";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import {
  PROFESSIONAL_DIMENSIONS,
  SMACH_DECISIONS,
  THRESHOLD_TESTS,
} from "@/modules/agam/lib/stages";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/modules/agam/lib/ui";
import type { AgamSmachDecision, AgamSmachEvaluation } from "@/modules/agam/types";

export function SmachStage({
  candidateId,
  evaluations,
  currentUserId,
  canEvaluate,
  onSaved,
}: {
  candidateId: string;
  evaluations: AgamSmachEvaluation[];
  currentUserId: string;
  canEvaluate: boolean;
  onSaved: () => void;
}) {
  const mine = evaluations.find((row) => row.evaluator_id === currentUserId);
  const others = evaluations.filter((row) => row.evaluator_id !== currentUserId);
  const [thresholdTests, setThresholdTests] = useState<
    Record<string, { pass?: boolean; datum?: string }>
  >((mine?.threshold_tests as Record<string, { pass?: boolean; datum?: string }>) ?? {});
  const [professionalScores, setProfessionalScores] = useState<Record<string, number>>(
    mine?.professional_scores ?? {},
  );
  const [professionalFeedback, setProfessionalFeedback] = useState<Record<string, string>>(
    mine?.professional_feedback ?? {},
  );
  const [weightedScore, setWeightedScore] = useState(mine?.weighted_score?.toString() ?? "");
  const [keyPoints, setKeyPoints] = useState(mine?.key_points ?? "");
  const [decision, setDecision] = useState<AgamSmachDecision | "">(mine?.decision ?? "");
  const [decisionReasoning, setDecisionReasoning] = useState(mine?.decision_reasoning ?? "");
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    setSaving(true);
    try {
      await agamFetch("/api/agam/smach", {
        method: "POST",
        body: JSON.stringify({
          candidateId,
          thresholdTests,
          professionalScores,
          professionalFeedback,
          weightedScore: weightedScore ? Number(weightedScore) : null,
          keyPoints,
          decision: decision || null,
          decisionReasoning,
        }),
      });
      toast.success("הערכת סמ״ח נשמרה");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="dashboard-glass space-y-6 rounded-3xl p-6">
        <h2 className="text-2xl font-extrabold text-text-primary">הערכת סמ״ח</h2>
        {canEvaluate ? (
          <>
            <section className="space-y-3">
              <h3 className="font-bold">חלק א׳ — מבחני סף</h3>
              {THRESHOLD_TESTS.map((test) => (
                <div key={test.key} className="rounded-xl bg-surface-2 p-3">
                  <p className="text-sm font-bold">{test.label}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={
                        thresholdTests[test.key]?.pass === true ? primaryButtonClass : secondaryButtonClass
                      }
                      onClick={() =>
                        setThresholdTests((current) => ({
                          ...current,
                          [test.key]: { ...current[test.key], pass: true },
                        }))
                      }
                    >
                      עבר
                    </button>
                    <button
                      type="button"
                      className={
                        thresholdTests[test.key]?.pass === false ? primaryButtonClass : secondaryButtonClass
                      }
                      onClick={() =>
                        setThresholdTests((current) => ({
                          ...current,
                          [test.key]: { ...current[test.key], pass: false },
                        }))
                      }
                    >
                      לא עבר
                    </button>
                    <input
                      className={`${fieldClass} max-w-[160px]`}
                      placeholder={test.datum}
                      value={thresholdTests[test.key]?.datum ?? ""}
                      onChange={(event) =>
                        setThresholdTests((current) => ({
                          ...current,
                          [test.key]: { ...current[test.key], datum: event.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
            </section>

            <section className="space-y-3">
              <h3 className="font-bold">חלק ב׳ — הערכה מקצועית (1–5)</h3>
              {PROFESSIONAL_DIMENSIONS.map((name) => (
                <div key={name} className="rounded-xl bg-surface-2 p-3">
                  <p className="text-sm font-bold">{name}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={
                          professionalScores[name] === value ? primaryButtonClass : secondaryButtonClass
                        }
                        onClick={() => setProfessionalScores((current) => ({ ...current, [name]: value }))}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  <textarea
                    className={`${fieldClass} mt-2`}
                    placeholder="משוב"
                    value={professionalFeedback[name] ?? ""}
                    onChange={(event) =>
                      setProfessionalFeedback((current) => ({ ...current, [name]: event.target.value }))
                    }
                  />
                </div>
              ))}
            </section>

            <label className="block space-y-2 text-sm font-bold text-text-secondary">
              חלק ג׳ — ציון משוקלל (0–100)
              <input
                type="number"
                min={0}
                max={100}
                dir="ltr"
                className={`${fieldClass} max-w-[140px] text-left`}
                value={weightedScore}
                onChange={(event) => setWeightedScore(event.target.value)}
              />
            </label>
            <label className="block space-y-2 text-sm font-bold text-text-secondary">
              חלק ד׳ — נקודות מפתח
              <textarea
                className={fieldClass}
                rows={3}
                value={keyPoints}
                onChange={(event) => setKeyPoints(event.target.value)}
              />
            </label>
            <div className="space-y-2">
              <p className="text-sm font-bold text-text-secondary">חלק ה׳ — החלטה</p>
              <div className="flex flex-wrap gap-2">
                {SMACH_DECISIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={decision === item ? primaryButtonClass : secondaryButtonClass}
                    onClick={() => setDecision(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <textarea
                className={fieldClass}
                placeholder="נימוק"
                value={decisionReasoning}
                onChange={(event) => setDecisionReasoning(event.target.value)}
              />
            </div>
            <button type="button" className={primaryButtonClass} onClick={() => void onSave()} disabled={saving}>
              {saving ? "שומר…" : "שמירה"}
            </button>
          </>
        ) : (
          <p className="text-sm text-text-muted">צפייה בלבד.</p>
        )}
      </div>
      {others.map((row) => (
        <div key={row.id} className="dashboard-glass rounded-3xl p-5">
          <p className="font-bold">{row.evaluator_name}</p>
          <p className="mt-1 text-sm">{row.decision ?? "ללא החלטה"}</p>
          {row.key_points ? <p className="mt-2 text-sm text-text-muted">{row.key_points}</p> : null}
        </div>
      ))}
    </div>
  );
}
