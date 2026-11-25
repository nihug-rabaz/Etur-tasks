"use client";

import { Activity, Check, ChevronDown, ClipboardCheck, GraduationCap, Info, Pencil, X } from "lucide-react";
import { Fragment, useState, type ComponentType, type ReactNode } from "react";
import { toast } from "sonner";
import { CaseSectionHead, caseCardClass } from "@/modules/agam/components/case-file-kit";
import {
  SportsResultsPhotos,
  pendingSportsResultPhotos,
} from "@/modules/agam/components/sports-results-gallery";
import { Modal } from "@/components/ui/modal";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { examResultValue } from "@/modules/agam/lib/exam-results";
import { primaryButtonClass, secondaryButtonClass } from "@/modules/agam/lib/ui";
import {
  THRESHOLD_PASS,
  THRESHOLD_TESTS,
  computeThresholdPass,
  type AgamThresholdFamily,
  type AgamThresholdInputType,
} from "@/modules/agam/lib/stages";
import type { AgamDocument, AgamExamResult, AgamPrepDayEvaluation } from "@/modules/agam/types";

type IconType = ComponentType<{ size?: number; className?: string }>;

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
    <span className="flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5">
      <span
        className={`whitespace-nowrap text-[14px] font-extrabold tabular-nums ${cell.value == null ? "text-text-muted/35" : "text-text-primary"}`}
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
        <div className="px-1.5 pb-1.5">
          <table className="w-full table-fixed overflow-hidden rounded-xl bg-surface-1 text-center">
            <thead>
              <tr className="text-[11px] font-extrabold text-text-muted">
                <th className="w-[3.25rem] px-1.5 py-2 text-start font-extrabold">ניסיון</th>
                {group.columns.map((column) => (
                  <th key={column.label} className="px-1 py-2 font-extrabold leading-tight">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ATTEMPTS.map((attempt, index) => (
                <tr key={attempt} className="border-t border-border-weak/50">
                  <td className="whitespace-nowrap px-1.5 py-2 text-start text-[11px] font-bold text-text-secondary">
                    מבחן {attempt}
                  </td>
                  {group.columns.map((column) => (
                    <td key={column.label} className="px-1 py-1.5">
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
    <div className="space-y-2 p-2">
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
  defaultOpen = true,
}: {
  groups: ExamGroup[];
  action?: ReactNode;
  renderCell?: (cell: ExamCell) => ReactNode;
  groupHeaderAction?: (group: ExamGroup) => ReactNode;
  className?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
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

const TEST_LABEL = new Map(THRESHOLD_TESTS.map((test) => [test.key, test.label]));

const FAMILY_HINT: Record<AgamThresholdFamily, string> = {
  fitness_strength: `עובר מ־${THRESHOLD_PASS.fitness_strength.countMin}`,
  fitness_run: `דק׳:שנ׳ · עובר עד ${THRESHOLD_PASS.fitness_run.timeMax}`,
  mikraot_israel: `עובר מ־${THRESHOLD_PASS.mikraot_israel.scoreMin}`,
  weapon_test: `עובר מ־${THRESHOLD_PASS.weapon_test.scoreMin}`,
};

function draftError(cell: ExamCell, raw: string): string | null {
  if (!raw) return null;
  if (cell.inputType === "time") return /^\d{1,2}:[0-5]\d$/.test(raw) ? null : "זמן בפורמט דקות:שניות (12:30)";
  if (cell.inputType === "count") return /^\d{1,3}$/.test(raw) ? null : "מספר שלם";
  return Number(raw) >= 1 && Number(raw) <= 100 ? null : "ציון בין 1 ל־100";
}

const iconButtonClass =
  "inline-flex h-7 w-7 items-center justify-center rounded-full text-text-muted transition hover:bg-surface-1 hover:text-text-primary disabled:opacity-50";

function ExamInput({
  cell,
  value,
  onChange,
}: {
  cell: ExamCell;
  value: string;
  onChange: (value: string) => void;
}) {
  const error = draftError(cell, value.trim());
  const pass = error ? null : draftPass(cell, value.trim());
  return (
    <div className="relative">
      <input
        dir="ltr"
        inputMode={cell.inputType === "time" ? "numeric" : "decimal"}
        placeholder="—"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={TEST_LABEL.get(cell.key)}
        aria-invalid={error ? true : undefined}
        title={error ?? undefined}
        className={`ui-field h-11 w-full rounded-xl bg-surface-1 ps-3 pe-9 text-center text-base font-extrabold tabular-nums text-text-primary outline-none transition placeholder:font-semibold placeholder:text-text-muted/50 ${
          error ? "!shadow-[inset_0_0_0_1.5px_rgb(244_63_94)]" : ""
        }`}
      />
      <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center">
        <PassMark pass={pass} />
      </span>
    </div>
  );
}

/** Roomy editor for all exam attempts, grouped like the card. */
function ExamsEditor({
  groups,
  drafts,
  setDraft,
}: {
  groups: ExamGroup[];
  drafts: Record<string, string>;
  setDraft: (key: string, value: string) => void;
}) {
  return (
    <div className="space-y-5">
      {groups.map((group) => {
        const tone = GROUP_TONE[group.id];
        const Icon = group.icon;
        const families = EXAM_GROUPS.find((entry) => entry.id === group.id)!.columns;
        return (
          <section key={group.id} className={`rounded-2xl ${tone.soft} p-3 ring-1 ring-black/[0.04] dark:ring-white/[0.06] sm:p-4`}>
            <div className="mb-3 flex items-center gap-2">
              <Icon size={17} className={tone.icon} />
              <h3 className="text-[15px] font-extrabold text-text-primary">{group.title}</h3>
            </div>
            <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-3 gap-y-2 sm:grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1fr)]">
              <span />
              {group.columns.map((column, index) => (
                <div key={column.label} className="text-center">
                  <p className="text-[13px] font-extrabold text-text-primary">{column.label}</p>
                  <p className="text-[11px] font-semibold text-text-muted" dir="rtl">
                    {FAMILY_HINT[families[index].family]}
                  </p>
                </div>
              ))}
              {ATTEMPTS.map((attempt, index) => (
                <Fragment key={attempt}>
                  <span className="text-[13px] font-bold text-text-secondary">מבחן {attempt}</span>
                  {group.columns.map((column) => {
                    const cell = column.cells[index];
                    return cell ? (
                      <ExamInput
                        key={cell.key}
                        cell={cell}
                        value={drafts[cell.key] ?? ""}
                        onChange={(value) => setDraft(cell.key, value)}
                      />
                    ) : (
                      <span key={column.label} />
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** Staff view of the candidate's exams (shared across stages), editable in a modal. */
export function CandidateExamsCard({
  candidateId,
  prepDays,
  examResults,
  documents = [],
  canEdit = false,
  canApprove = false,
  onSaved,
}: {
  candidateId: string;
  prepDays: AgamPrepDayEvaluation[];
  examResults: AgamExamResult[];
  documents?: AgamDocument[];
  canEdit?: boolean;
  canApprove?: boolean;
  onSaved?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sportsOpen, setSportsOpen] = useState(false);
  const pendingSports = pendingSportsResultPhotos(documents);
  const resultByKey = new Map(examResults.map((result) => [result.test_key, result]));
  const prepMikra = byRecency(prepDays).find((row) => row.mikra_score != null)?.mikra_score ?? null;

  const groups = buildExamGroups((test): ExamCell => {
    const result = resultByKey.get(test.key);
    const value = examResultValue(result);
    if (test.key === "mikraot_israel_1" && value == null && prepMikra != null) {
      return { key: test.key, inputType: test.inputType, value: String(prepMikra), pass: computeThresholdPass(test.key, { score: prepMikra }) };
    }
    return { key: test.key, inputType: test.inputType, value, pass: result?.pass ?? null };
  });
  const cells = groups.flatMap((group) => group.columns.flatMap((column) => column.cells));
  const lastUpdate = [...examResults].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];

  const startEdit = () => {
    setDrafts(Object.fromEntries(cells.map((cell) => [cell.key, examResultValue(resultByKey.get(cell.key)) ?? ""])));
    setEditing(true);
  };

  const save = async () => {
    const invalid = cells.find((cell) => draftError(cell, (drafts[cell.key] ?? "").trim()));
    if (invalid) {
      toast.error(draftError(invalid, (drafts[invalid.key] ?? "").trim()));
      return;
    }
    const changed = cells
      .map((cell) => ({ testKey: cell.key, value: (drafts[cell.key] ?? "").trim() || null }))
      .filter((row) => row.value !== examResultValue(resultByKey.get(row.testKey)));
    if (changed.length === 0) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await agamFetch(`/api/agam/candidates/${candidateId}/exam-results`, {
        method: "PUT",
        body: JSON.stringify({ results: changed }),
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

  return (
    <>
      <ExamsBoard
        groups={groups}
        action={
          canEdit ? (
            <button type="button" className={iconButtonClass} onClick={startEdit} aria-label="עדכון מבחנים" title="עדכון">
              <Pencil size={13} />
            </button>
          ) : null
        }
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
      />
      <Modal
        open={editing}
        onClose={() => (saving ? undefined : setEditing(false))}
        title="עדכון תוצאות מבחנים"
        subtitle={
          lastUpdate?.updated_by_name
            ? `תוצאות משותפות לכל שלבי המיון · עודכן לאחרונה ע״י ${lastUpdate.updated_by_name}`
            : "תוצאות משותפות לכל שלבי המיון"
        }
        icon={<ClipboardCheck size={18} />}
        size="md"
        footer={
          <>
            <button type="button" className={secondaryButtonClass} onClick={() => setEditing(false)} disabled={saving}>
              ביטול
            </button>
            <button type="button" className={primaryButtonClass} onClick={() => void save()} disabled={saving}>
              {saving ? "שומר…" : "שמירה"}
            </button>
          </>
        }
      >
        <ExamsEditor
          groups={groups}
          drafts={drafts}
          setDraft={(key, value) => setDrafts((current) => ({ ...current, [key]: value }))}
        />
      </Modal>
      <Modal open={sportsOpen} onClose={() => setSportsOpen(false)} title="תוצאות ספורט" size="lg">
        <SportsResultsPhotos documents={documents} canApprove={canApprove} onSaved={onSaved} />
      </Modal>
    </>
  );
}
