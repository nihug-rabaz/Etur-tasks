"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { DaySelectionStage } from "@/modules/agam/components/stages/day-selection-stage";
import { DocumentsStage } from "@/modules/agam/components/stages/documents-stage";
import { PreparationDayStage } from "@/modules/agam/components/stages/preparation-day-stage";
import { SmachStage, SmachReadOnlyCard } from "@/modules/agam/components/stages/smach-stage";
import { SummaryDecision } from "@/modules/agam/components/stages/summary-decision";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { SOURCE_LABELS } from "@/modules/agam/lib/document-types";
import { groupQuestionsBySection } from "@/modules/agam/lib/questions";
import {
  AGAM_STAGES,
  RECOMMENDATION_TONES,
  STATUS_LABELS,
  STATUS_TONES,
} from "@/modules/agam/lib/stages";
import type {
  AgamCandidate,
  AgamCriterion,
  AgamDayEvaluation,
  AgamDocument,
  AgamInterview,
  AgamOrgSettings,
  AgamPrepDayEvaluation,
  AgamQuestion,
  AgamSmachEvaluation,
  AgamStageKey,
  AgamTimelineItem,
} from "@/modules/agam/types";
import type { ModuleRole } from "@/shared/modules/types";

const TIMELINE_ICONS: Record<string, string> = {
  questionnaire: "📋",
  interview: "🎙️",
  evaluation: "⭐",
  document: "📎",
  decision: "✅",
  stage_change: "➡️",
  note: "📝",
};

type FilePayload = {
  candidate: AgamCandidate;
  interviews: AgamInterview[];
  evaluations: AgamDayEvaluation[];
  prepDays: AgamPrepDayEvaluation[];
  smach: AgamSmachEvaluation[];
  documents: AgamDocument[];
  timeline: AgamTimelineItem[];
  org: AgamOrgSettings | null;
  preQuestions: AgamQuestion[];
  interviewQuestions: AgamQuestion[];
  criteria: AgamCriterion[];
  role: ModuleRole;
  currentUserId: string;
};

