"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  ClipboardCheck,
  X,
  Check,
  ChevronDown,
  ChevronLeft,
  Copy,
  FileText,
  FolderOpen,
  Gauge,
  HeartPulse,
  MessageSquare,
  Pencil,
  Shield,
  ShieldCheck,
  Trash2,
  Trophy,
  UserRound,
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { toast } from "sonner";
import { DaySelectionStage } from "@/modules/agam/components/stages/day-selection-stage";
import { CandidateDocumentsCenter } from "@/modules/agam/components/candidate-documents-center";
import { PreparationDayStage } from "@/modules/agam/components/stages/preparation-day-stage";
import { SmachStage, SmachReadOnlyCard } from "@/modules/agam/components/stages/smach-stage";
import { SummaryDecision } from "@/modules/agam/components/stages/summary-decision";
import { CreateAgamTaskDrawer } from "@/modules/agam/components/create-task-drawer";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { formatAgamDate, formatAgamDateTime, toDateInputValue } from "@/modules/agam/lib/date-format";
import {
  canEvaluate as roleCanEvaluate,
  canModifyTimelineEvent,
  canRamad as roleCanRamad,
  canScreen as roleCanScreen,
} from "@/modules/agam/lib/permissions";
import { CandidateExamsCard } from "@/modules/agam/components/test-results-cards";
import { isSportsResultsDocument } from "@/modules/agam/lib/document-types";
import {
  CaseRow,
  CaseRows,
  CaseSectionHead,
  HeroAction,
  caseCardClass,
  type CaseTone,
} from "@/modules/agam/components/case-file-kit";
import {
  fieldClass,
  innerCardClass,
  panelClass,
  primaryButtonClass,
  secondaryButtonClass,
  pageShellClass,
} from "@/modules/agam/lib/ui";
import { BAHAD1_CHECKLIST } from "@/modules/agam/lib/bahad1-checklist";
import { candidateGaps } from "@/modules/agam/lib/gaps";
import { groupQuestionsBySection, isQuestionVisible, parseQuestionOptions } from "@/modules/agam/lib/questions";
import {
  AGAM_STAGES,
  PROFESSIONAL_CRITERIA,
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

const RANK_DOTS: Record<string, string> = {
  green: "bg-emerald-500",
  orange: "bg-[var(--agam-orange,#f97316)]",
  red: "bg-rose-500",
};

export function AgamCandidateFilePage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id;
  const requestedStage = (searchParams.get("stage") as AgamStageKey | null) ?? null;
  const documentsRequested = requestedStage === "documents";
  const stage = documentsRequested ? null : requestedStage;
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

  return (
    <div className={pageShellClass}>
      <CaseHero payload={payload} isScreener={isScreener} canEvaluate={canEvaluate} />

      {stage ? (
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/agam/candidates/${candidate.id}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-1 px-3.5 py-2 text-[13px] font-bold text-text-secondary shadow-[0_0_0_1px_rgba(22,24,29,0.06)] transition hover:text-text-primary"
          >
            <ArrowRight size={14} />
            חזרה לתיק
          </Link>
          <span className="text-[15px] font-extrabold text-text-primary">
            {visibleStages.find((item) => item.key === stage)?.name}
          </span>
        </div>
      ) : null}

      {!stage ? (
        <Overview
          payload={payload}
          role={role}
          canRamad={canRamad}
          canEvaluate={canEvaluate}
          onSaved={() => void load()}
          initialDocumentsOpen={documentsRequested}
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

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]).join("") || "?";
}

const GAP_HINTS: Record<string, string> = {
  "הקצאת קבע": "תאריך השחרור פחות משלושה חודשים מהקליטה לבה״ד 1",
  "נדרש רח״ט תומכ״א": "מדד תכנוני 1",
  "נדרש באישור ראש עתכא״ס": "מדד תכנוני 2",
};

function HeroGaps({ gaps }: { gaps: string[] }) {
  if (gaps.length === 0) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
        <Check size={13} />
        ללא פערים
      </span>
    );
  }
  return (
    <ul className="flex flex-wrap items-center gap-1.5" aria-label="פערים">
      {gaps.map((gap) => (
        <li
          key={gap}
          title={GAP_HINTS[gap]}
          className="inline-flex shrink-0 cursor-help items-center gap-1.5 rounded-full bg-amber-500/12 px-3 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-200"
        >
          <AlertTriangle size={13} className="shrink-0" />
          {gap}
        </li>
      ))}
    </ul>
  );
}

