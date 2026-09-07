"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  FileText,
  FolderOpen,
  MessageSquare,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { toast } from "sonner";
import { DaySelectionStage } from "@/modules/agam/components/stages/day-selection-stage";
import { DocumentsStage } from "@/modules/agam/components/stages/documents-stage";
import { PreparationDayStage } from "@/modules/agam/components/stages/preparation-day-stage";
import { SmachStage, SmachReadOnlyCard } from "@/modules/agam/components/stages/smach-stage";
import { SummaryDecision } from "@/modules/agam/components/stages/summary-decision";
import { ChronoStageBlocks, ScreenerChronoMenu } from "@/modules/agam/components/candidate-file-chrome";
import { CreateAgamTaskDrawer } from "@/modules/agam/components/create-task-drawer";
import { AgamQuestionField } from "@/modules/agam/components/question-field";
import { AgamTaskRow } from "@/modules/agam/components/task-row";
import { Drawer } from "@/components/ui/drawer";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { formatAgamDateTime } from "@/modules/agam/lib/date-format";
import { SOURCE_LABELS } from "@/modules/agam/lib/document-types";
import { groupQuestionsBySection } from "@/modules/agam/lib/questions";
import { documentDownloadHref } from "@/modules/agam/lib/document-download";
import {
  canEvaluate as roleCanEvaluate,
  canModifyTimelineEvent,
  canRamad as roleCanRamad,
  canScreen as roleCanScreen,
} from "@/modules/agam/lib/permissions";
import { TimelineDatePicker } from "@/modules/agam/components/timeline-date-picker";
import {
  cardClass,
  dividerClass,
  dividerTopClass,
  fieldClass,
  innerCardClass,
  panelClass,
  primaryButtonClass,
  secondaryButtonClass,
  pageShellClass,
} from "@/modules/agam/lib/ui";
import { BAHAD1_CHECKLIST } from "@/modules/agam/lib/bahad1-checklist";
import {
  AGAM_STAGES,
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

const TIMELINE_ICONS: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  questionnaire: ClipboardList,
  interview: MessageSquare,
  evaluation: Award,
  document: FolderOpen,
  decision: CheckCircle2,
  stage_change: ArrowRight,
  note: FileText,
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
  green: { label: "ירוק", className: "bg-surface-2 text-text-primary" },
  orange: { label: "כתום", className: "bg-[var(--agam-orange-soft)] text-text-primary" },
  red: { label: "אדום", className: "bg-surface-2 text-text-primary" },
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
  const canEvaluate = roleCanEvaluate(role);
  const canRamad = roleCanRamad(role);
  const isScreener = roleCanScreen(role);
  const visibleStages = AGAM_STAGES.filter((item) => !item.ramadOnly || canRamad);

  if (stage === "final_decision" && !canRamad) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className={`${panelClass} p-8 text-center text-sm font-bold text-text-primary`}>
          דף זה זמין למנהל בלבד
        </div>
      </div>
    );
  }

  const activeStage = visibleStages.find((item) => item.key === stage) ?? null;

  return (
    <div className={pageShellClass}>
      <header className={`${panelClass} p-5 sm:p-6`}>
        <Link
          href={isScreener ? "/agam/cycles" : "/agam/candidates"}
          className="inline-flex items-center gap-1 text-xs font-semibold text-text-muted transition hover:text-text-primary"
        >
          <ChevronLeft size={14} className="rotate-180" />
          {isScreener ? "מחזורים" : "מועמדים"}
        </Link>

        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
              תיק מועמד{isScreener ? " · ממיין" : ""}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1
                className={`font-extrabold tracking-tight text-text-primary ${
                  isScreener ? "text-4xl sm:text-[2.6rem]" : "text-3xl sm:text-[2.1rem]"
                }`}
              >
                {candidate.full_name}
              </h1>
              {candidate.status !== "pending" ? (
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_TONES[candidate.status]}`}
                >
                  {STATUS_LABELS[candidate.status]}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-text-secondary" dir="ltr">
              {[candidate.personal_number, candidate.phone, candidate.cycle_name].filter(Boolean).join(" · ")}
            </p>
            {activeStage ? (
              <p className="mt-2 text-xs font-semibold text-text-muted">{activeStage.name}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {!isScreener ? (
              <>
                <Link href={`/agam/candidates/${candidate.id}/interview`} className={secondaryButtonClass}>
                  ראיון
                </Link>
                <Link href={`/agam/candidates/${candidate.id}/evaluation`} className={secondaryButtonClass}>
                  הערכה
                </Link>
                <Link href={`/agam/candidates/${candidate.id}?stage=documents`} className={secondaryButtonClass}>
                  מסמכים
                </Link>
              </>
            ) : null}
            {canEvaluate ? (
              <CreateAgamTaskDrawer
                candidateId={candidate.id}
                cycleId={candidate.cycle_id}
                candidateName={candidate.full_name}
                cycleName={candidate.cycle_name}
                triggerClassName={secondaryButtonClass}
                triggerLabel="משימה"
              />
            ) : null}
          </div>
        </div>

        <nav className={`mt-5 flex gap-1 overflow-x-auto pt-4 ${dividerTopClass}`}>
          <StageTab href={`/agam/candidates/${candidate.id}`} active={!stage} label="סקירה" />
          {visibleStages.map((item) => (
            <StageTab
              key={item.key}
              href={`/agam/candidates/${candidate.id}?stage=${item.key}`}
              active={stage === item.key}
              label={item.name}
            />
          ))}
        </nav>
      </header>

      {!stage ? (
        <Overview
          payload={payload}
          role={role}
          canRamad={canRamad}
          canEvaluate={canEvaluate}
          onSaved={() => void load()}
        />
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
          prepDays={payload.prepDays}
          smach={payload.smach}
          documents={payload.documents}
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

function StageTab({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`relative shrink-0 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
        active ? "text-text-primary" : "text-text-muted hover:text-text-primary hover:bg-surface-2/80"
      }`}
    >
      {label}
      {active ? (
        <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-text-primary" />
      ) : null}
    </Link>
  );
}

function Overview({
  payload,
  role,
  canRamad,
  canEvaluate,
  onSaved,
}: {
  payload: FilePayload;
  role: ModuleRole | null;
  canRamad: boolean;
  canEvaluate: boolean;
  onSaved: () => void;
}) {
  const data = (payload.candidate.questionnaire_data ?? {}) as Record<string, unknown>;
  const sections = groupQuestionsBySection(payload.preQuestions);
  const currentUserId = payload.currentUserId;
  const candidateId = payload.candidate.id;
  const isScreener = roleCanScreen(role);
  const [profileCollapsed, setProfileCollapsed] = useState(false);
  const [questionnaireCollapsed, setQuestionnaireCollapsed] = useState(false);
  const [questionnaireEditing, setQuestionnaireEditing] = useState(false);
  const [questionnaireData, setQuestionnaireData] = useState<Record<string, unknown>>(data);
  const [savingQuestionnaire, setSavingQuestionnaire] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);

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

  const stats = useMemo(
    () => [
      { label: "ראיונות", value: payload.interviews.length + interviewNotes.length },
      { label: "הערכות יום", value: payload.evaluations.length + daySelectionNotes.length },
      { label: "מסמכים", value: payload.documents.length },
      { label: "משימות", value: payload.tasks.length },
    ],
    [
      payload.interviews.length,
      payload.evaluations.length,
      payload.documents.length,
      payload.tasks.length,
      interviewNotes.length,
      daySelectionNotes.length,
    ],
  );

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
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* Chronological column — first in DOM = right in RTL */}
      <aside className="flex w-full shrink-0 flex-col gap-4 lg:sticky lg:top-20 lg:w-[17rem] lg:self-start xl:w-[18.5rem]">
        <ChronoStageBlocks
          candidateId={candidateId}
          interviews={payload.interviews}
          evaluations={payload.evaluations}
          prepDays={payload.prepDays}
          smach={payload.smach}
        />
        {isScreener ? (
          <ScreenerChronoMenu candidateId={candidateId} interviews={payload.interviews} />
        ) : null}
        {canEvaluate ? (
          <div className="flex flex-wrap gap-2">
            <CreateAgamTaskDrawer
              candidateId={candidateId}
              cycleId={payload.candidate.cycle_id}
              candidateName={payload.candidate.full_name}
              cycleName={payload.candidate.cycle_name}
              triggerClassName={secondaryButtonClass}
              triggerLabel="משימה"
            />
            <button type="button" className={secondaryButtonClass} onClick={() => setTasksOpen(true)}>
              משימות ({payload.tasks.length})
            </button>
            <button type="button" className={secondaryButtonClass} onClick={() => setActivityOpen(true)}>
              פעילות
            </button>
          </div>
        ) : (
          <button type="button" className={secondaryButtonClass} onClick={() => setActivityOpen(true)}>
            פעילות בתיק
          </button>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        {isExceptional ? (
          <section className="flex items-start gap-3 rounded-3xl bg-rose-500/[0.08] p-5 text-text-primary">
            <AlertTriangle className="mt-0.5 shrink-0 text-rose-600" size={18} />
            <div>
              <p className="text-sm font-extrabold">התראת חייל חריג</p>
              <p className="mt-1 text-sm text-text-secondary">
                מדד תכנוני {payload.candidate.planning_index} ודפ״ר {payload.candidate.dapar}.
              </p>
            </div>
          </section>
        ) : null}

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className={`${panelClass} px-4 py-4`}>
              <p className="text-[11px] font-semibold text-text-muted">{stat.label}</p>
              <p className="mt-2 text-2xl font-extrabold tracking-tight text-text-primary">{stat.value}</p>
            </div>
          ))}
        </section>

        <CandidateProfileCard
          candidate={payload.candidate}
          canEvaluate={canEvaluate}
          onSaved={onSaved}
          collapsed={profileCollapsed}
          onToggleCollapse={() => setProfileCollapsed((value) => !value)}
        />

        <section className={`${panelClass} border-2 border-text-primary/15 p-6`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-text-primary">החלטה סופית</h2>
              <p className="mt-0.5 text-xs text-text-muted">סטטוס והערות מנהל</p>
            </div>
            {payload.candidate.status !== "pending" ? (
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_TONES[payload.candidate.status]}`}
              >
                {STATUS_LABELS[payload.candidate.status]}
              </span>
            ) : (
              <span className="text-xs font-bold text-text-muted">טרם הוחלט</span>
            )}
          </div>
          {canRamad && payload.candidate.ramad_notes ? (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
              {payload.candidate.ramad_notes}
            </p>
          ) : (
            <p className="mt-3 text-sm text-text-muted">אין הערות מנהל.</p>
          )}
          {canRamad ? (
            <Link
              href={`/agam/candidates/${payload.candidate.id}?stage=final_decision`}
              className={`${primaryButtonClass} mt-4`}
            >
              פתיחת החלטה / ייצוא PDF
            </Link>
          ) : null}
        </section>

        <section className={`${panelClass} p-6`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-text-primary">פרטי המועמד</h2>
              <p className="mt-0.5 text-xs text-text-muted">שאלון ופרטים אישיים</p>
            </div>
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
                  <Pencil size={14} />
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
                <p className="mt-3 text-sm text-text-muted">אין שאלות מוגדרות.</p>
              ) : (
                <div className="mt-5 space-y-6">
                  {sections.map(([sectionKey, section]) => (
                    <div key={sectionKey}>
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                        {section.name}
                      </p>
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
                        <dl className="grid gap-px overflow-hidden rounded-2xl bg-black/[0.04] sm:grid-cols-2 dark:bg-white/[0.06]">
                          {section.items.map((question) => (
                            <div key={question.id} className="bg-surface-1 px-4 py-3">
                              <dt className="text-[11px] font-medium text-text-muted">{question.question_text}</dt>
                              <dd className="mt-1 text-sm font-semibold text-text-primary">
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
                  <button
                    type="button"
                    className={primaryButtonClass}
                    disabled={savingQuestionnaire}
                    onClick={() => void saveQuestionnaire()}
                  >
                    {savingQuestionnaire ? "שומר..." : "שמירת שאלון"}
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </section>

        <section className={`${panelClass} space-y-6 p-6`}>
          <div>
            <h2 className="text-sm font-bold text-text-primary">הערכות</h2>
            <p className="mt-0.5 text-xs text-text-muted">סיכום לפי שלב</p>
          </div>

          <EvalGroup title={`ראיונות (${payload.interviews.length + interviewNotes.length})`}>
            {payload.interviews.length === 0 ? (
              interviewNotes.length === 0 ? <p className="text-sm text-text-muted">אין ראיונות.</p> : null
            ) : (
              payload.interviews.map((interview) => (
                <div key={interview.id} className="rounded-2xl bg-surface-2/70 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-text-primary">{interview.evaluator_name ?? "מעריך"}</p>
                    {interview.recommendation ? (
                      <span className="text-xs font-semibold text-text-secondary">{interview.recommendation}</span>
                    ) : null}
                  </div>
                  {interview.evaluator_assessment ? (
                    <p className="mt-1 line-clamp-3 text-xs text-text-muted">{interview.evaluator_assessment}</p>
                  ) : null}
                </div>
              ))
            )}
            <AssessmentNoteList
              notes={interviewNotes}
              currentUserId={currentUserId}
              role={payload.role}
              candidateId={candidateId}
              onSaved={onSaved}
            />
          </EvalGroup>

          <EvalGroup title={`יום מיונים (${payload.evaluations.length + daySelectionNotes.length})`}>
            {payload.evaluations.length === 0 ? (
              daySelectionNotes.length === 0 ? <p className="text-sm text-text-muted">אין הערכות.</p> : null
            ) : (
              payload.evaluations.map((evaluation) => (
                <div
                  key={evaluation.id}
                  className="flex items-center justify-between rounded-2xl bg-surface-2/70 px-4 py-3"
                >
                  <p className="text-sm font-bold text-text-primary">{evaluation.evaluator_name ?? "מעריך"}</p>
                  <p className="text-base font-extrabold text-text-primary">
                    {evaluation.final_score ?? evaluation.weighted_score ?? "—"}
                  </p>
                </div>
              ))
            )}
            <AssessmentNoteList
              notes={daySelectionNotes}
              currentUserId={currentUserId}
              role={payload.role}
              candidateId={candidateId}
              onSaved={onSaved}
            />
          </EvalGroup>

          <EvalGroup title={`היום המכין (${payload.prepDays.length + prepNotes.length})`}>
            {payload.prepDays.length === 0 ? (
              prepNotes.length === 0 ? <p className="text-sm text-text-muted">אין הערכות.</p> : null
            ) : (
              payload.prepDays.map((row) => (
                <div key={row.id} className="rounded-2xl bg-surface-2/70 px-4 py-3 text-sm">
                  <p className="font-bold text-text-primary">{row.evaluator_name ?? "מעריך"}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    מקרא {row.mikra_score ?? "—"} · שיחה {row.conversation_score ?? "—"} · דינמיקה{" "}
                    {row.social_dynamics_score ?? "—"}
                  </p>
                  {row.conversation_feedback ? (
                    <p className="mt-1 text-xs text-text-secondary">שיחה: {row.conversation_feedback}</p>
                  ) : null}
                  {row.social_dynamics_feedback ? (
                    <p className="mt-1 text-xs text-text-secondary">דינמיקה: {row.social_dynamics_feedback}</p>
                  ) : null}
                  {row.general_impression ? (
                    <p className="mt-1 whitespace-pre-wrap text-xs text-text-primary">{row.general_impression}</p>
                  ) : null}
                </div>
              ))
            )}
            <AssessmentNoteList
              notes={prepNotes}
              currentUserId={currentUserId}
              role={payload.role}
              candidateId={candidateId}
              onSaved={onSaved}
            />
          </EvalGroup>

          <EvalGroup title={`סמ״ח (${payload.smach.length + smachNotes.length})`}>
            {payload.smach.length === 0 ? (
              smachNotes.length === 0 ? <p className="text-sm text-text-muted">אין הערכות.</p> : null
            ) : (
              payload.smach.map((row) => <SmachReadOnlyCard key={row.id} evaluation={row} />)
            )}
            <AssessmentNoteList
              notes={smachNotes}
              currentUserId={currentUserId}
              role={payload.role}
              candidateId={candidateId}
              onSaved={onSaved}
            />
          </EvalGroup>

          {otherNotes.length > 0 ? (
            <EvalGroup title={`אחר (${otherNotes.length})`}>
              <AssessmentNoteList
                notes={otherNotes}
                currentUserId={currentUserId}
                role={payload.role}
                candidateId={candidateId}
                onSaved={onSaved}
              />
            </EvalGroup>
          ) : null}
        </section>

        <section className={`${panelClass} p-6`}>
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-text-primary">מסמכים</h2>
            <Link
              href={`/agam/candidates/${payload.candidate.id}?stage=documents`}
              className="text-xs font-semibold text-text-muted transition hover:text-text-primary"
            >
              ניהול
            </Link>
          </div>
          {payload.documents.length === 0 ? (
            <p className="text-sm text-text-muted">אין מסמכים.</p>
          ) : (
            <ul>
              {payload.documents.map((document, index) => (
                <li key={document.id} className={index === 0 ? undefined : dividerClass}>
                  <div className="flex flex-wrap items-center justify-between gap-2 py-3.5">
                    <div className="min-w-0">
                      <a
                        className="text-sm font-bold text-text-primary hover:underline"
                        href={documentDownloadHref(document.id)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {document.name}
                      </a>
                      <p className="mt-0.5 text-xs text-text-muted">
                        {[
                          document.document_type,
                          document.uploaded_by_name,
                          SOURCE_LABELS[document.upload_source ?? ""] ?? null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <a
                      className="text-xs font-bold text-text-muted transition hover:text-text-primary"
                      href={documentDownloadHref(document.id)}
                      target="_blank"
                      rel="noreferrer"
                      download
                    >
                      הורדה
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Drawer open={activityOpen} onClose={() => setActivityOpen(false)} title="פעילות בתיק">
        <CandidateActivityTimeline timeline={payload.timeline} />
      </Drawer>

      <Drawer open={tasksOpen} onClose={() => setTasksOpen(false)} title="משימות מועמד">
        <CandidateTasksCard
          candidateId={payload.candidate.id}
          tasks={payload.tasks}
          currentUserId={payload.currentUserId}
          canEvaluate={canEvaluate}
          canAdmin={canRamad}
          onSaved={onSaved}
        />
      </Drawer>
    </div>
  );
}

function CandidateActivityTimeline({ timeline }: { timeline: AgamTimelineItem[] }) {
  const sorted = useMemo(
    () =>
      [...timeline].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [timeline],
  );

  return (
    <section className="flex min-h-[12rem] flex-col">
      {sorted.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">אין אירועים עדיין</p>
      ) : (
        <div className="ui-card overflow-hidden rounded-2xl bg-surface-2/60">
          <div className="agam-timeline-vertical min-h-0 max-h-[28rem] overflow-y-auto p-4 pe-2">
            <div className="agam-timeline-vertical__rail" aria-hidden />
            {sorted.slice(0, 24).map((item) => {
              const Icon = TIMELINE_ICONS[item.event_type] ?? FileText;
              return (
                <div key={item.id} className="agam-timeline-vertical__item">
                  <span className="agam-timeline-vertical__node">
                    <Icon size={13} />
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="truncate text-sm font-extrabold text-text-primary">{item.title}</p>
                    {item.description ? (
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-text-muted">
                        {item.description}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[10px] font-semibold text-text-muted">
                      {[item.actor_name, formatAgamDateTime(item.created_at)].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function yesNo(value: boolean | null | undefined): string {
  if (value === true) return "כן";
  if (value === false) return "לא";
  return "לא סומן";
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-2/60 px-3.5 py-3">
      <p className="text-[11px] font-medium text-text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-text-primary">{value}</p>
    </div>
  );
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
  const [directCommanderRole, setDirectCommanderRole] = useState(candidate.direct_commander_role ?? "");
  const [gaps, setGaps] = useState(candidate.gaps ?? "");
  const [planningIndex, setPlanningIndex] = useState(candidate.planning_index?.toString() ?? "");
  const [dapar, setDapar] = useState(candidate.dapar?.toString() ?? "");
  const [rankColor, setRankColor] = useState(candidate.rank_color ?? "");
  const [needsSakmar, setNeedsSakmar] = useState(
    candidate.needs_sakmar == null ? "" : candidate.needs_sakmar ? "yes" : "no",
  );
  const [mabdakApproval, setMabdakApproval] = useState(
    candidate.mabdak_approval == null ? "" : candidate.mabdak_approval ? "yes" : "no",
  );
  const [medicalIssue, setMedicalIssue] = useState(
    candidate.medical_issue == null ? "" : candidate.medical_issue ? "yes" : "no",
  );
  const [checklist, setChecklist] = useState<Record<string, boolean>>(candidate.pre_bahad1_checklist ?? {});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCancelPopup, setShowCancelPopup] = useState(false);

  const resetFromCandidate = () => {
    setCommand(candidate.command ?? "");
    setDirectCommanderName(candidate.direct_commander_name ?? "");
    setDirectCommanderRole(candidate.direct_commander_role ?? "");
    setGaps(candidate.gaps ?? "");
    setPlanningIndex(candidate.planning_index?.toString() ?? "");
    setDapar(candidate.dapar?.toString() ?? "");
    setRankColor(candidate.rank_color ?? "");
    setNeedsSakmar(candidate.needs_sakmar == null ? "" : candidate.needs_sakmar ? "yes" : "no");
    setMabdakApproval(candidate.mabdak_approval == null ? "" : candidate.mabdak_approval ? "yes" : "no");
    setMedicalIssue(candidate.medical_issue == null ? "" : candidate.medical_issue ? "yes" : "no");
    setChecklist(candidate.pre_bahad1_checklist ?? {});
  };

  useEffect(() => {
    if (!editing) resetFromCandidate();
  }, [candidate.id, candidate.updated_at, editing]);

  const save = async () => {
    setSaving(true);
    try {
      await agamFetch(`/api/agam/candidates/${candidate.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          command: command || null,
          direct_commander_name: directCommanderName || null,
          direct_commander_role: directCommanderRole || null,
          gaps: gaps || null,
          planning_index: planningIndex ? Number(planningIndex) : null,
          dapar: dapar ? Number(dapar) : null,
          rank_color: rankColor || null,
          needs_sakmar: needsSakmar ? needsSakmar === "yes" : null,
          mabdak_approval: mabdakApproval ? mabdakApproval === "yes" : null,
          medical_issue: medicalIssue ? medicalIssue === "yes" : null,
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

  const checklistDone = BAHAD1_CHECKLIST.filter((item) => checklist[item]).length;

  return (
    <section className={`${panelClass} p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-text-primary">פרטי מועמד</h2>
          {!collapsed ? (
            <p className="mt-0.5 text-xs text-text-muted">פיקוד, דירוג ו־checklist לבה״ד 1</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!collapsed ? (
            <>
              {rankColor ? (
                <span
                  className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-bold ${RANK_COLORS[rankColor]?.className}`}
                >
                  {RANK_COLORS[rankColor]?.label}
                </span>
              ) : null}
              {canEvaluate ? (
                <button
                  type="button"
                  className={editing ? primaryButtonClass : secondaryButtonClass}
                  onClick={() => {
                    if (editing) setShowCancelPopup(true);
                    else setEditing(true);
                  }}
                >
                  <Pencil size={15} />
                  {editing ? "ביטול" : "עריכה"}
                </button>
              ) : null}
            </>
          ) : null}
          <button type="button" className={secondaryButtonClass} onClick={onToggleCollapse}>
            {collapsed ? "פתח" : "כווץ"}
          </button>
        </div>
      </div>

      {showCancelPopup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]">
          <div className="ui-modal w-full max-w-sm rounded-3xl bg-surface-1 p-6">
            <p className="text-base font-extrabold text-text-primary">בטל שינויים?</p>
            <p className="mt-1.5 text-sm text-text-muted">השינויים לא נשמרו. האם לבטל עריכה?</p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className={primaryButtonClass}
                onClick={() => {
                  resetFromCandidate();
                  setEditing(false);
                  setShowCancelPopup(false);
                }}
              >
                בטל שינויים
              </button>
              <button type="button" className={secondaryButtonClass} onClick={() => setShowCancelPopup(false)}>
                המשך עריכה
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!collapsed ? (
        <>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <ProfileField label="שם" value={candidate.full_name} />
            <ProfileField label="מס׳ אישי" value={candidate.personal_number} />
            <ProfileField label="פיקוד" value={command || "—"} />
            <ProfileField label="מפקד ישיר" value={directCommanderName || "—"} />
            <ProfileField label="תפקיד מפקד ישיר" value={directCommanderRole || "—"} />
            <ProfileField label="מדד תכנוני" value={planningIndex || "—"} />
            <ProfileField label="דפ״ר" value={dapar || "—"} />
            <ProfileField
              label="צבע דירוג"
              value={rankColor ? RANK_COLORS[rankColor]?.label ?? rankColor : "—"}
            />
            <ProfileField label="צריך סכמר" value={yesNo(needsSakmar ? needsSakmar === "yes" : null)} />
            <ProfileField
              label="אישור למבדק"
              value={yesNo(mabdakApproval ? mabdakApproval === "yes" : null)}
            />
            <ProfileField label="בעיה רפואית" value={yesNo(medicalIssue ? medicalIssue === "yes" : null)} />
            <div className={`${innerCardClass} sm:col-span-2 lg:col-span-3`}>
              <p className="text-[11px] font-semibold text-text-muted">פערים</p>
              <p className="mt-1 whitespace-pre-wrap text-sm font-bold text-text-primary">{gaps || "—"}</p>
            </div>
          </div>

          <div className={`mt-5 ${cardClass}`}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-extrabold text-text-primary">
                <ClipboardList size={16} />
                הכנות לבה״ד 1
              </div>
              <span className="text-[11px] font-bold text-text-muted">
                {checklistDone}/{BAHAD1_CHECKLIST.length}
              </span>
            </div>
            <p className="text-xs text-text-muted">ניהול מלא של הצ׳קליסט במסך המחזור.</p>
            {candidate.cycle_id ? (
              <Link
                href={`/agam/cycles/${candidate.cycle_id}/bahad1`}
                className={`${secondaryButtonClass} mt-3`}
              >
                פתיחת הכנות לבה״ד 1
              </Link>
            ) : (
              <p className="mt-2 text-xs text-text-muted">שייכו את המועמד למחזור כדי לנהל את הצ׳קליסט.</p>
            )}
          </div>

          {canEvaluate && editing ? (
            <div className={`mt-5 grid gap-3 sm:grid-cols-2 ${dividerTopClass} pt-5`}>
              <input
                className={fieldClass}
                placeholder="פיקוד"
                value={command}
                onChange={(event) => setCommand(event.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="שם המפקד הישיר"
                value={directCommanderName}
                onChange={(event) => setDirectCommanderName(event.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="תפקיד מפקד ישיר"
                value={directCommanderRole}
                onChange={(event) => setDirectCommanderRole(event.target.value)}
              />
              <textarea
                className={`${fieldClass} sm:col-span-2`}
                rows={3}
                placeholder="פערים"
                value={gaps}
                onChange={(event) => setGaps(event.target.value)}
              />
              <input
                type="number"
                className={fieldClass}
                placeholder="מדד תכנוני"
                value={planningIndex}
                onChange={(event) => setPlanningIndex(event.target.value)}
              />
              <input
                type="number"
                className={fieldClass}
                placeholder="דפ״ר"
                value={dapar}
                onChange={(event) => setDapar(event.target.value)}
              />
              <select className={fieldClass} value={rankColor} onChange={(event) => setRankColor(event.target.value)}>
                <option value="">ללא צבע דירוג</option>
                <option value="green">ירוק</option>
                <option value="orange">כתום</option>
                <option value="red">אדום</option>
              </select>
              {(
                [
                  ["needsSakmar", "צריך סכמר", needsSakmar, setNeedsSakmar],
                  ["mabdakApproval", "אישור למבדק", mabdakApproval, setMabdakApproval],
                  ["medicalIssue", "בעיה רפואית", medicalIssue, setMedicalIssue],
                ] as const
              ).map(([key, label, value, setter]) => (
                <select
                  key={key}
                  className={fieldClass}
                  value={value}
                  aria-label={label}
                  onChange={(event) => setter(event.target.value)}
                >
                  <option value="">{label} - לא סומן</option>
                  <option value="yes">{label} - כן</option>
                  <option value="no">{label} - לא</option>
                </select>
              ))}
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
    <section className="space-y-4">
      {canEvaluate ? (
        <div className="ui-card space-y-3 rounded-2xl bg-surface-2/60 p-4">
          <input
            className={fieldClass}
            placeholder="משימה חדשה"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <TimelineDatePicker value={dueDate} onChange={setDueDate} label="תאריך יעד" />
          <button
            type="button"
            className={`${primaryButtonClass} w-full`}
            disabled={saving || title.trim().length < 2}
            onClick={() => void createTask()}
          >
            {saving ? "יוצר..." : "הוספת משימה"}
          </button>
        </div>
      ) : null}
      <ul className="ui-card overflow-hidden rounded-2xl bg-surface-2/60">
        {tasks.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-text-muted">אין משימות למועמד.</li>
        ) : (
          tasks.map((task) => (
            <li key={task.id} className="ui-list-row px-3 py-2">
              <AgamTaskRow
                task={task}
                currentUserId={currentUserId}
                canAdmin={canAdmin}
                onSaved={onSaved}
              />
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

function AssessmentNoteList({
  notes,
  currentUserId,
  role,
  candidateId,
  onSaved,
}: {
  notes: AgamTimelineItem[];
  currentUserId: string;
  role: ModuleRole;
  candidateId: string;
  onSaved: () => void;
}) {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  const canEdit = (note: AgamTimelineItem) => canModifyTimelineEvent(role, note.created_by_id, currentUserId);

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
        <div key={note.id} className={innerCardClass}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-text-primary">{note.actor_name ?? "צוות"}</p>
            {canEdit(note) ? (
              <div className="flex items-center gap-1">
                {editingNoteId === note.id ? (
                  <button
                    type="button"
                    className="text-xs font-bold text-text-primary"
                    onClick={() => setEditingNoteId(null)}
                  >
                    ביטול
                  </button>
                ) : (
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-text-primary hover:bg-surface-1"
                    onClick={() => startEdit(note)}
                    aria-label="ערוך הערכה"
                    title="ערוך הערכה"
                  >
                    <Pencil size={15} />
                  </button>
                )}
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-500/10"
                  onClick={() => void deleteNote(note.id)}
                  aria-label="מחק הערכה"
                  title="מחק הערכה"
                >
                  <Trash2 size={15} />
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
              <button type="button" className={primaryButtonClass} disabled={saving} onClick={() => void saveEdit(note)}>
                {saving ? "שומר..." : "שמירה"}
              </button>
            </div>
          ) : (
            <>
              {note.description ? (
                <p className="mt-1 whitespace-pre-wrap text-xs text-text-muted">{note.description}</p>
              ) : null}
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
      <h3 className="mb-2 text-xs font-bold text-text-muted">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
