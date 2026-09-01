"use client";

import { useState } from "react";
import { toast } from "sonner";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import {
  PROFESSIONAL_CRITERIA,
  SMACH_DECISIONS,
  THRESHOLD_TESTS,
  type AgamThresholdInputType,
} from "@/modules/agam/lib/stages";
import { cardClass, dividerTopClass, innerCardClass, panelClass, fieldClass, primaryButtonClass, secondaryButtonClass } from "@/modules/agam/lib/ui";
import type { AgamSmachDecision, AgamSmachEvaluation } from "@/modules/agam/types";

type ThresholdEntry = {
  pass?: boolean | null;
  score?: number | null;
  time?: string | null;
  count?: number | null;
  datum?: string | null;
};

function valueForTest(entry: ThresholdEntry | undefined, inputType: AgamThresholdInputType): string {
  if (!entry) return "";
  if (inputType === "time") return entry.time ?? entry.datum ?? "";
  if (inputType === "count") {
    if (entry.count != null) return String(entry.count);
    return entry.datum ?? "";
  }
  if (entry.score != null) return String(entry.score);
  return entry.datum ?? "";
}

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
  const [thresholdTests, setThresholdTests] = useState<Record<string, ThresholdEntry>>(
    (mine?.threshold_tests as Record<string, ThresholdEntry>) ?? {},
  );
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

  const setThresholdPass = (key: string, pass: boolean) => {
    setThresholdTests((current) => ({ ...current, [key]: { ...current[key], pass } }));
  };

  const setThresholdValue = (key: string, inputType: AgamThresholdInputType, raw: string) => {
    setThresholdTests((current) => {
      const next: ThresholdEntry = { ...current[key] };
      if (inputType === "time") next.time = raw || null;
      else if (inputType === "count") next.count = raw === "" ? null : Number(raw);
      else next.score = raw === "" ? null : Number(raw);
      return { ...current, [key]: next };
    });
  };

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
      <div className={`${panelClass} space-y-6 p-6`}>
        <div>
          <h2 className="text-2xl font-extrabold text-text-primary">הערכת סמ״ח</h2>
          <p className="mt-1 text-sm text-text-muted">
            ההערכה שלך כמעריך. כל מעריך ממלא הערכה נפרדת.
          </p>
        </div>
        {canEvaluate ? (
          <>
            <section className="space-y-3">
              <h3 className="text-lg font-extrabold text-text-primary">חלק א׳ — מבחני סף</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {THRESHOLD_TESTS.map((test) => {
                  const entry = thresholdTests[test.key];
                  return (
                    <div key={test.key} className={cardClass}>
                      <p className="text-sm font-bold text-accent-primary">{test.label}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className={
                            entry?.pass === true
                              ? "rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
                              : secondaryButtonClass
                          }
                          onClick={() => setThresholdPass(test.key, true)}
                        >
                          עבר
                        </button>
                        <button
                          type="button"
                          className={
                            entry?.pass === false
                              ? "rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white"
                              : secondaryButtonClass
                          }
                          onClick={() => setThresholdPass(test.key, false)}
                        >
                          לא עבר
                        </button>
                        <label className="flex items-center gap-2 text-xs font-bold text-text-muted">
                          {test.inputLabel}
                          <input
                            type={test.inputType === "time" ? "text" : "number"}
                            min={test.inputType === "score" ? 1 : 0}
                            max={test.inputType === "score" ? 100 : undefined}
                            dir="ltr"
                            className={`${fieldClass} w-28 text-center`}
                            placeholder={test.inputType === "time" ? "8:30" : "—"}
                            value={valueForTest(entry, test.inputType)}
                            onChange={(event) =>
                              setThresholdValue(test.key, test.inputType, event.target.value)
                            }
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className={`space-y-3 pt-5 ${dividerTopClass}`}>
              <h3 className="text-lg font-extrabold text-text-primary">חלק ב׳ — הערכה מקצועית</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {PROFESSIONAL_CRITERIA.map((criterion) => (
                  <div key={criterion.key} className={cardClass}>
                    <p className="text-sm font-bold text-text-primary">{criterion.label}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-1">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          className={
                            professionalScores[criterion.key] === value
                              ? primaryButtonClass
                              : secondaryButtonClass
                          }
                          onClick={() =>
                            setProfessionalScores((current) => ({
                              ...current,
                              [criterion.key]: value,
                            }))
                          }
                        >
                          {value}
                        </button>
                      ))}
                      <span className="ms-2 text-xs text-text-muted">ציון 1–5</span>
                    </div>
                    <textarea
                      className={`${fieldClass} mt-3`}
                      rows={2}
                      placeholder="התרשמות מילולית"
                      value={professionalFeedback[criterion.key] ?? ""}
                      onChange={(event) =>
                        setProfessionalFeedback((current) => ({
                          ...current,
                          [criterion.key]: event.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className={`${cardClass} space-y-2`}>
              <h3 className="text-lg font-extrabold text-text-primary">חלק ג׳ — ציון משוקלל</h3>
              <p className="text-xs text-text-muted">
                הזנה ידנית. בעתיד יחושב אוטומטית על בסיס משקלי הקריטריונים.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  max={100}
                  dir="ltr"
                  className={`${fieldClass} max-w-[140px] text-center text-lg font-bold`}
                  placeholder="—"
                  value={weightedScore}
                  onChange={(event) => setWeightedScore(event.target.value)}
                />
                <span className="text-sm text-text-muted">ציון 0–100</span>
              </div>
            </section>

            <div className={`${cardClass} space-y-2`}>
              <h3 className="text-lg font-extrabold text-text-primary">
                חלק ד׳ — נקודות משמעותיות מתוך התהליך
              </h3>
              <p className="text-xs text-text-muted">ריכוז הנקודות המרכזיות שעלו במהלך הסמ״ח.</p>
              <textarea
                className={fieldClass}
                rows={5}
                placeholder="נקודות משמעותיות..."
                value={keyPoints}
                onChange={(event) => setKeyPoints(event.target.value)}
              />
            </div>

            <section className={`${cardClass} space-y-3`}>
              <h3 className="text-lg font-extrabold text-text-primary">חלק ה׳ — החלטת הסמ״ח</h3>
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
              <div>
                <p className="mb-1 text-xs font-bold text-text-muted">נימוק להחלטה</p>
                <textarea
                  className={fieldClass}
                  rows={4}
                  placeholder="נימוק מפורט להחלטה..."
                  value={decisionReasoning}
                  onChange={(event) => setDecisionReasoning(event.target.value)}
                />
              </div>
            </section>

            <button type="button" className={primaryButtonClass} onClick={() => void onSave()} disabled={saving}>
              {saving ? "שומר…" : mine ? "עדכון הערכה" : "שמירת הערכה"}
            </button>
          </>
        ) : (
          <p className="text-sm text-text-muted">צפייה בלבד.</p>
        )}
      </div>

      {others.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-text-secondary">הערכות מעריכים נוספים ({others.length})</h3>
          {others.map((row) => (
            <SmachReadOnlyCard key={row.id} evaluation={row} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SmachReadOnlyCard({ evaluation }: { evaluation: AgamSmachEvaluation }) {
  const tests = (evaluation.threshold_tests ?? {}) as Record<string, ThresholdEntry>;
  const scores = evaluation.professional_scores ?? {};
  const feedback = evaluation.professional_feedback ?? {};

  return (
    <article className={`${panelClass} space-y-4 p-5`}>
      <div>
        <p className="font-extrabold text-text-primary">{evaluation.evaluator_name ?? "מעריך"}</p>
        <p className="text-xs text-text-muted">
          {new Date(evaluation.created_at).toLocaleDateString("he-IL")}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold text-text-muted">מבחני סף</p>
        {THRESHOLD_TESTS.map((test) => {
          const entry = tests[test.key];
          const passLabel =
            entry?.pass === false ? "לא עבר" : entry?.pass === true ? "עבר" : "—";
          const detail = valueForTest(entry, test.inputType);
          return (
            <div
              key={test.key}
              className={`flex items-center justify-between gap-2 ${innerCardClass} text-sm`}
            >
              <span>{test.label}</span>
              <span className="font-bold">
                <span
                  className={
                    entry?.pass === false
                      ? "text-rose-600"
                      : entry?.pass === true
                        ? "text-emerald-600"
                        : "text-text-muted"
                  }
                >
                  {passLabel}
                </span>
                {detail ? <span className="ms-2 text-text-muted">{detail}</span> : null}
              </span>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold text-text-muted">הערכה מקצועית</p>
        {PROFESSIONAL_CRITERIA.map((criterion) => (
          <div key={criterion.key} className={innerCardClass}>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span>{criterion.label}</span>
              <span className="font-bold text-accent-primary">
                {scores[criterion.key] ?? "—"} / 5
              </span>
            </div>
            {feedback[criterion.key] ? (
              <p className="mt-1 whitespace-pre-wrap text-xs text-text-muted">
                {feedback[criterion.key]}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      {evaluation.weighted_score != null ? (
        <div className={`flex items-center justify-between ${innerCardClass} bg-accent-primary/10`}>
          <span className="text-sm font-bold text-accent-primary">ציון משוקלל</span>
          <span className="text-2xl font-extrabold text-accent-primary">{evaluation.weighted_score}</span>
        </div>
      ) : null}

      {evaluation.key_points ? (
        <div className={`${innerCardClass} text-sm`}>
          <p className="text-xs font-bold text-text-muted">נקודות משמעותיות</p>
          <p className="mt-1 whitespace-pre-wrap">{evaluation.key_points}</p>
        </div>
      ) : null}

      {evaluation.decision ? (
        <div className={`pt-3 ${dividerTopClass}`}>
          <p className="text-sm font-bold">החלטה: {evaluation.decision}</p>
          {evaluation.decision_reasoning ? (
            <p className="mt-1 whitespace-pre-wrap text-sm text-text-muted">
              {evaluation.decision_reasoning}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