function CaseHero({
  payload,
  isScreener,
  canEvaluate,
}: {
  payload: FilePayload;
  isScreener: boolean;
  canEvaluate: boolean;
}) {
  const { candidate } = payload;
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from");
  const [fromCycleId, setFromCycleId] = useState<string | null>(fromParam);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const key = `agam:candidate-from:${candidate.id}`;
    if (fromParam) {
      sessionStorage.setItem(key, fromParam);
      setFromCycleId(fromParam);
    } else {
      setFromCycleId(sessionStorage.getItem(key));
    }
  }, [candidate.id, fromParam]);

  const backCycleId = fromCycleId ?? candidate.cycle_id;
  const backHref = backCycleId
    ? `/agam?cycle=${backCycleId}`
    : isScreener
      ? "/agam/cycles"
      : "/agam/candidates";
  const backLabel = backCycleId
    ? backCycleId === candidate.cycle_id && candidate.cycle_name
      ? `מחזור ${candidate.cycle_name}`
      : "חזרה למחזור"
    : isScreener
      ? "מחזורים"
      : "מועמדים";

  const gaps = candidateGaps(candidate);

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(candidate.personal_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error("ההעתקה נכשלה");
    }
  };


  return (
    <header className="relative pt-12">
      <Link
        href={backHref}
        className="absolute start-0 top-0 inline-flex h-9 items-center gap-1.5 rounded-full bg-surface-1 px-3.5 text-xs font-bold text-text-secondary shadow-[0_1px_3px_rgba(22,24,29,0.12)] transition hover:text-text-primary"
      >
        <ArrowRight size={15} />
        {backLabel}
      </Link>

      <section className={`${caseCardClass} px-5 py-4 sm:px-6`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent-primary/12 text-lg font-extrabold text-accent-primary">
              {initialsOf(candidate.full_name)}
            </div>
            <h1 className="truncate text-[1.6rem] font-extrabold leading-tight tracking-tight text-text-primary">
              {candidate.full_name}
            </h1>
            <button
              type="button"
              onClick={() => void copyNumber()}
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-surface-2 px-4 py-2 text-lg font-extrabold text-text-primary transition hover:bg-accent-primary/10 hover:text-accent-primary"
              title="העתקת מספר אישי"
            >
              <span dir="ltr" className="tabular-nums tracking-wide">
                {candidate.personal_number}
              </span>
              {copied ? <Check size={15} /> : <Copy size={15} className="text-text-muted" />}
            </button>
            <HeroGaps gaps={gaps} />
          </div>

          <div className="flex shrink-0 items-center gap-4">
          {candidate.cycle_id && candidate.cycle_rank != null && candidate.cycle_rank_total ? (
            <Link
              href={`/agam/cycles/${candidate.cycle_id}/ranking`}
              title="מעבר לדירוג המחזור"
              className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-text-secondary transition hover:text-text-primary"
            >
              <Trophy size={14} className="text-text-muted" />
              <span>
                ממוקם במקום{" "}
                <span className="text-base font-extrabold tabular-nums text-text-primary">{candidate.cycle_rank}</span>{" "}
                מתוך <span className="font-bold tabular-nums">{candidate.cycle_rank_total}</span>
              </span>
            </Link>
          ) : null}
          <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-2 p-1">
            {!isScreener ? (
              <>
                <HeroAction icon={MessageSquare} label="ראיון" href={`/agam/candidates/${candidate.id}/interview`} />
                <HeroAction icon={Award} label="הערכת יום מיונים" href={`/agam/candidates/${candidate.id}/evaluation`} />
              </>
            ) : null}
            {canEvaluate ? (
              <CreateAgamTaskDrawer
                candidateId={candidate.id}
                cycleId={candidate.cycle_id}
                candidateName={candidate.full_name}
                cycleName={candidate.cycle_name}
                triggerClassName="inline-flex h-10 items-center gap-1 rounded-full bg-text-primary px-3.5 text-xs font-bold text-white transition hover:-translate-y-px dark:bg-white dark:text-black"
                triggerLabel="משימה"
              />
            ) : null}
          </div>
          </div>
        </div>
      </section>
    </header>
  );
}

function prepFeedback(row: {
  conversation_feedback: string | null;
  social_dynamics_feedback: string | null;
  general_impression: string | null;
}): Array<{ label: string; text: string }> {
  return [
    { label: "העברת שיחה", text: row.conversation_feedback },
    { label: "דינמיקות חברתיות", text: row.social_dynamics_feedback },
    { label: "התרשמות כללית", text: row.general_impression },
  ].flatMap((item) => (item.text?.trim() ? [{ label: item.label, text: item.text.trim() }] : []));
}

function averageOf(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((sum, value) => sum + value, 0) / nums.length) * 10) / 10;
}

