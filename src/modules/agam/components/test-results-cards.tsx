"use client";

import { Activity, Check, ChevronDown, ClipboardCheck, GraduationCap, Info, Pencil, X } from "lucide-react";
import { useState, type ComponentType, type ReactNode } from "react";
import { toast } from "sonner";
import { CaseSectionHead, caseCardClass } from "@/modules/agam/components/case-file-kit";
import {
  SportsResultsPhotos,
  pendingSportsResultPhotos,
} from "@/modules/agam/components/sports-results-gallery";
import { Modal } from "@/components/ui/modal";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import {
  THRESHOLD_TESTS,
  computeThresholdPass,
  normalizeThresholdTests,
  withAutoThresholdPass,
  type AgamThresholdFamily,
  type AgamThresholdInputType,
} from "@/modules/agam/lib/stages";
import type { AgamDocument, AgamPrepDayEvaluation, AgamSmachEvaluation } from "@/modules/agam/types";

type IconType = ComponentType<{ size?: number; className?: string }>;

type ThresholdEntry = {
  pass?: boolean | null;
  score?: number | null;
  time?: string | null;
  count?: number | null;
  datum?: string | null;
};

export type ExamCell = {
  key: string;
  value: string | null;
  pass: boolean | null;
  inputType: AgamThresholdInputType;
};

export type ExamColumn = { label: string; cells: ExamCell[] };

export type ExamGroup = {
  id: "fitness" | "theory";
  title: string;
  icon: IconType;
  columns: ExamColumn[];
};

export const EXAM_GROUPS: Array<{
  id: ExamGroup["id"];
  title: string;
  icon: IconType;
  columns: Array<{ family: AgamThresholdFamily; label: string }>;
}> = [
  {
    id: "fitness",
    title: "כושר",
    icon: Activity,
    columns: [
      { family: "fitness_strength", label: "שכיבות סמיכה" },
      { family: "fitness_run", label: "ריצה" },
    ],
  },
  {
    id: "theory",
    title: "עיוני",
    icon: GraduationCap,
    columns: [
      { family: "mikraot_israel", label: "מקראות" },
      { family: "weapon_test", label: "נשק" },
    ],
  },
];

const ATTEMPTS = [1, 2, 3, 4];

const GROUP_TONE: Record<ExamGroup["id"], { icon: string; ring: string; soft: string }> = {
  fitness: {
    icon: "text-emerald-600 dark:text-emerald-300",
    ring: "ring-emerald-500/50 text-emerald-700 dark:text-emerald-200",
    soft: "bg-emerald-500/[0.06]",
  },
  theory: {
    icon: "text-violet-600 dark:text-violet-300",
    ring: "ring-violet-500/50 text-violet-700 dark:text-violet-200",
    soft: "bg-violet-500/[0.06]",
  },
};

/** Circled summary: average score for עיוני, pass rate for כושר. */
function groupSummary(group: ExamGroup): string | null {
  const cells = group.columns.flatMap((column) => column.cells);
  if (group.id === "theory") {
    const scores = cells.map((cell) => Number(cell.value)).filter((value) => Number.isFinite(value) && value > 0);
    if (scores.length === 0) return null;
    return String(Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length));
  }
  const judged = cells.filter((cell) => cell.pass != null);
  if (judged.length === 0) return null;
  return `${Math.round((judged.filter((cell) => cell.pass).length / judged.length) * 100)}%`;
}

