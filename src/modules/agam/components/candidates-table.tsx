"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  Archive,
  AlertTriangle,
  Award,
  CalendarCheck,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Gavel,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import {
  buildCandidateListExportColumns,
  buildCandidateListExportRow,
  downloadExcel,
} from "@/modules/agam/lib/csv";
import type { AgamQuestion } from "@/modules/agam/types";
import { STAGE_VIEWS, STATUS_LABELS, STATUS_TONES } from "@/modules/agam/lib/stages";
import {
  dividerClass,
  dividerTopClass,
  fieldClass,
  panelClass,
  secondaryButtonClass,
} from "@/modules/agam/lib/ui";
import type { AgamCandidate, AgamStageKey, AgamStageSummary } from "@/modules/agam/types";

const RANK_COLOR_LABELS: Record<string, string> = {
  green: "ירוק",
  orange: "כתום",
  red: "אדום",
};

const ghostIconClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition hover:bg-surface-2 hover:text-text-primary";

const ghostDangerClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition hover:bg-rose-500/10 hover:text-rose-700";

function candidateInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`;
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
        active ? "text-text-primary" : "text-text-muted hover:text-text-primary hover:bg-surface-2/80"
      }`}
    >
      {children}
      {active ? <span className="absolute inset-x-2.5 -bottom-px h-0.5 rounded-full bg-text-primary" /> : null}
    </button>
  );
}

