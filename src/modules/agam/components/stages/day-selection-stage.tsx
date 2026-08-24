"use client";

import Link from "next/link";
import type { AgamDayEvaluation, AgamInterview } from "@/modules/agam/types";
import { primaryButtonClass, secondaryButtonClass } from "@/modules/agam/lib/ui";

export function DaySelectionStage({
  candidateId,
  interviews,
  evaluations,
  questionCount,
  canEvaluate,
}: {
  candidateId: string;
  interviews: AgamInterview[];
  evaluations: AgamDayEvaluation[];
  questionCount: number;
  canEvaluate: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="dashboard-glass rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-extrabold text-text-primary">יום המיונים</h2>
          {canEvaluate ? (
            <div className="flex gap-2">
              <Link href={`/agam/candidates/${candidateId}/interview`} className={primaryButtonClass}>
                ראיון חדש
              </Link>
              <Link href={`/agam/candidates/${candidateId}/evaluation`} className={secondaryButtonClass}>
                הערכה חדשה
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      <section className="dashboard-glass rounded-3xl p-6">
        <h3 className="font-bold text-text-primary">שאלון מקדים ({questionCount} שדות)</h3>
        <p className="mt-1 text-sm text-text-muted">מוצג בתיק המועמד המלא.</p>
      </section>

      <section className="dashboard-glass rounded-3xl p-6">
        <h3 className="font-bold text-text-primary">ראיונות</h3>
        {interviews.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">אין ראיונות.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {interviews.map((interview) => (
              <li
                key={interview.id}
                className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-bold">{interview.evaluator_name ?? "מעריך"}</p>
                  <p className="text-xs text-text-muted">{interview.recommendation ?? "ללא המלצה"}</p>
                </div>
                {canEvaluate ? (
                  <Link
                    href={`/agam/candidates/${candidateId}/interview?interviewId=${interview.id}`}
                    className="text-xs font-bold text-accent-primary"
                  >
                    עריכה
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="dashboard-glass rounded-3xl p-6">
        <h3 className="font-bold text-text-primary">הערכות</h3>
        {evaluations.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">אין הערכות.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {evaluations.map((evaluation) => (
              <li
                key={evaluation.id}
                className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-bold">{evaluation.evaluator_name ?? "מעריך"}</p>
                  <p className="text-xs text-text-muted">
                    משוקלל: {evaluation.weighted_score ?? "—"} · סופי: {evaluation.final_score ?? "—"}
                  </p>
                </div>
                {canEvaluate ? (
                  <Link
                    href={`/agam/candidates/${candidateId}/evaluation?evalId=${evaluation.id}`}
                    className="text-xs font-bold text-accent-primary"
                  >
                    עריכה
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
