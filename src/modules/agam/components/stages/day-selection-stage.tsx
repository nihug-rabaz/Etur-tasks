"use client";

import Link from "next/link";
import { useState } from "react";
import {
  RECOMMENDATION_TONES,
} from "@/modules/agam/lib/stages";
import { innerCardClass, panelClass, primaryButtonClass, secondaryButtonClass, dividerClass, dividerTopClass } from "@/modules/agam/lib/ui";
import type {
  AgamCandidate,
  AgamCriterion,
  AgamDayEvaluation,
  AgamInterview,
  AgamQuestion,
} from "@/modules/agam/types";

type TabId = "questionnaire" | "interviews" | "evaluations";

export function DaySelectionStage({
  candidate,
  candidateId,
  interviews,
  evaluations,
  preQuestions,
  interviewQuestions,
  criteria,
  canEvaluate,
}: {
  candidate: AgamCandidate;
  candidateId: string;
  interviews: AgamInterview[];
  evaluations: AgamDayEvaluation[];
  preQuestions: AgamQuestion[];
  interviewQuestions: AgamQuestion[];
  criteria: AgamCriterion[];
  canEvaluate: boolean;
}) {
  const [tab, setTab] = useState<TabId>("questionnaire");
  const qData = (candidate.questionnaire_data ?? {}) as Record<string, unknown>;
  const interviewLabelByKey = Object.fromEntries(
    interviewQuestions.map((question) => [question.field_key, question.question_text]),
  );
  const tabs: Array<{ id: TabId; label: string }> = [
    { id: "questionnaire", label: "שאלון מקדים" },
    { id: "interviews", label: `ראיונות (${interviews.length})` },
    { id: "evaluations", label: `יום מיונים (${evaluations.length})` },
  ];

  return (
    <div className="space-y-6">
      <div className={`${panelClass} p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold text-text-primary">יום המיונים</h2>
            <p className="mt-1 text-sm text-text-muted">שאלון מקדים, ראיונות והערכות קריטריונים</p>
          </div>
          {canEvaluate ? (
            <div className="flex flex-wrap gap-2">
              <Link href={`/agam/candidates/${candidateId}/interview`} className={primaryButtonClass}>
                ראיון חדש
              </Link>
              <Link href={`/agam/candidates/${candidateId}/evaluation`} className={secondaryButtonClass}>
                הערכה חדשה
              </Link>
            </div>
          ) : null}
        </div>
        <div className={`mt-5 flex gap-1 overflow-x-auto ${dividerClass}`}>
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`whitespace-nowrap px-4 py-2.5 text-sm font-bold transition ${
                tab === item.id
                  ? "border-b-2 border-accent-primary text-accent-primary"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "questionnaire" ? (
        <section className={`${panelClass} p-6`}>
          {preQuestions.length === 0 ? (
            <p className="text-sm text-text-muted">אין שאלות מוגדרות.</p>
          ) : (
            <div className="divide-y divide-border-weak/50">
              {preQuestions.map((question) => {
                const value = qData[question.field_key];
                if (value == null || value === "") return null;
                return (
                  <div key={question.id} className="flex flex-wrap gap-3 py-3 text-sm">
                    <span className="min-w-40 shrink-0 text-text-muted">{question.question_text}</span>
                    <span className="font-bold text-text-primary">{String(value)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {tab === "interviews" ? (
        <div className="space-y-4">
          {canEvaluate ? (
            <Link href={`/agam/candidates/${candidateId}/interview`} className={primaryButtonClass}>
              הוספת ראיון חדש
            </Link>
          ) : null}
          {interviews.length === 0 ? (
            <div className={`${panelClass} p-8 text-center text-sm text-text-muted`}>
              אין ראיונות עדיין
            </div>
          ) : (
            interviews.map((interview) => (
              <article key={interview.id} className={`${panelClass} p-6`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-extrabold text-text-primary">
                      {interview.evaluator_name ?? "מעריך"}
                    </p>
                    <p className="text-xs text-text-muted">
                      {new Date(interview.created_at).toLocaleDateString("he-IL")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {interview.recommendation ? (
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          RECOMMENDATION_TONES[interview.recommendation] ??
                          "bg-surface-2 text-text-secondary"
                        }`}
                      >
                        {interview.recommendation}
                      </span>
                    ) : null}
                    {canEvaluate ? (
                      <Link
                        href={`/agam/candidates/${candidateId}/interview?interviewId=${interview.id}`}
                        className={secondaryButtonClass}
                      >
                        עריכה
                      </Link>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {Object.entries(interview.interview_data ?? {}).map(([key, value]) =>
                    value ? (
                      <div key={key} className={`${innerCardClass} text-sm`}>
                        <p className="text-xs font-bold text-text-muted">
                          {interviewLabelByKey[key] ?? key}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap font-semibold">{String(value)}</p>
                      </div>
                    ) : null,
                  )}
                  {interview.evaluator_assessment ? (
                    <div className={`pt-3 ${dividerTopClass}`}>
                      <p className="text-xs font-bold text-text-muted">התרשמות המעריך</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{interview.evaluator_assessment}</p>
                    </div>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      ) : null}

      {tab === "evaluations" ? (
        <div className="space-y-4">
          {canEvaluate ? (
            <Link href={`/agam/candidates/${candidateId}/evaluation`} className={primaryButtonClass}>
              הוספת הערכה חדשה
            </Link>
          ) : null}
          {evaluations.length === 0 ? (
            <div className={`${panelClass} p-8 text-center text-sm text-text-muted`}>
              אין הערכות עדיין
            </div>
          ) : (
            evaluations.map((evaluation) => (
              <article key={evaluation.id} className={`${panelClass} p-6`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-extrabold text-text-primary">
                      {evaluation.evaluator_name ?? "מעריך"}
                    </p>
                    <p className="text-xs text-text-muted">
                      {new Date(evaluation.created_at).toLocaleDateString("he-IL")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="text-2xl font-extrabold text-accent-primary">
                        {evaluation.final_score ?? evaluation.weighted_score ?? "—"}
                      </p>
                      <p className="text-xs text-text-muted">ציון</p>
                    </div>
                    {canEvaluate ? (
                      <Link
                        href={`/agam/candidates/${candidateId}/evaluation?evalId=${evaluation.id}`}
                        className={secondaryButtonClass}
                      >
                        עריכה
                      </Link>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {criteria.map((criterion) => (
                    <div key={criterion.key} className={`${innerCardClass} text-center`}>
                      <p className="text-xl font-extrabold">
                        {evaluation.scores_data?.[criterion.key] ?? "—"}
                      </p>
                      <p className="mt-0.5 text-xs text-text-muted">{criterion.name}</p>
                      {evaluation.feedback_data?.[criterion.key] ? (
                        <p className="mt-2 text-start text-xs text-text-secondary">
                          {evaluation.feedback_data[criterion.key]}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
                {evaluation.final_feedback ? (
                  <p className={`mt-4 pt-3 text-sm text-text-secondary ${dividerTopClass}`}>
                    {evaluation.final_feedback}
                  </p>
                ) : null}
              </article>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