export function AgamCandidatesTable({
  candidates,
  isRamad,
  isAdmin,
  showArchived,
  onChanged,
}: {
  candidates: AgamCandidate[];
  isRamad: boolean;
  isAdmin: boolean;
  showArchived: boolean;
  onChanged: () => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [stageView, setStageView] = useState<AgamStageKey | "overview">("overview");
  const [summaryCache, setSummaryCache] = useState<
    Partial<Record<AgamStageKey, Record<string, AgamStageSummary>>>
  >({});
  const [loadingSummary, setLoadingSummary] = useState(false);
  const loadedStages = useRef(new Set<AgamStageKey>());

  const loadStage = async (stage: AgamStageKey) => {
    if (loadedStages.current.has(stage)) return;
    loadedStages.current.add(stage);
    setLoadingSummary(true);
    try {
      const data = await agamFetch<{ map: Record<string, AgamStageSummary> }>(
        `/api/agam/stage-summaries?stage=${stage}`,
      );
      setSummaryCache((prev) => ({ ...prev, [stage]: data.map ?? {} }));
    } catch {
      loadedStages.current.delete(stage);
      toast.error("טעינת סיכומי השלב נכשלה");
    } finally {
      setLoadingSummary(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidates.filter((row) => {
      const matchesQuery =
        !q ||
        row.full_name.toLowerCase().includes(q) ||
        row.personal_number.toLowerCase().includes(q) ||
        (row.cycle_name ?? "").toLowerCase().includes(q);
      const matchesStatus = status === "all" || row.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [candidates, query, status]);

  const activeView = STAGE_VIEWS.find((view) => view.key === stageView);

  const statusCounts = useMemo(() => {
    const counts = { all: candidates.length, pending: 0, passed: 0, not_passed: 0 };
    for (const row of candidates) {
      if (row.status === "pending") counts.pending += 1;
      else if (row.status === "passed") counts.passed += 1;
      else if (row.status === "not_passed") counts.not_passed += 1;
    }
    return counts;
  }, [candidates]);

  return (
    <div className="space-y-5">
      <section className={`${panelClass} p-4 sm:p-5`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <input
            className={`${fieldClass} lg:max-w-sm`}
            placeholder="חיפוש לפי שם, מספר אישי או מחזור"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            {isRamad ? (
              <>
                <Link
                  href={showArchived ? "/agam/candidates" : "/agam/candidates/archive"}
                  className={secondaryButtonClass}
                >
                  {showArchived ? "פעילים" : "ארכיון"}
                </Link>
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => {
                    void (async () => {
                      try {
                        const { questions } = await agamFetch<{ questions: AgamQuestion[] }>(
                          "/api/agam/questions",
                        );
                        const questionnaireKeys = [
                          ...new Set(
                            filtered.flatMap((row) =>
                              Object.keys((row.questionnaire_data ?? {}) as Record<string, unknown>),
                            ),
                          ),
                        ];
                        const columns = buildCandidateListExportColumns(questions ?? [], questionnaireKeys);
                        const rows = filtered.map((candidate) =>
                          buildCandidateListExportRow(candidate, questionnaireKeys),
                        );
                        downloadExcel(
                          `candidates_${new Date().toISOString().slice(0, 10)}.xlsx`,
                          rows,
                          columns,
                        );
                      } catch {
                        toast.error("ייצוא לאקסל נכשל");
                      }
                    })();
                  }}
                >
                  <FileSpreadsheet size={14} />
                  ייצוא
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div className={`mt-4 flex flex-wrap items-center gap-1 pt-4 ${dividerTopClass}`}>
          {(
            [
              ["all", "הכל", statusCounts.all],
              ["pending", "ממתין", statusCounts.pending],
              ["passed", "עבר", statusCounts.passed],
              ["not_passed", "לא עבר", statusCounts.not_passed],
            ] as const
          ).map(([value, label, count]) => (
            <FilterChip key={value} active={status === value} onClick={() => setStatus(value)}>
              {label}
              <span className="ms-1.5 text-[10px] font-semibold text-text-muted">{count}</span>
            </FilterChip>
          ))}
        </div>
      </section>

      <section className={`${panelClass} overflow-hidden`}>
        <div className={`flex gap-1 overflow-x-auto px-4 pt-3 sm:px-5 ${dividerClass}`}>
          <FilterChip active={stageView === "overview"} onClick={() => setStageView("overview")}>
            סקירה
          </FilterChip>
          {STAGE_VIEWS.map((stage) => (
            <FilterChip
              key={stage.key}
              active={stageView === stage.key}
              onClick={() => {
                setStageView(stage.key);
                void loadStage(stage.key);
              }}
            >
              {stage.label}
            </FilterChip>
          ))}
        </div>

        <div className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-text-muted">
              {filtered.length} מועמדים
              {activeView ? ` · ${activeView.columnHeader}` : ""}
              {loadingSummary ? " · טוען…" : ""}
            </p>
          </div>

          {filtered.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-sm font-semibold text-text-primary">לא נמצאו מועמדים</p>
              <p className="mt-1 text-xs text-text-muted">נסו לשנות חיפוש או סינון</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((candidate) => {
                const summary = stageView === "overview" ? null : summaryCache[stageView]?.[candidate.id];
                const exceptional =
                  (candidate.planning_index === 1 || candidate.planning_index === 2) &&
                  candidate.dapar != null &&
                  candidate.dapar < 30;

                return (
                  <article
                    key={candidate.id}
                    className="group flex flex-col rounded-2xl bg-surface-2/50 p-4 transition hover:bg-surface-2"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-1 text-xs font-extrabold tracking-wide text-text-primary shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--text-primary)_8%,transparent)]"
                        aria-hidden
                      >
                        {candidateInitials(candidate.full_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/agam/candidates/${candidate.id}`}
                            className="truncate text-sm font-extrabold text-text-primary transition hover:opacity-70"
                          >
                            {candidate.full_name}
                          </Link>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_TONES[candidate.status]}`}
                          >
                            {STATUS_LABELS[candidate.status]}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs text-text-muted" dir="ltr">
                          {candidate.personal_number}
                          {candidate.phone ? ` · ${candidate.phone}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs">
                      <div className="flex justify-between gap-2">
                        <span className="text-text-muted">מחזור</span>
                        <span className="truncate font-semibold text-text-primary">
                          {candidate.cycle_name || "—"}
                        </span>
                      </div>
                      {candidate.rank_color ? (
                        <div className="flex justify-between gap-2">
                          <span className="text-text-muted">דירוג</span>
                          <span className="font-semibold text-text-primary">
                            {RANK_COLOR_LABELS[candidate.rank_color] ?? candidate.rank_color}
                          </span>
                        </div>
                      ) : null}
                      {exceptional ? (
                        <div className="flex items-center gap-1.5 pt-0.5 font-semibold text-text-primary">
                          <AlertTriangle size={12} className="text-rose-600" />
                          חריג
                        </div>
                      ) : null}
                      {stageView !== "overview" ? (
                        <p className="pt-1 text-xs text-text-secondary">
                          {summary ? (
                            <>
                              {summary.text}
                              {summary.detail ? (
                                <span className="ms-1 text-text-muted">{summary.detail}</span>
                              ) : null}
                            </>
                          ) : (
                            <span className="text-text-muted">אין נתונים</span>
                          )}
                        </p>
                      ) : null}
                    </div>

                    <CandidateActionBar
                      candidate={candidate}
                      canDecide={isRamad || isAdmin}
                      isRamad={isRamad}
                      isAdmin={isAdmin}
                      onChanged={onChanged}
                    />
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function CandidateActionBar({
  candidate,
  canDecide,
  isRamad,
  isAdmin,
  onChanged,
}: {
  candidate: AgamCandidate;
  canDecide: boolean;
  isRamad: boolean;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const actions = [
    {
      href: `/agam/candidates/${candidate.id}/evaluation`,
      label: "הערכה",
      icon: CalendarCheck,
    },
    { href: `/agam/candidates/${candidate.id}?stage=preparation_day`, label: "מכין", icon: FileText },
    { href: `/agam/candidates/${candidate.id}?stage=smach`, label: "סמ״ח", icon: Award },
    { href: `/agam/candidates/${candidate.id}?stage=documents`, label: "מסמכים", icon: FolderOpen },
    {
      href: `/agam/candidates/${candidate.id}?stage=final_decision`,
      label: "החלטה",
      icon: Gavel,
      disabled: !canDecide,
    },
  ];

  const handleExport = () => {
    void (async () => {
      try {
        const { questions } = await agamFetch<{ questions: AgamQuestion[] }>("/api/agam/questions");
        const questionnaire = (candidate.questionnaire_data ?? {}) as Record<string, unknown>;
        const questionnaireKeys = Object.keys(questionnaire);
        const columns = buildCandidateListExportColumns(questions ?? [], questionnaireKeys);
        const row = buildCandidateListExportRow(candidate, questionnaireKeys);
        downloadExcel(`${candidate.full_name}_${candidate.personal_number}.xlsx`, [row], columns);
      } catch {
        toast.error("ייצוא לאקסל נכשל");
      }
    })();
  };

  return (
    <div className={`mt-4 flex items-center justify-between gap-2 pt-3 ${dividerTopClass}`}>
      <Link
        href={`/agam/candidates/${candidate.id}`}
        className="text-xs font-bold text-text-primary transition hover:opacity-70"
      >
        פתח תיק
      </Link>

      <div className="flex items-center gap-0.5">
        {actions.map((action) => {
          const Icon = action.icon;
          if (action.disabled) {
            return (
              <span
                key={action.label}
                className={`${ghostIconClass} pointer-events-none opacity-25`}
                title={action.label}
                aria-label={action.label}
              >
                <Icon size={14} />
              </span>
            );
          }
          return (
            <Link
              key={action.label}
              href={action.href}
              className={ghostIconClass}
              title={action.label}
              aria-label={action.label}
            >
              <Icon size={14} />
            </Link>
          );
        })}
        <button type="button" onClick={handleExport} className={ghostIconClass} title="אקסל" aria-label="אקסל">
          <FileSpreadsheet size={14} />
        </button>
        {isRamad ? (
          <button
            type="button"
            className={ghostIconClass}
            title={candidate.archived ? "החזרה מארכיון" : "העברה לארכיון"}
            aria-label={candidate.archived ? "החזרה מארכיון" : "העברה לארכיון"}
            onClick={async () => {
              await agamFetch(`/api/agam/candidates/${candidate.id}`, {
                method: "PATCH",
                body: JSON.stringify({ archived: !candidate.archived }),
              });
              toast.success(candidate.archived ? "הוחזר מארכיון" : "הועבר לארכיון");
              onChanged();
            }}
          >
            <Archive size={14} />
          </button>
        ) : null}
        {isAdmin ? (
          <button
            type="button"
            className={ghostDangerClass}
            title="מחיקת מועמד"
            aria-label="מחיקת מועמד"
            onClick={async () => {
              if (!confirm("למחוק מועמד?")) return;
              await agamFetch(`/api/agam/candidates/${candidate.id}`, { method: "DELETE" });
              toast.success("המועמד נמחק");
              onChanged();
            }}
          >
            <Trash2 size={14} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
