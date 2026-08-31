"use client";

import Link from "next/link";
import { AlertTriangle, ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { DaySelectionStage } from "@/modules/agam/components/stages/day-selection-stage";
import { DocumentsStage } from "@/modules/agam/components/stages/documents-stage";
import { PreparationDayStage } from "@/modules/agam/components/stages/preparation-day-stage";
import { SmachStage, SmachReadOnlyCard } from "@/modules/agam/components/stages/smach-stage";
import { SummaryDecision } from "@/modules/agam/components/stages/summary-decision";
import { AgamQuestionField } from "@/modules/agam/components/question-field";
import { AgamTaskRow } from "@/modules/agam/components/task-row";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { formatAgamDateTime } from "@/modules/agam/lib/date-format";
import { SOURCE_LABELS } from "@/modules/agam/lib/document-types";
import { groupQuestionsBySection } from "@/modules/agam/lib/questions";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/modules/agam/lib/ui";
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
  AgamLinkedTask,
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
  tasks: AgamLinkedTask[];
  org: AgamOrgSettings | null;
  preQuestions: AgamQuestion[];
  interviewQuestions: AgamQuestion[];
  criteria: AgamCriterion[];
  role: ModuleRole;
  currentUserId: string;
  currentUserName: string;
};

const RANK_COLORS: Record<string, { label: string; className: string }> = {
  green: { label: "ירוק", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-100" },
  orange: { label: "כתום", className: "bg-orange-500/15 text-orange-700 dark:text-orange-100" },
  red: { label: "אדום", className: "bg-rose-500/15 text-rose-700 dark:text-rose-100" },
};

const ASSESSMENT_CATEGORIES = [
  { value: "interview", label: "ראיונות" },
  { value: "day_selection", label: "יום מיונים" },
  { value: "preparation_day", label: "היום המכין" },
  { value: "smach", label: "סמ״ח" },
  { value: "other", label: "אחר" },
] as const;

const BAHAD1_CHECKLIST = [
  "אישור רפואי בתוקף",
  "אישור למבדק",
  "סכמר למי שנדרש",
  "חווד 870",
  "מסמכי זימון והתחייבויות",
  "ציוד אישי לפי הנחיות בה״ד 1",
];

const FILE_FOLDERS: Array<{ label: string; hrefStage?: AgamStageKey; detail: string }> = [
  { label: "ראיון מקדים", hrefStage: "day_selection", detail: "שאלות ראיון והמלצת מראיין" },
  { label: "יום מיונים", hrefStage: "day_selection", detail: "ראיונות והערכות יום המיונים" },
  { label: "יום מכין", hrefStage: "preparation_day", detail: "מקראות, שיחה ודינמיקה חברתית" },
  { label: "סמח", hrefStage: "smach", detail: "סף, מקצועי והחלטת סמח" },
  { label: "מסמכים", hrefStage: "documents", detail: "העלאות, חווד 870 וסכמר" },
  { label: "החלטה סופית", hrefStage: "final_decision", detail: "סטטוס והערות רמ״ד" },
  { label: "מבחן כושר", hrefStage: "smach", detail: "נתוני כושר מתוך מבחני הסף" },
  { label: "מבחני מקראות", hrefStage: "smach", detail: "ציון מקראות ישראל" },
  { label: "מבחני נשק", hrefStage: "smach", detail: "ציון בוחן נשק" },
];

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
          <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-bold ${STATUS_TONES[candidate.status]}`}>
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
        <Overview payload={payload} canRamad={canRamad} canEvaluate={canEvaluate} onSaved={() => void load()} />
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

function Overview({
  payload,
  canRamad,
  canEvaluate,
  onSaved,
}: {
  payload: FilePayload;
  canRamad: boolean;
  canEvaluate: boolean;
  onSaved: () => void;
}) {
  const data = (payload.candidate.questionnaire_data ?? {}) as Record<string, unknown>;
  const sections = groupQuestionsBySection(payload.preQuestions);
  const currentUserId = payload.currentUserId;
  const candidateId = payload.candidate.id;
  const [profileCollapsed, setProfileCollapsed] = useState(false);
  const [questionnaireCollapsed, setQuestionnaireCollapsed] = useState(false);
  const [questionnaireEditing, setQuestionnaireEditing] = useState(false);
  const [questionnaireData, setQuestionnaireData] = useState<Record<string, unknown>>(data);
  const [savingQuestionnaire, setSavingQuestionnaire] = useState(false);
  const isExceptional =
    (payload.candidate.planning_index === 1 || payload.candidate.planning_index === 2) &&
    payload.candidate.dapar != null &&
    payload.candidate.dapar < 30;
  const assessmentNotes = payload.timeline.filter(
    (item) => item.event_type === "note" && item.title.startsWith("הערכת צוות חדשה"),
  );
  const notesFor = (category: string) =>
    assessmentNotes.filter((item) => (item.stage_key ?? "other") === category);
  const interviewNotes = notesFor("interview");
  const daySelectionNotes = notesFor("day_selection");
  const prepNotes = notesFor("preparation_day");
  const smachNotes = notesFor("smach");
  const otherNotes = notesFor("other");

  const saveQuestionnaire = async () => {
    setSavingQuestionnaire(true);
    try {
      await agamFetch(`/api/agam/candidates/${candidateId}`, {
        method: "PATCH",
        body: JSON.stringify({ questionnaire_data: questionnaireData }),
      });
      toast.success("השאלון עודכן");
      setQuestionnaireEditing(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "שמירה נכשלה");
    } finally {
      setSavingQuestionnaire(false);
    }
  };

  return (
    <div className="space-y-6">
      {isExceptional ? (
        <section className="flex items-start gap-3 rounded-3xl bg-rose-500/12 p-5 text-rose-700 dark:text-rose-100">
          <AlertTriangle className="mt-0.5 shrink-0" size={22} />
          <div>
            <p className="font-extrabold">התראת חייל חריג</p>
            <p className="mt-1 text-sm">
              מדד תכנוני {payload.candidate.planning_index} ודפ״ר {payload.candidate.dapar}.
            </p>
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FILE_FOLDERS.filter((item) => item.hrefStage !== "final_decision" || canRamad).map((item) => (
          <Link
            key={item.label}
            href={
              item.hrefStage
                ? `/agam/candidates/${payload.candidate.id}?stage=${item.hrefStage}`
                : `/agam/candidates/${payload.candidate.id}`
            }
            className="dashboard-glass block rounded-3xl p-5 transition hover:-translate-y-0.5"
          >
            <p className="text-xl font-extrabold text-text-primary">{item.label}</p>
            <p className="mt-1 text-xs text-text-muted">{item.detail}</p>
          </Link>
        ))}
      </section>

      <section className={`grid gap-4 ${profileCollapsed ? "grid-cols-1" : "lg:grid-cols-[1fr_320px]"}`}>
        <CandidateProfileCard candidate={payload.candidate} canEvaluate={canEvaluate} onSaved={onSaved} collapsed={profileCollapsed} onToggleCollapse={() => setProfileCollapsed((value) => !value)} />
        <div className={`space-y-4 ${profileCollapsed ? "lg:col-start-1" : ""}`}>
          <QuickAssessmentCard candidateId={payload.candidate.id} canEvaluate={canEvaluate} onSaved={onSaved} />
          <CandidateTasksCard
            candidateId={payload.candidate.id}
            tasks={payload.tasks}
            currentUserId={payload.currentUserId}
            canEvaluate={canEvaluate}
            canAdmin={canRamad}
            onSaved={onSaved}
          />
        </div>
      </section>

      <section className="dashboard-glass rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-extrabold text-text-primary">שאלון מקדים</h2>
          <div className="flex flex-wrap items-center gap-2">
            {canEvaluate && !questionnaireCollapsed ? (
              <button
                type="button"
                className={questionnaireEditing ? primaryButtonClass : secondaryButtonClass}
                onClick={() => {
                  if (questionnaireEditing) {
                    setQuestionnaireData(data);
                    setQuestionnaireEditing(false);
                  } else {
                    setQuestionnaireData(data);
                    setQuestionnaireEditing(true);
                  }
                }}
              >
                <Pencil size={16} />
                {questionnaireEditing ? "ביטול" : "עריכה"}
              </button>
            ) : null}
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => setQuestionnaireCollapsed((value) => !value)}
            >
              {questionnaireCollapsed ? "פתח" : "כווץ"}
            </button>
          </div>
        </div>
        {!questionnaireCollapsed ? (
          <>
            {sections.length === 0 ? (
              <p className="mt-2 text-sm text-text-muted">אין שאלות מוגדרות.</p>
            ) : (
              <div className="mt-4 space-y-5">
                {sections.map(([sectionKey, section]) => (
                  <div key={sectionKey}>
                    <p className="mb-2 text-sm font-bold text-accent-primary">{section.name}</p>
                    {questionnaireEditing ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {section.items.map((question) => (
                          <AgamQuestionField
                            key={question.id}
                            question={question}
                            value={String(questionnaireData[question.field_key] ?? "")}
                            onChange={(value) =>
                              setQuestionnaireData((current) => ({ ...current, [question.field_key]: value }))
                            }
                          />
                        ))}
                      </div>
                    ) : (
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
                    )}
                  </div>
                ))}
              </div>
            )}
            {questionnaireEditing ? (
              <div className="mt-4">
                <button type="button" className={primaryButtonClass} disabled={savingQuestionnaire} onClick={() => void saveQuestionnaire()}>
                  {savingQuestionnaire ? "שומר..." : "שמירת שאלון"}
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </section>

      <section className="dashboard-glass space-y-4 rounded-3xl p-6">
        <h2 className="text-2xl font-extrabold text-text-primary">הערכות</h2>
        <EvalGroup title={`ראיונות (${payload.interviews.length + interviewNotes.length})`}>
          {payload.interviews.length === 0 ? (
            interviewNotes.length === 0 ? <p className="text-sm text-text-muted">אין ראיונות.</p> : null
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
          <AssessmentNoteList notes={interviewNotes} currentUserId={currentUserId} canRamad={canRamad} candidateId={candidateId} onSaved={onSaved} />
        </EvalGroup>

        <EvalGroup title={`יום מיונים (${payload.evaluations.length + daySelectionNotes.length})`}>
          {payload.evaluations.length === 0 ? (
            daySelectionNotes.length === 0 ? <p className="text-sm text-text-muted">אין הערכות.</p> : null
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
          <AssessmentNoteList notes={daySelectionNotes} currentUserId={currentUserId} canRamad={canRamad} candidateId={candidateId} onSaved={onSaved} />
        </EvalGroup>

        <EvalGroup title={`היום המכין (${payload.prepDays.length + prepNotes.length})`}>
          {payload.prepDays.length === 0 ? (
            prepNotes.length === 0 ? <p className="text-sm text-text-muted">אין הערכות.</p> : null
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
          <AssessmentNoteList notes={prepNotes} currentUserId={currentUserId} canRamad={canRamad} candidateId={candidateId} onSaved={onSaved} />
        </EvalGroup>

        <EvalGroup title={`סמ״ח (${payload.smach.length + smachNotes.length})`}>
          {payload.smach.length === 0 ? (
            smachNotes.length === 0 ? <p className="text-sm text-text-muted">אין הערכות.</p> : null
          ) : (
            payload.smach.map((row) => <SmachReadOnlyCard key={row.id} evaluation={row} />)
          )}
          <AssessmentNoteList notes={smachNotes} currentUserId={currentUserId} canRamad={canRamad} candidateId={candidateId} onSaved={onSaved} />
        </EvalGroup>
        {otherNotes.length > 0 ? (
          <EvalGroup title={`אחר (${otherNotes.length})`}>
            <AssessmentNoteList notes={otherNotes} currentUserId={currentUserId} canRamad={canRamad} candidateId={candidateId} onSaved={onSaved} />
          </EvalGroup>
        ) : null}
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
                  {item.actor_name ?? ""} · {formatAgamDateTime(item.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function yesNo(value: boolean | null | undefined): string {
  if (value === true) return "כן";
  if (value === false) return "לא";
  return "לא סומן";
}

function CandidateProfileCard({
  candidate,
  canEvaluate,
  onSaved,
  collapsed,
  onToggleCollapse,
}: {
  candidate: AgamCandidate;
  canEvaluate: boolean;
  onSaved: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const [command, setCommand] = useState(candidate.command ?? "");
  const [directCommanderName, setDirectCommanderName] = useState(candidate.direct_commander_name ?? "");
  const [gaps, setGaps] = useState(candidate.gaps ?? "");
  const [planningIndex, setPlanningIndex] = useState(candidate.planning_index?.toString() ?? "");
  const [dapar, setDapar] = useState(candidate.dapar?.toString() ?? "");
  const [rankColor, setRankColor] = useState(candidate.rank_color ?? "");
  const [needsSakmar, setNeedsSakmar] = useState(candidate.needs_sakmar == null ? "" : candidate.needs_sakmar ? "yes" : "no");
  const [mabdakApproval, setMabdakApproval] = useState(candidate.mabdak_approval == null ? "" : candidate.mabdak_approval ? "yes" : "no");
  const [medicalIssue, setMedicalIssue] = useState(candidate.medical_issue == null ? "" : candidate.medical_issue ? "yes" : "no");
  const [internetTest, setInternetTest] = useState(candidate.internet_test == null ? "" : candidate.internet_test ? "yes" : "no");
  const [checklist, setChecklist] = useState<Record<string, boolean>>(candidate.pre_bahad1_checklist ?? {});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCancelPopup, setShowCancelPopup] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await agamFetch(`/api/agam/candidates/${candidate.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          command: command || null,
          direct_commander_name: directCommanderName || null,
          gaps: gaps || null,
          planning_index: planningIndex ? Number(planningIndex) : null,
          dapar: dapar ? Number(dapar) : null,
          rank_color: rankColor || null,
          needs_sakmar: needsSakmar ? needsSakmar === "yes" : null,
          mabdak_approval: mabdakApproval ? mabdakApproval === "yes" : null,
          medical_issue: medicalIssue ? medicalIssue === "yes" : null,
          internet_test: internetTest ? internetTest === "yes" : null,
          pre_bahad1_checklist: checklist,
        }),
      });
      toast.success("פרטי המועמד נשמרו");
      setEditing(false);
      setShowCancelPopup(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="dashboard-glass rounded-3xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-text-primary">תיק מועמד מלא</h2>
          {!collapsed ? (
            <p className="mt-1 text-sm text-text-muted">פרטים, התניות, דירוג ו-checklist לפני בה״ד 1</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!collapsed ? (
            <>
              {rankColor ? (
                <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-bold ${RANK_COLORS[rankColor]?.className}`}>
                  {RANK_COLORS[rankColor]?.label}
                </span>
              ) : null}
              {canEvaluate ? (
                <button
                  type="button"
                  className={editing ? primaryButtonClass : secondaryButtonClass}
                  onClick={() => {
                    if (editing) {
                      setShowCancelPopup(true);
                    } else {
                      setEditing(true);
                    }
                  }}
                >
                  <Pencil size={16} />
                  {editing ? "ביטול" : "עריכה"}
                </button>
              ) : null}
            </>
          ) : null}
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={onToggleCollapse}
          >
            {collapsed ? "פתח" : "כווץ"}
          </button>
        </div>
      </div>

      {showCancelPopup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="dashboard-glass rounded-3xl p-6 max-w-sm w-full mx-4">
            <p className="text-sm font-bold text-text-primary">בטל שינויים?</p>
            <p className="mt-1 text-xs text-text-muted">השינויים לא נשמרו. האם לבטל עריכה?</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className={primaryButtonClass}
                onClick={() => {
                  setEditing(false);
                  setShowCancelPopup(false);
                }}
              >
                בטל שינויים
              </button>
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => setShowCancelPopup(false)}
              >
                המשך עריכה
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!collapsed ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-text-muted">שם</span>
              <span className="text-sm font-bold">{candidate.full_name}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-text-muted">מס. אישי</span>
              <span className="text-sm font-bold">{candidate.personal_number}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-text-muted">פיקוד</span>
              <span className="text-sm font-bold">{command || "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-text-muted">שם המפקד הישיר</span>
              <span className="text-sm font-bold">{directCommanderName || "—"}</span>
            </div>
            <div className="sm:col-span-2 flex items-center justify-between gap-2">
              <span className="text-xs text-text-muted">פערים</span>
              <span className="text-sm font-bold">{gaps || "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-text-muted">מדד תכנוני</span>
              <span className="text-sm font-bold">{planningIndex || "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-text-muted">דפ״ר</span>
              <span className="text-sm font-bold">{dapar || "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-text-muted">צבע דירוג</span>
              <span className="text-sm font-bold">{rankColor ? RANK_COLORS[rankColor]?.label ?? rankColor : "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-text-muted">צריך סכמר</span>
              <span className="text-sm font-bold">{yesNo(needsSakmar ? needsSakmar === "yes" : null)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-text-muted">אישור למבדק</span>
              <span className="text-sm font-bold">{yesNo(mabdakApproval ? mabdakApproval === "yes" : null)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-text-muted">בעיה רפואית</span>
              <span className="text-sm font-bold">{yesNo(medicalIssue ? medicalIssue === "yes" : null)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-text-muted">מבחן אינטרנטי</span>
              <span className="text-sm font-bold">{yesNo(internetTest ? internetTest === "yes" : null)}</span>
            </div>
          </div>

          {BAHAD1_CHECKLIST.length > 0 ? (
            <div className="mt-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-extrabold text-text-primary">
                <ClipboardList size={16} />
                לפני כניסה לבה״ד 1
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {BAHAD1_CHECKLIST.map((item) => (
                  <label key={item} className="flex items-center gap-2 text-sm font-bold">
                    <input
                      type="checkbox"
                      checked={Boolean(checklist[item])}
                      disabled
                    />
                    {item}
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {canEvaluate && editing ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <input className={fieldClass} placeholder="פיקוד" value={command} onChange={(event) => setCommand(event.target.value)} />
              <input
                className={fieldClass}
                placeholder="שם המפקד הישיר"
                value={directCommanderName}
                onChange={(event) => setDirectCommanderName(event.target.value)}
              />
              <textarea className={`${fieldClass} sm:col-span-2`} rows={3} placeholder="פערים" value={gaps} onChange={(event) => setGaps(event.target.value)} />
              <input type="number" className={fieldClass} placeholder="מדד תכנוני" value={planningIndex} onChange={(event) => setPlanningIndex(event.target.value)} />
              <input type="number" className={fieldClass} placeholder="דפ״ר" value={dapar} onChange={(event) => setDapar(event.target.value)} />
              <select className={fieldClass} value={rankColor} onChange={(event) => setRankColor(event.target.value)}>
                <option value="">ללא צבע דירוג</option>
                <option value="green">ירוק</option>
                <option value="orange">כתום</option>
                <option value="red">אדום</option>
              </select>
              {[
                ["needsSakmar", "צריך סכמר", needsSakmar, setNeedsSakmar],
                ["mabdakApproval", "אישור למבדק", mabdakApproval, setMabdakApproval],
                ["medicalIssue", "בעיה רפואית", medicalIssue, setMedicalIssue],
                ["internetTest", "מבחן אינטרנטי", internetTest, setInternetTest],
              ].map(([key, label, value, setter]) => (
                <select
                  key={String(key)}
                  className={fieldClass}
                  value={String(value)}
                  aria-label={String(label)}
                  onChange={(event) => (setter as (next: string) => void)(event.target.value)}
                >
                  <option value="">{String(label)} - לא סומן</option>
                  <option value="yes">{String(label)} - כן</option>
                  <option value="no">{String(label)} - לא</option>
                </select>
              ))}
              <div className="sm:col-span-2 rounded-2xl bg-surface-2 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-text-primary">
                  <ClipboardList size={16} />
                  לפני כניסה לבה״ד 1
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {BAHAD1_CHECKLIST.map((item) => (
                    <label key={item} className="flex items-center gap-2 rounded-xl bg-surface-1 px-3 py-2 text-sm font-bold">
                      <input
                        type="checkbox"
                        checked={Boolean(checklist[item])}
                        onChange={(event) => setChecklist((current) => ({ ...current, [item]: event.target.checked }))}
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </div>
              <button type="button" className={primaryButtonClass} disabled={saving} onClick={() => void save()}>
                {saving ? "שומר..." : "שמירת תיק"}
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function QuickAssessmentCard({
  candidateId,
  canEvaluate,
  onSaved,
}: {
  candidateId: string;
  canEvaluate: boolean;
  onSaved: () => void;
}) {
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("interview");
  const [saving, setSaving] = useState(false);
  if (!canEvaluate) return null;
  return (
    <section className="dashboard-glass rounded-3xl p-5">
      <div className="flex items-center gap-2">
        <Plus size={18} className="text-accent-primary" />
        <h2 className="text-lg font-extrabold text-text-primary">הערכה חדשה</h2>
      </div>
      <textarea
        className={`${fieldClass} mt-3`}
        rows={5}
        placeholder="כתיבת הערכת צוות קצרה"
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <select className={`${fieldClass} mt-3`} value={category} onChange={(event) => setCategory(event.target.value)}>
        <option value="interview">ראיונות</option>
        <option value="day_selection">יום מיונים</option>
        <option value="preparation_day">היום המכין</option>
        <option value="smach">סמ״ח</option>
        <option value="other">אחר</option>
      </select>
      <button
        type="button"
        className={`${primaryButtonClass} mt-3 w-full`}
        disabled={saving || note.trim().length < 2}
        onClick={async () => {
          setSaving(true);
          try {
            await agamFetch(`/api/agam/candidates/${candidateId}`, {
              method: "PATCH",
              body: JSON.stringify({ timeline_note: note, timeline_note_category: category }),
            });
            setNote("");
            toast.success("ההערכה נוספה");
            onSaved();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "שמירה נכשלה");
          } finally {
            setSaving(false);
          }
        }}
      >
        {saving ? "מוסיף..." : "הוספת הערכה"}
      </button>
    </section>
  );
}

function CandidateTasksCard({
  candidateId,
  tasks,
  currentUserId,
  canEvaluate,
  canAdmin,
  onSaved,
}: {
  candidateId: string;
  tasks: AgamLinkedTask[];
  currentUserId: string;
  canEvaluate: boolean;
  canAdmin: boolean;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const createTask = async () => {
    setSaving(true);
    try {
      await agamFetch("/api/agam/tasks", {
        method: "POST",
        body: JSON.stringify({ title, dueDate: dueDate || null, candidateId }),
      });
      setTitle("");
      setDueDate("");
      toast.success("המשימה נוספה גם לאפליקציית המשימות");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "יצירת משימה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="dashboard-glass rounded-3xl p-5">
      <h2 className="text-lg font-extrabold text-text-primary">משימות מועמד</h2>
      {canEvaluate ? (
        <div className="mt-3 space-y-2">
          <input className={fieldClass} placeholder="משימה חדשה" value={title} onChange={(event) => setTitle(event.target.value)} />
          <input type="date" className={`${fieldClass} text-left`} dir="ltr" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          <button type="button" className={`${primaryButtonClass} w-full`} disabled={saving || title.trim().length < 2} onClick={() => void createTask()}>
            {saving ? "יוצר..." : "הוספת משימה"}
          </button>
        </div>
      ) : null}
      <ul className="mt-4 space-y-2">
        {tasks.length === 0 ? (
          <li className="text-sm text-text-muted">אין משימות למועמד.</li>
        ) : (
          tasks.map((task) => (
            <AgamTaskRow
              key={task.id}
              task={task}
              currentUserId={currentUserId}
              canAdmin={canAdmin}
              onSaved={onSaved}
            />
          ))
        )}
      </ul>
    </section>
  );
}

function AssessmentNoteList({
  notes,
  currentUserId,
  canRamad,
  candidateId,
  onSaved,
}: {
  notes: AgamTimelineItem[];
  currentUserId: string;
  canRamad: boolean;
  candidateId: string;
  onSaved: () => void;
}) {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  const canEdit = (note: AgamTimelineItem) => canRamad || note.created_by_id === currentUserId;

  const startEdit = (note: AgamTimelineItem) => {
    setEditingNoteId(note.id);
    setEditText(note.description ?? "");
  };

  const saveEdit = async (note: AgamTimelineItem) => {
    setSaving(true);
    try {
      await agamFetch(`/api/agam/candidates/${candidateId}/timeline/${note.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          description: editText,
          category: note.stage_key ?? "other",
        }),
      });
      toast.success("ההערכה עודכנה");
      setEditingNoteId(null);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!confirm("למחוק הערכה?")) return;
    try {
      await agamFetch(`/api/agam/candidates/${candidateId}/timeline/${noteId}`, {
        method: "DELETE",
      });
      toast.success("ההערכה נמחקה");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "מחיקה נכשלה");
    }
  };

  if (notes.length === 0) return null;
  return (
    <>
      {notes.map((note) => (
        <div key={note.id} className="rounded-xl bg-surface-2 px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold">{note.actor_name ?? "צוות"}</p>
            {canEdit(note) ? (
              <div className="flex items-center gap-1">
                {editingNoteId === note.id ? (
                  <button
                    type="button"
                    className="text-xs font-bold text-accent-primary"
                    onClick={() => setEditingNoteId(null)}
                  >
                    ביטול
                  </button>
                ) : (
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                    onClick={() => startEdit(note)}
                    aria-label="ערוך הערכה"
                    title="ערוך הערכה"
                  >
                    <Pencil size={16} />
                  </button>
                )}
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-500/10"
                  onClick={() => deleteNote(note.id)}
                  aria-label="מחק הערכה"
                  title="מחק הערכה"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : null}
          </div>
          {editingNoteId === note.id ? (
            <div className="mt-2 space-y-2">
              <textarea
                className={fieldClass}
                rows={3}
                value={editText}
                onChange={(event) => setEditText(event.target.value)}
              />
              <button
                type="button"
                className={primaryButtonClass}
                disabled={saving}
                onClick={() => saveEdit(note)}
              >
                {saving ? "שומר..." : "שמירה"}
              </button>
            </div>
          ) : (
            <>
              {note.description ? <p className="mt-1 whitespace-pre-wrap text-xs text-text-muted">{note.description}</p> : null}
              <p className="mt-1 text-xs text-text-muted">{formatAgamDateTime(note.created_at)}</p>
            </>
          )}
        </div>
      ))}
    </>
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
