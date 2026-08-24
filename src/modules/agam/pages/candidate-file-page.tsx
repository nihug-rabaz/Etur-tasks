"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { DaySelectionStage } from "@/modules/agam/components/stages/day-selection-stage";
import { DocumentsStage } from "@/modules/agam/components/stages/documents-stage";
import { PreparationDayStage } from "@/modules/agam/components/stages/preparation-day-stage";
import { SmachStage } from "@/modules/agam/components/stages/smach-stage";
import { SummaryDecision } from "@/modules/agam/components/stages/summary-decision";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { AGAM_STAGES, STATUS_LABELS, STATUS_TONES } from "@/modules/agam/lib/stages";
import type {
  AgamCandidate,
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
          candidateId={candidate.id}
          interviews={payload.interviews}
          evaluations={payload.evaluations}
          questionCount={payload.preQuestions.length}
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
        {payload.preQuestions.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">אין שאלות מוגדרות.</p>
        ) : (
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {payload.preQuestions.map((question) => (
              <div key={question.id} className="rounded-xl bg-surface-2 px-3 py-2">
                <dt className="text-xs text-text-muted">{question.question_text}</dt>
                <dd className="mt-1 text-sm font-bold">{String(data[question.field_key] ?? "—")}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className="dashboard-glass rounded-3xl p-6">
        <h2 className="text-2xl font-extrabold text-text-primary">הערכות</h2>
        <div className="mt-3 grid gap-2 text-sm text-text-muted sm:grid-cols-2">
          <p>ראיונות: {payload.interviews.length}</p>
          <p>יום מיונים: {payload.evaluations.length}</p>
          <p>יום מכין: {payload.prepDays.length}</p>
          <p>סמ״ח: {payload.smach.length}</p>
        </div>
      </section>

      <section className="dashboard-glass rounded-3xl p-6">
        <h2 className="text-2xl font-extrabold text-text-primary">מסמכים</h2>
        {payload.documents.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">אין מסמכים.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {payload.documents.map((document) => (
              <li key={document.id}>
                <a className="font-bold text-accent-primary hover:underline" href={document.file_url} target="_blank" rel="noreferrer">
                  {document.name}
                </a>
                {document.document_type ? (
                  <span className="text-xs text-text-muted"> · {document.document_type}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="dashboard-glass rounded-3xl p-6">
        <h2 className="text-2xl font-extrabold text-text-primary">החלטה סופית</h2>
        <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${STATUS_TONES[payload.candidate.status]}`}>
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