export function PassMark({ pass }: { pass: boolean | null }) {
  if (pass == null) return null;
  return (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white ${
        pass ? "bg-emerald-500" : "bg-rose-500"
      }`}
      aria-label={pass ? "עבר" : "לא עבר"}
    >
      {pass ? <Check size={9} strokeWidth={3.5} /> : <X size={9} strokeWidth={3.5} />}
    </span>
  );
}

export function ExamCellView({ cell }: { cell: ExamCell }) {
  return (
    <span className="flex items-center justify-center gap-1.5">
      <span
        className={`text-[15px] font-extrabold tabular-nums ${cell.value == null ? "text-text-muted/35" : "text-text-primary"}`}
        dir="ltr"
      >
        {cell.value ?? "—"}
      </span>
      <PassMark pass={cell.pass} />
    </span>
  );
}

function ExamGroupPanel({
  group,
  defaultOpen,
  renderCell,
  headerAction,
}: {
  group: ExamGroup;
  defaultOpen: boolean;
  renderCell: (cell: ExamCell) => ReactNode;
  headerAction?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const tone = GROUP_TONE[group.id];
  const summary = groupSummary(group);
  const Icon = group.icon;

  return (
    <div className={`overflow-hidden rounded-2xl ${tone.soft} ring-1 ring-black/[0.04] dark:ring-white/[0.06]`}>
      <div className="flex items-center gap-1.5 px-3.5 py-3">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          className="flex shrink-0 items-center gap-2.5 text-start"
        >
          <Icon size={17} className={`shrink-0 ${tone.icon}`} />
          <span className="text-[15px] font-extrabold text-text-primary">{group.title}</span>
        </button>
        {headerAction}
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-label={open ? "סגירה" : "פתיחה"}
          className="flex min-w-0 flex-1 items-center justify-end gap-2.5"
        >
          {summary ? (
            <span
              className={`flex h-9 min-w-9 items-center justify-center rounded-full bg-surface-1 px-2 text-[13px] font-extrabold tabular-nums ring-2 ${tone.ring}`}
              dir="ltr"
            >
              {summary}
            </span>
          ) : null}
          <ChevronDown
            size={17}
            className={`shrink-0 text-text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {open ? (
        <div className="px-2.5 pb-2.5">
          <table className="w-full table-fixed overflow-hidden rounded-xl bg-surface-1 text-center">
            <thead>
              <tr className="text-[11px] font-extrabold text-text-muted">
                <th className="w-[5.5rem] px-2 py-2 text-start font-extrabold">ניסיון</th>
                {group.columns.map((column) => (
                  <th key={column.label} className="px-2 py-2 font-extrabold">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ATTEMPTS.map((attempt, index) => (
                <tr key={attempt} className="border-t border-border-weak/50">
                  <td className="px-2 py-2 text-start text-[12px] font-bold text-text-secondary">מבחן {attempt}</td>
                  {group.columns.map((column) => (
                    <td key={column.label} className="px-1.5 py-1.5">
                      {column.cells[index] ? renderCell(column.cells[index]) : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

/** Builds the כושר / עיוני groups from a per-test cell factory. */
export function buildExamGroups(cellFor: (test: (typeof THRESHOLD_TESTS)[number]) => ExamCell): ExamGroup[] {
  return EXAM_GROUPS.map((group) => ({
    id: group.id,
    title: group.title,
    icon: group.icon,
    columns: group.columns.map((column) => ({
      label: column.label,
      cells: THRESHOLD_TESTS.filter((test) => test.family === column.family).map(cellFor),
    })),
  }));
}

/** כושר + עיוני panels, each a collapsible table of attempts × test types. */
export function ExamPanels({
  groups,
  renderCell = (cell) => <ExamCellView cell={cell} />,
  groupHeaderAction,
  alwaysOpen = false,
}: {
  groups: ExamGroup[];
  renderCell?: (cell: ExamCell) => ReactNode;
  groupHeaderAction?: (group: ExamGroup) => ReactNode;
  alwaysOpen?: boolean;
}) {
  return (
    <div className="space-y-2.5 p-2.5">
      {groups.map((group) => (
        <ExamGroupPanel
          key={group.id}
          group={group}
          defaultOpen={alwaysOpen || group.columns.some((column) => column.cells.some((cell) => cell.value != null))}
          renderCell={renderCell}
          headerAction={groupHeaderAction?.(group)}
        />
      ))}
    </div>
  );
}

/** "מבחנים" card wrapping the exam panels. */
export function ExamsBoard({
  groups,
  action,
  renderCell,
  groupHeaderAction,
  className = "",
}: {
  groups: ExamGroup[];
  action?: ReactNode;
  renderCell?: (cell: ExamCell) => ReactNode;
  groupHeaderAction?: (group: ExamGroup) => ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section className={`${caseCardClass} ${className}`}>
      <CaseSectionHead
        icon={ClipboardCheck}
        title="מבחנים"
        tone="sky"
        open={open}
        onToggle={() => setOpen((current) => !current)}
        action={action}
      />
      {open ? <ExamPanels groups={groups} renderCell={renderCell} groupHeaderAction={groupHeaderAction} /> : null}
    </section>
  );
}

function byRecency<T extends { created_at: string; updated_at?: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => new Date(b.updated_at ?? b.created_at).getTime() - new Date(a.updated_at ?? a.created_at).getTime(),
  );
}

function entryValue(entry: ThresholdEntry | null | undefined): string | null {
  if (!entry) return null;
  const value = entry.score ?? entry.count ?? entry.time ?? entry.datum ?? null;
  return value == null || value === "" ? null : String(value);
}

function latestThreshold(smach: AgamSmachEvaluation[], key: string): ThresholdEntry | null {
  for (const row of byRecency(smach)) {
    const tests = normalizeThresholdTests((row.threshold_tests as Record<string, ThresholdEntry> | null) ?? {});
    const entry = tests[key];
    if (entry && (entryValue(entry) != null || entry.pass != null)) return entry;
  }
  return null;
}

function passFromEntry(key: string, entry: ThresholdEntry | null, inputType: AgamThresholdInputType): boolean | null {
  if (!entry) return null;
  const computed = computeThresholdPass(key, {
    score: inputType === "score" ? entry.score ?? (entry.datum != null ? Number(entry.datum) : null) : entry.score,
    time: inputType === "time" ? entry.time ?? entry.datum : entry.time,
    count: inputType === "count" ? entry.count ?? (entry.datum != null ? Number(entry.datum) : null) : entry.count,
  });
  return computed ?? entry.pass ?? null;
}

export function draftPass(cell: ExamCell, raw: string): boolean | null {
  return computeThresholdPass(
    cell.key,
    cell.inputType === "time"
      ? { time: raw || null }
      : cell.inputType === "count"
        ? { count: raw === "" ? null : Number(raw) }
        : { score: raw === "" ? null : Number(raw) },
  );
}

const iconButtonClass =
  "inline-flex h-7 w-7 items-center justify-center rounded-full text-text-muted transition hover:bg-surface-1 hover:text-text-primary disabled:opacity-50";

/** Staff view of the candidate's exams, with inline editing of the current evaluator's results. */
export function CandidateExamsCard({
  candidateId,
  prepDays,
  smach,
  documents = [],
  currentUserId,
  canEdit = false,
  canApprove = false,
  onSaved,
}: {
  candidateId: string;
  prepDays: AgamPrepDayEvaluation[];
  smach: AgamSmachEvaluation[];
  documents?: AgamDocument[];
  currentUserId?: string;
  canEdit?: boolean;
  canApprove?: boolean;
  onSaved?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sportsOpen, setSportsOpen] = useState(false);
  const pendingSports = pendingSportsResultPhotos(documents);
  const mine = smach.find((row) => row.evaluator_id === currentUserId);
  const prepMikra = byRecency(prepDays).find((row) => row.mikra_score != null)?.mikra_score ?? null;

  const cellFor = (key: string, inputType: AgamThresholdInputType): ExamCell => {
    const entry = latestThreshold(smach, key);
    const value = entryValue(entry);
    if (key === "mikraot_israel_1" && value == null && prepMikra != null) {
      return { key, inputType, value: String(prepMikra), pass: computeThresholdPass(key, { score: prepMikra }) };
    }
    return { key, inputType, value, pass: passFromEntry(key, entry, inputType) };
  };

  const groups = buildExamGroups((test) => cellFor(test.key, test.inputType));
  const cells = groups.flatMap((group) => group.columns.flatMap((column) => column.cells));

  const startEdit = () => {
    setDrafts(Object.fromEntries(cells.map((cell) => [cell.key, cell.value ?? ""])));
    setEditing(true);
  };

  const save = async () => {
    const invalid = cells.find((cell) => {
      if (cell.inputType !== "score") return false;
      const raw = drafts[cell.key]?.trim();
      return raw ? !(Number(raw) >= 1 && Number(raw) <= 100) : false;
    });
    if (invalid) {
      toast.error("ציון צריך להיות בין 1 ל־100");
      return;
    }
    const thresholdTests: Record<string, unknown> = normalizeThresholdTests(
      (mine?.threshold_tests as Record<string, unknown> | null) ?? {},
    );
    for (const cell of cells) {
      const raw = (drafts[cell.key] ?? "").trim();
      const entry: ThresholdEntry = { ...((thresholdTests[cell.key] as ThresholdEntry) ?? {}) };
      delete entry.datum;
      if (cell.inputType === "time") entry.time = raw || null;
      else if (cell.inputType === "count") entry.count = raw === "" ? null : Number(raw);
      else entry.score = raw === "" ? null : Number(raw);
      thresholdTests[cell.key] = withAutoThresholdPass(cell.key, entry);
    }
    setSaving(true);
    try {
      await agamFetch("/api/agam/smach", {
        method: "POST",
        body: JSON.stringify({
          candidateId,
          thresholdTests,
          professionalScores: mine?.professional_scores ?? {},
          professionalFeedback: mine?.professional_feedback ?? {},
          weightedScore: mine?.weighted_score ?? null,
          keyPoints: mine?.key_points ?? "",
          decision: mine?.decision ?? null,
          decisionReasoning: mine?.decision_reasoning ?? "",
          passed: mine?.passed ?? null,
        }),
      });
      toast.success("תוצאות המבחנים נשמרו");
      setEditing(false);
      onSaved?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  const action = editing ? (
    <>
      <button
        type="button"
        className={`${iconButtonClass} !text-emerald-600`}
        onClick={() => void save()}
        disabled={saving}
        aria-label="שמירה"
        title="שמירה"
      >
        <Check size={14} strokeWidth={3} />
      </button>
      <button
        type="button"
        className={iconButtonClass}
        onClick={() => setEditing(false)}
        disabled={saving}
        aria-label="ביטול"
        title="ביטול"
      >
        <X size={14} strokeWidth={3} />
      </button>
    </>
  ) : canEdit ? (
    <button type="button" className={iconButtonClass} onClick={startEdit} aria-label="עריכת מבחנים" title="עריכה">
      <Pencil size={13} />
    </button>
  ) : null;

  return (
    <>
      <ExamsBoard
        groups={groups}
        action={action}
        groupHeaderAction={(group) =>
          group.id === "fitness" ? (
            <button
              type="button"
              className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-emerald-700/80 transition hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-300/80 dark:hover:text-emerald-200"
              onClick={() => setSportsOpen(true)}
              aria-label="תוצאות ספורט"
              title="תוצאות ספורט"
            >
              <Info size={15} strokeWidth={2.25} />
              {pendingSports.length > 0 ? (
                <span className="absolute -end-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-emerald-600 px-0.5 text-[8px] font-extrabold leading-none text-white">
                  {pendingSports.length}
                </span>
              ) : null}
            </button>
          ) : null
        }
        renderCell={(cell) =>
          editing ? (
            <span className="flex items-center gap-1">
              <input
                dir="ltr"
                inputMode={cell.inputType === "time" ? "text" : "numeric"}
                type={cell.inputType === "time" ? "text" : "number"}
                min={cell.inputType === "score" ? 1 : 0}
                max={cell.inputType === "score" ? 100 : undefined}
                placeholder={cell.inputType === "time" ? "12:30" : "—"}
                value={drafts[cell.key] ?? ""}
                onChange={(event) => setDrafts((current) => ({ ...current, [cell.key]: event.target.value }))}
                className="ui-field h-8 w-full min-w-0 rounded-lg bg-surface-2/70 px-1.5 text-center text-sm font-extrabold tabular-nums text-text-primary outline-none"
              />
              <PassMark pass={draftPass(cell, drafts[cell.key] ?? "")} />
            </span>
        ) : (
          <ExamCellView cell={cell} />
        )
        }
      />
      <Modal open={sportsOpen} onClose={() => setSportsOpen(false)} title="תוצאות ספורט" size="lg">
        <SportsResultsPhotos documents={documents} canApprove={canApprove} onSaved={onSaved} />
      </Modal>
    </>
  );
}