function VerdictPill({ rows }: { rows: Array<{ passed: boolean | null }> }) {
  const pass = rows.filter((row) => row.passed === true).length;
  const fail = rows.filter((row) => row.passed === false).length;
  if (pass === 0 && fail === 0) return null;
  const passed = pass >= fail;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
        passed
          ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
          : "bg-rose-500/12 text-rose-700 dark:text-rose-300"
      }`}
    >
      {passed ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={3} />}
      {passed ? "עבר" : "לא עבר"}
      {pass + fail > 1 ? <span className="tabular-nums opacity-70">({pass}/{pass + fail})</span> : null}
    </span>
  );
}

function ScoreBadge({ value, suffix }: { value: number | null; suffix?: string }) {
  if (value == null) return null;
  return (
    <span className="inline-flex items-baseline gap-0.5 rounded-xl bg-surface-2 px-2.5 py-1" dir="ltr">
      <span className="text-base font-extrabold tabular-nums text-text-primary">{value}</span>
      {suffix ? <span className="text-[10px] font-bold text-text-muted">{suffix}</span> : null}
    </span>
  );
}

const STAGE_HEAD_TONES: Record<CaseTone, string> = {
  sky: "bg-sky-50/80 dark:bg-sky-500/10",
  emerald: "bg-emerald-50/80 dark:bg-emerald-500/10",
  amber: "bg-amber-50/80 dark:bg-amber-500/10",
  rose: "bg-rose-50/80 dark:bg-rose-500/10",
  slate: "bg-slate-100/80 dark:bg-white/[0.05]",
  violet: "bg-violet-50/80 dark:bg-violet-500/10",
};

const STAGE_ICON_TONES: Record<CaseTone, string> = {
  sky: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  slate: "bg-slate-100 text-slate-600 dark:bg-white/[0.05] dark:text-slate-300",
  violet: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
};

type StageTab = {
  id: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  title: string;
  subtitle: string;
  tone: CaseTone;
  summary?: ReactNode;
  href?: string;
  content: ReactNode;
};

/** Card tabs: selecting a card reveals its content in a panel below. */
function StageTabs({ tabs, defaultId }: { tabs: StageTab[]; defaultId?: string }) {
  const [activeId, setActiveId] = useState<string | null>(defaultId ?? tabs[0]?.id ?? null);
  const active = tabs.find((tab) => tab.id === activeId) ?? null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:items-stretch" role="tablist" aria-label="שלבי תיק">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = tab.id === activeId;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveId((current) => (current === tab.id ? null : tab.id))}
              className={`${caseCardClass} group flex h-full min-w-0 flex-col text-start transition ${
                selected
                  ? "shadow-[0_0_0_2px_color-mix(in_srgb,var(--accent-primary)_45%,transparent),0_14px_32px_-16px_rgba(22,24,29,0.3)]"
                  : "hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(22,24,29,0.07),0_14px_32px_-16px_rgba(22,24,29,0.3)]"
              }`}
            >
              <span
                className={`flex h-full items-center gap-3 px-4 py-3 md:flex-col md:items-stretch md:gap-3 md:px-3.5 md:py-4 ${STAGE_HEAD_TONES[tab.tone]}`}
              >
                <span className="flex min-w-0 flex-1 items-center gap-3 md:flex-col md:items-center md:gap-2.5 md:text-center">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-1 shadow-sm ${STAGE_ICON_TONES[tab.tone]}`}
                  >
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0 truncate text-[15px] font-extrabold text-text-primary md:whitespace-normal md:leading-snug">
                    {tab.title}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5 md:mt-auto md:w-full md:justify-between">
                  {tab.summary ? <span className="flex flex-wrap items-center gap-1.5">{tab.summary}</span> : <span />}
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-1/80 text-text-muted transition ${
                      selected ? "bg-surface-1 text-text-primary" : "group-hover:bg-surface-1 group-hover:text-text-primary"
                    }`}
                  >
                    <ChevronDown size={14} className={`transition-transform duration-200 ${selected ? "rotate-180" : ""}`} />
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {active ? (
        <section className={`${caseCardClass}`} role="tabpanel" aria-label={active.title}>
          <div className={`flex flex-wrap items-center gap-3 px-4 py-3 ${STAGE_HEAD_TONES[active.tone]}`}>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-extrabold text-text-primary">{active.title}</p>
              {active.subtitle ? <p className="mt-0.5 text-xs text-text-muted">{active.subtitle}</p> : null}
            </div>
            {active.href ? (
              <Link
                href={active.href}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-1 px-3 py-1.5 text-xs font-bold text-text-secondary transition hover:text-text-primary"
              >
                למסך המלא
                <ChevronLeft size={13} />
              </Link>
            ) : null}
          </div>
          <div className="p-4 sm:p-5">{active.content}</div>
        </section>
      ) : null}
    </div>
  );
}

function Overview({
  payload,
  role,
  canRamad,
  canEvaluate,
  onSaved,
  initialDocumentsOpen = false,
}: {
  payload: FilePayload;
  role: ModuleRole | null;
  canRamad: boolean;
  canEvaluate: boolean;
  onSaved: () => void;
  initialDocumentsOpen?: boolean;
}) {
  const router = useRouter();
  const currentUserId = payload.currentUserId;
  const candidateId = payload.candidate.id;
  const [documentsOpen, setDocumentsOpen] = useState(initialDocumentsOpen);

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

  const notesList = (notes: AgamTimelineItem[]) => (
    <AssessmentNoteList
      notes={notes}
      currentUserId={currentUserId}
      role={payload.role}
      candidateId={candidateId}
      onSaved={onSaved}
    />
  );

  const countLabel = (count: number, one: string, many: string) =>
    count === 0 ? null : count === 1 ? `${one} אחד` : `${count} ${many}`;

  const dayAverage = averageOf(payload.evaluations.map((row) => row.final_score ?? row.weighted_score));
  const daySubtitle =
    [
      countLabel(payload.interviews.length, "ראיון", "ראיונות"),
      countLabel(payload.evaluations.length, "מעריך", "מעריכים"),
    ]
      .filter(Boolean)
      .join(" · ") || "טרם הוזנו ראיון או הערכות";

  const prepAverage = averageOf(
    payload.prepDays.map((row) => averageOf([row.mikra_score, row.conversation_score, row.social_dynamics_score])),
  );
  const prepSubtitle = countLabel(payload.prepDays.length, "מעריך", "מעריכים") ?? "טרם הוזנו הערכות";

  const smachProfessional = averageOf(
    payload.smach.map((row) =>
      averageOf(PROFESSIONAL_CRITERIA.map((criterion) => row.professional_scores?.[criterion.key])),
    ),
  );
  const smachWeighted = averageOf(payload.smach.map((row) => row.weighted_score));
  const latestSmach = [...payload.smach].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  )[0];
  const smachSubtitle =
    [countLabel(payload.smach.length, "מעריך", "מעריכים"), latestSmach?.decision].filter(Boolean).join(" · ") ||
    "טרם הוזנו הערכות";

  const profileSubtitle =
    [
      payload.candidate.command,
      payload.candidate.planning_index != null ? `מדד ${payload.candidate.planning_index}` : null,
      payload.candidate.dapar != null ? `דפ״ר ${payload.candidate.dapar}` : null,
      payload.candidate.kahas != null ? `קה״ס ${payload.candidate.kahas}` : null,
    ]
      .filter(Boolean)
      .join(" · ") || "שירות, נתוני מיון, התניות והערות";

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_14rem]">
      <div className="flex min-w-0 flex-col gap-3.5">
        {isExceptional ? (
          <section className="flex items-start gap-3 rounded-3xl bg-rose-500/[0.08] px-5 py-4 text-text-primary shadow-[inset_0_0_0_1px_rgba(225,29,72,0.15)]">
            <AlertTriangle className="mt-0.5 shrink-0 text-rose-600" size={18} />
            <div>
              <p className="text-sm font-extrabold">התראת חייל חריג</p>
              <p className="mt-0.5 text-sm text-text-secondary">
                מדד תכנוני {payload.candidate.planning_index} ודפ״ר {payload.candidate.dapar}.
              </p>
            </div>
          </section>
        ) : null}

        <StageTabs
          defaultId="profile"
          tabs={[
            {
              id: "profile",
              icon: UserRound,
              title: "פרטים אישיים",
              subtitle: profileSubtitle,
              tone: "slate",
              content: (
                <CandidateProfileCard
                  candidate={payload.candidate}
                  questions={payload.preQuestions}
                  canEvaluate={canEvaluate}
                  onSaved={onSaved}
                  embedded
                />
              ),
            },
            {
              id: "day",
              icon: Award,
              title: "יום מיונים",
              subtitle: daySubtitle,
              tone: "sky",
              href: `/agam/candidates/${candidateId}?stage=day_selection`,
              summary: (
                <>
                  <VerdictPill rows={payload.evaluations} />
                  <ScoreBadge value={dayAverage} />
                </>
              ),
              content: (
                <div className="grid gap-5 md:grid-cols-2">
                  <EvalGroup title="ראיונות" count={payload.interviews.length + interviewNotes.length}>
                    {payload.interviews.length === 0 && interviewNotes.length === 0 ? (
                      <EvalEmpty label="אין ראיונות" />
                    ) : (
                      payload.interviews.map((interview) => (
                        <div key={interview.id} className="rounded-xl bg-surface-2/70 px-3.5 py-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-bold text-text-primary">
                              {interview.evaluator_name ?? "מעריך"}
                            </p>
                            {interview.recommendation ? (
                              <span className="rounded-full bg-surface-1 px-2 py-0.5 text-[11px] font-bold text-text-secondary">
                                {interview.recommendation}
                              </span>
                            ) : null}
                          </div>
                          {interview.evaluator_assessment ? (
                            <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-text-muted">
                              {interview.evaluator_assessment}
                            </p>
                          ) : null}
                        </div>
                      ))
                    )}
                    {notesList(interviewNotes)}
                  </EvalGroup>

                  <EvalGroup
                    title="הערכות מעריכים"
                    count={payload.evaluations.length + daySelectionNotes.length}
                  >
                    {payload.evaluations.length === 0 && daySelectionNotes.length === 0 ? (
                      <EvalEmpty label="אין הערכות" />
                    ) : (
                      payload.evaluations.map((evaluation) => (
                        <div
                          key={evaluation.id}
                          className="flex items-center justify-between gap-2 rounded-xl bg-surface-2/70 px-3.5 py-2.5"
                        >
                          <p className="text-sm font-bold text-text-primary">
                            {evaluation.evaluator_name ?? "מעריך"}
                          </p>
                          <span className="flex items-center gap-2">
                            <VerdictPill rows={[evaluation]} />
                            <span className="text-base font-extrabold tabular-nums text-text-primary">
                              {evaluation.final_score ?? evaluation.weighted_score ?? "—"}
                            </span>
                          </span>
                        </div>
                      ))
                    )}
                    {notesList(daySelectionNotes)}
                  </EvalGroup>
                </div>
              ),
            },
            {
              id: "prep",
              icon: BookOpen,
              title: "יום מכין",
              subtitle: prepSubtitle,
              tone: "emerald",
              href: `/agam/candidates/${candidateId}?stage=preparation_day`,
              summary: (
                <>
                  <VerdictPill rows={payload.prepDays} />
                  <ScoreBadge value={prepAverage} />
                </>
              ),
              content: (
                <div className="space-y-2">
                  {payload.prepDays.length === 0 && prepNotes.length === 0 ? (
                    <EvalEmpty label="אין הערכות" />
                  ) : (
                    payload.prepDays.map((row) => (
                      <div key={row.id} className="py-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-bold text-text-primary">{row.evaluator_name ?? "מעריך"}</p>
                          <VerdictPill rows={[row]} />
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {(
                            [
                              ["מקראות", row.mikra_score],
                              ["שיחה", row.conversation_score],
                              ["דינמיקה", row.social_dynamics_score],
                            ] as const
                          ).map(([label, score]) => (
                            <div key={label} className="rounded-xl bg-surface-2/60 px-2.5 py-2 text-center">
                              <p className="text-[11px] font-semibold text-text-muted">{label}</p>
                              <p className="text-sm font-extrabold tabular-nums text-text-primary">
                                {score ?? "—"}
                              </p>
                            </div>
                          ))}
                        </div>
                        {prepFeedback(row).length > 0 ? (
                          <dl className="mt-3 space-y-2.5">
                            {prepFeedback(row).map(({ label, text }) => (
                              <div key={label}>
                                <dt className="text-[11px] font-extrabold text-text-muted">{label}</dt>
                                <dd className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
                                  {text}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        ) : null}
                      </div>
                    ))
                  )}
                  {notesList(prepNotes)}
                </div>
              ),
            },
            {
              id: "smach",
              icon: ClipboardCheck,
              title: "סמ״ח",
              subtitle: smachSubtitle,
              tone: "violet",
              href: `/agam/candidates/${candidateId}?stage=smach`,
              summary: (
                <>
                  <VerdictPill rows={payload.smach} />
                  <ScoreBadge
                    value={smachWeighted ?? smachProfessional}
                    suffix={smachWeighted == null && smachProfessional != null ? "/5" : undefined}
                  />
                </>
              ),
              content: (
                <div className="space-y-2">
                  {payload.smach.length === 0 && smachNotes.length === 0 ? (
                    <EvalEmpty label="אין הערכות" />
                  ) : (
                    payload.smach.map((row) => <SmachReadOnlyCard key={row.id} evaluation={row} />)
                  )}
                  {notesList(smachNotes)}
                </div>
              ),
            },
          ]}
        />

        {otherNotes.length > 0 ? (
          <section className={`${caseCardClass} p-5`}>
            <EvalGroup title="הערות נוספות" count={otherNotes.length}>
              {notesList(otherNotes)}
            </EvalGroup>
          </section>
        ) : null}

      </div>

      <aside className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-20">
        <CandidateExamsCard
          candidateId={candidateId}
          prepDays={payload.prepDays}
          smach={payload.smach}
          documents={payload.documents}
          currentUserId={currentUserId}
          canEdit={canEvaluate}
          canApprove={canRamad}
          onSaved={onSaved}
        />
        {(() => {
          const paperwork = payload.documents.filter((document) => !isSportsResultsDocument(document));
          const pending = paperwork.filter((document) => !document.approved_at).length;
          return (
            <button
              type="button"
              onClick={() => setDocumentsOpen(true)}
              className={`${caseCardClass} flex w-full items-center gap-3 px-4 py-3 text-start transition hover:bg-surface-2/60`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
                <FolderOpen size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-extrabold text-text-primary">מסמכים</span>
                <span className="block truncate text-[11px] font-semibold text-text-muted">
                  {paperwork.length > 0 ? `${paperwork.length} מסמכים בתיק` : "אין מסמכים עדיין"}
                </span>
              </span>
              {pending > 0 ? (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-extrabold text-amber-700 dark:text-amber-200">
                  {pending} ממתינים
                </span>
              ) : null}
              <ChevronLeft size={16} className="shrink-0 text-text-muted" />
            </button>
          );
        })()}
      </aside>

      <CandidateDocumentsCenter
        open={documentsOpen}
        onClose={() => {
          setDocumentsOpen(false);
          if (initialDocumentsOpen) router.replace(`/agam/candidates/${candidateId}`, { scroll: false });
        }}
        candidate={payload.candidate}
        documents={payload.documents}
        canEvaluate={canEvaluate}
        canApprove={canRamad}
        onSaved={onSaved}
      />
    </div>
  );
}

function yesNo(value: boolean | null | undefined): string {
  if (value === true) return "כן";
  if (value === false) return "לא";
  return "לא סומן";
}

const PROFILE_SECTION_META: Record<string, { icon: ComponentType<{ size?: number; className?: string }>; tone: CaseTone }> = {
  "פרטים אישיים": { icon: UserRound, tone: "slate" },
  שירות: { icon: Shield, tone: "sky" },
  "פרטי קשר ותפקיד": { icon: MessageSquare, tone: "violet" },
  "כנס הסברה": { icon: BookOpen, tone: "emerald" },
  התניות: { icon: HeartPulse, tone: "amber" },
};

function CandidateProfileCard({
  candidate,
  questions = [],
  canEvaluate,
  onSaved,
  embedded = false,
}: {
  candidate: AgamCandidate;
  questions?: AgamQuestion[];
  canEvaluate: boolean;
  onSaved: () => void;
  embedded?: boolean;
}) {
  const [command, setCommand] = useState(candidate.command ?? "");
  const [directCommanderName, setDirectCommanderName] = useState(candidate.direct_commander_name ?? "");
  const [directCommanderRole, setDirectCommanderRole] = useState(candidate.direct_commander_role ?? "");
  const [exemptions, setExemptions] = useState(candidate.exemptions ?? "");
  const [km, setKm] = useState(candidate.km ?? "");
  const [planningIndex, setPlanningIndex] = useState(candidate.planning_index?.toString() ?? "");
  const [dapar, setDapar] = useState(candidate.dapar?.toString() ?? "");
  const [releaseDate, setReleaseDate] = useState(candidate.release_date ? toDateInputValue(candidate.release_date) : "");
  const [kahas, setKahas] = useState(candidate.kahas?.toString() ?? "");
  const [tash, setTash] = useState(candidate.tash?.toString() ?? "");
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
    setExemptions(candidate.exemptions ?? "");
    setKm(candidate.km ?? "");
    setPlanningIndex(candidate.planning_index?.toString() ?? "");
    setDapar(candidate.dapar?.toString() ?? "");
    setReleaseDate(candidate.release_date ? toDateInputValue(candidate.release_date) : "");
    setKahas(candidate.kahas?.toString() ?? "");
    setTash(candidate.tash?.toString() ?? "");
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
          exemptions: exemptions || null,
          km: km || null,
          planning_index: planningIndex ? Number(planningIndex) : null,
          dapar: dapar ? Number(dapar) : null,
          release_date: releaseDate || null,
          kahas: kahas ? Number(kahas) : null,
          tash: tash ? Number(tash) : null,
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
  const isEditing = editing && canEvaluate;
  const editInputClass =
    "ui-field h-8 w-full max-w-[11rem] rounded-lg bg-surface-1 px-2.5 text-sm font-bold text-text-primary outline-none";

  const selectRow = (
    label: string,
    value: string,
    setter: (value: string) => void,
    options: ReadonlyArray<string | readonly [string, string]>,
    display: string,
    emptyLabel = "ללא",
  ) => (
    <CaseRow label={label} value={display}>
      {isEditing ? (
        <dd className="min-w-0">
          <select className={editInputClass} value={value} onChange={(event) => setter(event.target.value)}>
            <option value="">{emptyLabel}</option>
            {options.map((option) => {
              const [optionValue, optionLabel] = typeof option === "string" ? [option, option] : option;
              return (
                <option key={optionValue} value={optionValue}>
                  {optionLabel}
                </option>
              );
            })}
            {value && !options.some((option) => (typeof option === "string" ? option : option[0]) === value) ? (
              <option value={value}>{value}</option>
            ) : null}
          </select>
        </dd>
      ) : undefined}
    </CaseRow>
  );

  const textRow = (label: string, value: string, setter: (value: string) => void) => (
    <CaseRow label={label} value={value}>
      {isEditing ? (
        <dd className="min-w-0">
          <input className={editInputClass} value={value} onChange={(event) => setter(event.target.value)} />
        </dd>
      ) : undefined}
    </CaseRow>
  );

  const yesNoOptions = [
    ["yes", "כן"],
    ["no", "לא"],
  ] as const;
  const yesNoDisplay = (value: string) => yesNo(value ? value === "yes" : null);

  const notes = [
    { key: "exemptions", label: "פטורים", icon: ShieldCheck, tone: "slate" as const, value: exemptions, setter: setExemptions },
    { key: "km", label: "כ״מ", icon: FileText, tone: "violet" as const, value: km, setter: setKm },
  ];

  const questionnaire = (candidate.questionnaire_data ?? {}) as Record<string, unknown>;
  const answerText = (key: string) => {
    const value = questionnaire[key];
    if (typeof value === "boolean") return value ? "כן" : "לא";
    if (value == null) return "";
    const text = String(value).trim();
    return text;
  };

  const visibilityValues: Record<string, string> = {};
  for (const [key, value] of Object.entries(questionnaire)) {
    visibilityValues[key] = typeof value === "boolean" ? (value ? "כן" : "לא") : value == null ? "" : String(value);
  }
  if (!visibilityValues.full_name) visibilityValues.full_name = candidate.full_name;
  if (!visibilityValues.personal_number) visibilityValues.personal_number = candidate.personal_number;
  if (!visibilityValues.phone) visibilityValues.phone = candidate.phone ?? "";
  if (!visibilityValues.civilian_email) visibilityValues.civilian_email = candidate.email ?? "";
  if (!visibilityValues.command) visibilityValues.command = command;
  if (!visibilityValues.direct_commander_name) visibilityValues.direct_commander_name = directCommanderName;
  if (!visibilityValues.release_date) visibilityValues.release_date = releaseDate;
  if (!visibilityValues.planning_index) visibilityValues.planning_index = planningIndex;
  if (!visibilityValues.dapar) visibilityValues.dapar = dapar;
  if (!visibilityValues.tash) visibilityValues.tash = tash;
  if (!visibilityValues.needs_sakmar) visibilityValues.needs_sakmar = needsSakmar === "yes" ? "כן" : needsSakmar === "no" ? "לא" : "";
  if (!visibilityValues.mabdak_approval) {
    visibilityValues.mabdak_approval = mabdakApproval === "yes" ? "כן" : mabdakApproval === "no" ? "לא" : "";
  }
  if (!visibilityValues.medical_issue) {
    visibilityValues.medical_issue = medicalIssue === "yes" ? "כן" : medicalIssue === "no" ? "לא" : "";
  }

  const resolveQuestionValue = (fieldKey: string): string => {
    switch (fieldKey) {
      case "full_name":
        return answerText(fieldKey) || candidate.full_name;
      case "personal_number":
        return answerText(fieldKey) || candidate.personal_number;
      case "phone":
        return answerText(fieldKey) || candidate.phone || "";
      case "civilian_email":
        return answerText(fieldKey) || candidate.email || "";
      case "command":
        return command || answerText(fieldKey);
      case "direct_commander_name":
        return directCommanderName || answerText(fieldKey);
      case "direct_commander_role":
        return directCommanderRole || answerText(fieldKey);
      case "release_date": {
        const raw = releaseDate || answerText(fieldKey);
        return raw ? formatAgamDate(raw) : "";
      }
      case "planning_index":
        return planningIndex || answerText(fieldKey);
      case "dapar":
        return dapar || answerText(fieldKey);
      case "tash":
        return tash || answerText(fieldKey);
      case "needs_sakmar":
        return needsSakmar ? yesNoDisplay(needsSakmar) : answerText(fieldKey);
      case "mabdak_approval":
        return mabdakApproval ? yesNoDisplay(mabdakApproval) : answerText(fieldKey);
      case "medical_issue":
        return medicalIssue ? yesNoDisplay(medicalIssue) : answerText(fieldKey);
      default:
        return answerText(fieldKey);
    }
  };

  const questionSections = groupQuestionsBySection(questions.filter((question) => question.is_active)).map(
    ([, section]) => ({
      ...section,
      items: section.items.filter((question) => isQuestionVisible(question, visibilityValues)),
    }),
  ).filter((section) => section.items.length > 0);

  const blockDividerClass =
    "lg:[&:not(:first-child)]:shadow-[inset_-1px_0_0_rgba(22,24,29,0.06)] dark:lg:[&:not(:first-child)]:shadow-[inset_-1px_0_0_rgba(255,255,255,0.08)]";

  const renderEditableQuestion = (question: AgamQuestion) => {
    const label = question.question_text;
    const options = parseQuestionOptions(question.options);
    switch (question.field_key) {
      case "command":
        return textRow(label, command, setCommand);
      case "direct_commander_name":
        return textRow(label, directCommanderName, setDirectCommanderName);
      case "direct_commander_role":
        return textRow(label, directCommanderRole, setDirectCommanderRole);
      case "release_date":
        return (
          <CaseRow label={label} value={releaseDate ? formatAgamDate(releaseDate) : ""}>
            {isEditing ? (
              <dd className="min-w-0">
                <input
                  type="date"
                  className={editInputClass}
                  value={releaseDate}
                  onChange={(event) => setReleaseDate(event.target.value)}
                />
              </dd>
            ) : undefined}
          </CaseRow>
        );
      case "planning_index":
        return selectRow(label, planningIndex, setPlanningIndex, ["1", "2", "3", "4", "5", "6"], planningIndex);
      case "dapar":
        return selectRow(
          label,
          dapar,
          setDapar,
          ["10", "20", "30", "40", "50", "60", "70", "80", "90"],
          dapar,
        );
      case "tash":
        return selectRow(label, tash, setTash, options.length ? options : ["1", "2", "3", "4", "5", "6", "7"], tash);
      case "needs_sakmar":
        return selectRow(label, needsSakmar, setNeedsSakmar, yesNoOptions, yesNoDisplay(needsSakmar), "לא סומן");
      case "mabdak_approval":
        return selectRow(label, mabdakApproval, setMabdakApproval, yesNoOptions, yesNoDisplay(mabdakApproval), "לא סומן");
      case "medical_issue":
        return selectRow(label, medicalIssue, setMedicalIssue, yesNoOptions, yesNoDisplay(medicalIssue), "לא סומן");
      default:
        return <CaseRow key={question.field_key} label={label} value={resolveQuestionValue(question.field_key)} />;
    }
  };

  return (
    <section className={embedded ? "-m-5 sm:-m-6" : caseCardClass}>
      <div className="flex flex-wrap items-center justify-between gap-3 bg-accent-primary/[0.06] px-4 py-3">
        <div className={`min-w-0 items-center gap-3 ${embedded ? "hidden" : "flex"}`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-1 text-accent-primary shadow-sm">
            <UserRound size={17} />
          </span>
          <span className="min-w-0">
            <span className="block text-[15px] font-extrabold text-text-primary">פרטים אישיים</span>
            <span className="block truncate text-[11px] font-semibold text-text-muted">
              שירות, נתוני מיון, התניות והערות
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {rankColor && !isEditing ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs font-bold text-text-primary">
              <span className={`h-2.5 w-2.5 rounded-full ${RANK_DOTS[rankColor] ?? "bg-slate-400"}`} />
              דירוג {RANK_COLORS[rankColor]?.label ?? rankColor}
            </span>
          ) : null}
          {canEvaluate && !editing ? (
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => setEditing(true)}
            >
              <Pencil size={14} />
              עריכה
            </button>
          ) : null}
          {isEditing ? (
            <>
              <button type="button" className={primaryButtonClass} disabled={saving} onClick={() => void save()}>
                {saving ? "שומר…" : "שמירה"}
              </button>
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={saving}
                onClick={() => setShowCancelPopup(true)}
              >
                ביטול
              </button>
            </>
          ) : null}
        </div>
      </div>

      {showCancelPopup ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]">
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

      <>
      <div className="grid shadow-[inset_0_1px_0_rgba(22,24,29,0.06)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] lg:grid-cols-2 xl:grid-cols-3">
        {questionSections.map((section) => {
          const meta = PROFILE_SECTION_META[section.name] ?? { icon: ClipboardCheck, tone: "slate" as const };
          return (
            <div key={section.name} className={blockDividerClass}>
              <CaseSectionHead icon={meta.icon} title={section.name} tone={meta.tone} centered />
              <CaseRows>
                {section.items.map((question) => (
                  <div key={question.field_key}>{renderEditableQuestion(question)}</div>
                ))}
              </CaseRows>
            </div>
          );
        })}

        <div className={blockDividerClass}>
          <CaseSectionHead icon={Gauge} title="נתוני צוות" tone="emerald" centered />
          <CaseRows>
            {selectRow("קה״ס", kahas, setKahas, ["40", "41", "42", "43"], kahas)}
            {selectRow(
              "צבע דירוג",
              rankColor,
              setRankColor,
              [
                ["green", "ירוק"],
                ["orange", "כתום"],
                ["red", "אדום"],
              ],
              rankColor ? (RANK_COLORS[rankColor]?.label ?? rankColor) : "",
            )}
            <CaseRow label="הכנות לבה״ד 1">
              <dd className="flex min-w-0 items-center gap-2">
                <span className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-2">
                  <span
                    className="block h-full rounded-full bg-accent-primary"
                    style={{ width: `${(checklistDone / BAHAD1_CHECKLIST.length) * 100}%` }}
                  />
                </span>
                {candidate.cycle_id ? (
                  <Link
                    href={`/agam/cycles/${candidate.cycle_id}/bahad1`}
                    className="text-[13px] font-extrabold tabular-nums text-text-primary hover:text-accent-primary"
                    title="פתיחת הכנות לבה״ד 1 במסך המחזור"
                  >
                    {checklistDone}/{BAHAD1_CHECKLIST.length}
                  </Link>
                ) : (
                  <span className="text-[13px] font-extrabold tabular-nums text-text-primary">
                    {checklistDone}/{BAHAD1_CHECKLIST.length}
                  </span>
                )}
              </dd>
            </CaseRow>
          </CaseRows>
        </div>
      </div>

      <div className="grid shadow-[inset_0_1px_0_rgba(22,24,29,0.06)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] lg:grid-cols-2">
        {notes.map((note) => (
          <div key={note.key} className={blockDividerClass}>
            <CaseSectionHead icon={note.icon} title={note.label} tone={note.tone} centered />
            <div className="px-4 py-3">
              {isEditing ? (
                <textarea
                  className={fieldClass}
                  rows={3}
                  value={note.value}
                  placeholder={`הוסיפו ${note.label}…`}
                  onChange={(event) => note.setter(event.target.value)}
                />
              ) : note.value ? (
                <p className="whitespace-pre-wrap text-sm font-semibold leading-relaxed text-text-primary">
                  {note.value}
                </p>
              ) : (
                <p className="text-sm text-text-muted/70">אין {note.label}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      </>
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

function EvalGroup({
  title,
  count,
  href,
  children,
}: {
  title: string;
  count: number;
  href?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-text-primary">
          {title}
          <span className="rounded-full bg-surface-2 px-2 text-[11px] font-bold tabular-nums text-text-muted">
            {count}
          </span>
        </h3>
        {href ? (
          <Link
            href={href}
            className="inline-flex items-center gap-0.5 text-[11px] font-bold text-text-muted transition hover:text-text-primary"
          >
            לשלב
            <ChevronLeft size={12} />
          </Link>
        ) : null}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function EvalEmpty({ label }: { label: string }) {
  return (
    <p className="rounded-xl bg-surface-2/50 px-3.5 py-3 text-center text-xs text-text-muted">{label}</p>
  );
}