export function AgamCandidateFilePage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id;
  const stage = (searchParams.get("stage") as AgamStageKey | null) ?? null;
  const [payload, setPayload] = useState<FilePayload | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await agamFetch<FilePayload>(`/api/agam/candidates/${id}`);
      setPayload(data);
    } catch {
      toast.error("טעינת התיק נכשלה");
    } finally {
      setLoaded(true);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!loaded) return <p className="p-6 text-sm text-text-muted">טוען…</p>;
  if (!payload) return <p className="p-6 text-sm text-rose-600">המועמד לא נמצא.</p>;

  const { candidate, role } = payload;
  const canEvaluate = role === "admin" || role === "ramad" || role === "user";
  const canRamad = role === "admin" || role === "ramad";
  const visibleStages = AGAM_STAGES.filter((item) => !item.ramadOnly || canRamad);

  if (stage === "final_decision" && !canRamad) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="dashboard-glass rounded-3xl p-8 text-center">דף זה זמין לרמ״ד בלבד</div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="dashboard-glass rounded-3xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link href="/agam/candidates" className="text-xs font-bold text-accent-primary">
              חזרה למועמדים
            </Link>
            <p className="mt-2 text-sm font-bold text-accent-primary">תיק מועמד</p>
            <h1 className="mt-1 text-3xl font-extrabold text-text-primary">{candidate.full_name}</h1>
            <p className="mt-1 text-sm text-text-muted" dir="ltr">
              {candidate.personal_number}
              {candidate.phone ? ` · ${candidate.phone}` : ""}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_TONES[candidate.status]}`}>
            {STATUS_LABELS[candidate.status]}
          </span>
        </div>
        <nav className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/agam/candidates/${candidate.id}`}
            className={`rounded-xl px-3 py-2 text-xs font-bold ${
              !stage ? "bg-accent-primary text-white" : "bg-surface-2 text-text-secondary"
            }`}
          >
            תיק
          </Link>
          {visibleStages.map((item) => (
            <Link
              key={item.key}
              href={`/agam/candidates/${candidate.id}?stage=${item.key}`}
              className={`rounded-xl px-3 py-2 text-xs font-bold ${
                stage === item.key ? "bg-accent-primary text-white" : "bg-surface-2 text-text-secondary"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </header>

      {!stage ? (
        <Overview payload={payload} canRamad={canRamad} />
      ) : stage === "day_selection" ? (
        <DaySelectionStage
          candidate={candidate}
          candidateId={candidate.id}
          interviews={payload.interviews}
          evaluations={payload.evaluations}
          preQuestions={payload.preQuestions}
          interviewQuestions={payload.interviewQuestions ?? []}
          criteria={payload.criteria ?? []}
          canEvaluate={canEvaluate}
        />
      ) : stage === "preparation_day" ? (
        <PreparationDayStage
          candidateId={candidate.id}
          evaluations={payload.prepDays}
          currentUserId={payload.currentUserId}
          canEvaluate={canEvaluate}
          onSaved={() => void load()}
        />
      ) : stage === "smach" ? (
        <SmachStage
          candidateId={candidate.id}
          evaluations={payload.smach}
          currentUserId={payload.currentUserId}
          canEvaluate={canEvaluate}
          onSaved={() => void load()}
        />
      ) : stage === "documents" ? (
        <DocumentsStage
          candidateId={candidate.id}
          documents={payload.documents}
          canEvaluate={canEvaluate}
          onSaved={() => void load()}
        />
      ) : stage === "final_decision" ? (
        <SummaryDecision
          candidate={candidate}
          interviews={payload.interviews}
          dayEvals={payload.evaluations}
          preQuestions={payload.preQuestions}
          interviewQuestions={payload.interviewQuestions ?? []}
          criteria={payload.criteria ?? []}
          org={payload.org}
          onSaved={() => {
            void load();
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function Overview({ payload, canRamad }: { payload: FilePayload; canRamad: boolean }) {
  const data = (payload.candidate.questionnaire_data ?? {}) as Record<string, unknown>;
  const sections = groupQuestionsBySection(payload.preQuestions);

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {AGAM_STAGES.filter((item) => !item.ramadOnly || canRamad).map((item) => (
          <Link
            key={item.key}
            href={`/agam/candidates/${payload.candidate.id}?stage=${item.key}`}
            className="dashboard-glass block rounded-3xl p-5 transition hover:-translate-y-0.5"
          >
            <p className="text-xl font-extrabold text-text-primary">{item.name}</p>
            <p className="mt-1 text-xs text-text-muted">{item.description}</p>
          </Link>
        ))}
      </section>

      <section className="dashboard-glass rounded-3xl p-6">
        <h2 className="text-2xl font-extrabold text-text-primary">שאלון מקדים</h2>
        {sections.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">אין שאלות מוגדרות.</p>
        ) : (
          <div className="mt-4 space-y-5">
            {sections.map(([sectionKey, section]) => (
              <div key={sectionKey}>
                <p className="mb-2 text-sm font-bold text-accent-primary">{section.name}</p>
                <dl className="grid gap-3 sm:grid-cols-2">
                  {section.items.map((question) => (
                    <div key={question.id} className="rounded-xl bg-surface-2 px-3 py-2">
                      <dt className="text-xs text-text-muted">{question.question_text}</dt>
                      <dd className="mt-1 text-sm font-bold">
                        {String(data[question.field_key] ?? "—")}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-glass space-y-4 rounded-3xl p-6">
        <h2 className="text-2xl font-extrabold text-text-primary">הערכות</h2>
        <EvalGroup title={`ראיונות (${payload.interviews.length})`}>
          {payload.interviews.length === 0 ? (
            <p className="text-sm text-text-muted">אין ראיונות.</p>
          ) : (
            payload.interviews.map((interview) => (
              <div key={interview.id} className="rounded-xl bg-surface-2 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold">{interview.evaluator_name ?? "מעריך"}</p>
                  {interview.recommendation ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        RECOMMENDATION_TONES[interview.recommendation] ?? "bg-surface-1"
                      }`}
                    >
                      {interview.recommendation}
                    </span>
                  ) : null}
                </div>
                {interview.evaluator_assessment ? (
                  <p className="mt-1 line-clamp-3 text-xs text-text-muted">
                    {interview.evaluator_assessment}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </EvalGroup>

        <EvalGroup title={`יום מיונים (${payload.evaluations.length})`}>
          {payload.evaluations.length === 0 ? (
            <p className="text-sm text-text-muted">אין הערכות.</p>
          ) : (
            payload.evaluations.map((evaluation) => (
              <div key={evaluation.id} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2">
                <p className="text-sm font-bold">{evaluation.evaluator_name ?? "מעריך"}</p>
                <p className="text-lg font-extrabold text-accent-primary">
                  {evaluation.final_score ?? evaluation.weighted_score ?? "—"}
                </p>
              </div>
            ))
          )}
        </EvalGroup>

        <EvalGroup title={`היום המכין (${payload.prepDays.length})`}>
          {payload.prepDays.length === 0 ? (
            <p className="text-sm text-text-muted">אין הערכות.</p>
          ) : (
            payload.prepDays.map((row) => (
              <div key={row.id} className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
                <p className="font-bold">{row.evaluator_name ?? "מעריך"}</p>
                <p className="mt-1 text-xs text-text-muted">
                  מקרא {row.mikra_score ?? "—"} · שיחה {row.conversation_score ?? "—"} · דינמיקה{" "}
                  {row.social_dynamics_score ?? "—"}
                </p>
                {row.conversation_feedback ? (
                  <p className="mt-1 text-xs text-text-secondary">שיחה: {row.conversation_feedback}</p>
                ) : null}
                {row.social_dynamics_feedback ? (
                  <p className="mt-1 text-xs text-text-secondary">
                    דינמיקה: {row.social_dynamics_feedback}
                  </p>
                ) : null}
                {row.general_impression ? (
                  <p className="mt-1 whitespace-pre-wrap text-xs">{row.general_impression}</p>
                ) : null}
              </div>
            ))
          )}
        </EvalGroup>

        <EvalGroup title={`סמ״ח (${payload.smach.length})`}>
          {payload.smach.length === 0 ? (
            <p className="text-sm text-text-muted">אין הערכות.</p>
          ) : (
            payload.smach.map((row) => <SmachReadOnlyCard key={row.id} evaluation={row} />)
          )}
        </EvalGroup>
      </section>

      <section className="dashboard-glass rounded-3xl p-6">
        <h2 className="text-2xl font-extrabold text-text-primary">מסמכים</h2>
        {payload.documents.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">אין מסמכים.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {payload.documents.map((document) => (
              <li
                key={document.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2"
              >
                <div>
                  <a
                    className="font-bold text-accent-primary hover:underline"
                    href={document.file_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {document.name}
                  </a>
                  <p className="text-xs text-text-muted">
                    {[document.document_type, document.uploaded_by_name, SOURCE_LABELS[document.upload_source ?? ""] ?? null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <a
                  className="text-xs font-bold text-accent-primary"
                  href={document.file_url}
                  target="_blank"
                  rel="noreferrer"
                  download
                >
                  הורדה
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="dashboard-glass rounded-3xl p-6">
        <h2 className="text-2xl font-extrabold text-text-primary">החלטה סופית</h2>
        <span
          className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${STATUS_TONES[payload.candidate.status]}`}
        >
          {STATUS_LABELS[payload.candidate.status]}
        </span>
        {payload.candidate.ramad_notes ? (
          <p className="mt-3 whitespace-pre-wrap text-sm">{payload.candidate.ramad_notes}</p>
        ) : (
          <p className="mt-2 text-sm text-text-muted">אין הערות רמ״ד.</p>
        )}
      </section>

      <section className="dashboard-glass rounded-3xl p-6">
        <h2 className="text-2xl font-extrabold text-text-primary">ציר זמן</h2>
        {payload.timeline.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">אין אירועים.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {payload.timeline.map((item) => (
              <li key={item.id} className="rounded-xl bg-surface-2 px-3 py-2">
                <p className="text-sm font-bold">
                  {TIMELINE_ICONS[item.event_type] ?? "•"} {item.title}
                </p>
                {item.description ? <p className="text-xs text-text-muted">{item.description}</p> : null}
                <p className="text-xs text-text-muted">
                  {item.actor_name ?? ""} · {new Date(item.created_at).toLocaleString("he-IL")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function EvalGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-bold text-text-secondary">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
