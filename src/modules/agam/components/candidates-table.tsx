"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  Archive,
  Award,
  CalendarCheck,
  FileText,
  FolderOpen,
  Gavel,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { BASIC_CANDIDATE_COLUMNS, downloadCsv, rowsToCsv } from "@/modules/agam/lib/csv";
import { STAGE_VIEWS, STATUS_LABELS, STATUS_TONES } from "@/modules/agam/lib/stages";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/modules/agam/lib/ui";
import type { AgamCandidate, AgamStageKey, AgamStageSummary } from "@/modules/agam/types";

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

  return (
    <div className="space-y-4">
      <div className="dashboard-glass flex flex-col gap-3 rounded-3xl p-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          className={`${fieldClass} sm:max-w-sm`}
          placeholder="חיפוש לפי שם או מספר אישי"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {[
            ["all", "הכל"],
            ["pending", "ממתין"],
            ["passed", "עבר"],
            ["not_passed", "לא עבר"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={status === value ? primaryButtonClass : secondaryButtonClass}
              onClick={() => setStatus(value)}
            >
              {label}
            </button>
          ))}
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
                  const csv = rowsToCsv(
                    filtered.map((row) => ({
                      full_name: row.full_name,
                      personal_number: row.personal_number,
                      phone: row.phone,
                      status: row.status,
                      ramad_notes: row.ramad_notes,
                    })),
                    BASIC_CANDIDATE_COLUMNS.filter((field) => field.key !== "ramad_notes"),
                  );
                  downloadCsv("candidates.csv", csv);
                }}
              >
                CSV
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={stageView === "overview" ? primaryButtonClass : secondaryButtonClass}
          onClick={() => setStageView("overview")}
        >
          סקירה
        </button>
        {STAGE_VIEWS.map((stage) => (
          <button
            key={stage.key}
            type="button"
            className={stageView === stage.key ? primaryButtonClass : secondaryButtonClass}
            onClick={() => {
              setStageView(stage.key);
              void loadStage(stage.key);
            }}
          >
            {stage.label}
          </button>
        ))}
      </div>

      <div className="dashboard-glass overflow-hidden rounded-3xl">
        {activeView ? (
          <div className="border-b border-black/8 px-4 py-2 text-xs text-text-muted dark:border-white/10">
            {activeView.columnHeader}
            {loadingSummary ? " · טוען…" : null}
          </div>
        ) : null}
        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-sm text-text-muted">לא נמצאו מועמדים.</p>
        ) : (
          filtered.map((candidate) => {
            const summary = stageView === "overview" ? null : summaryCache[stageView]?.[candidate.id];
            return (
              <div
                key={candidate.id}
                className="grid gap-3 border-b border-black/8 px-4 py-4 last:border-b-0 dark:border-white/10 md:grid-cols-[1.3fr_1fr_0.7fr_1fr_2fr_auto] md:items-center"
              >
                <div>
                  <p className="font-bold text-text-primary">{candidate.full_name}</p>
                  {candidate.cycle_name ? (
                    <p className="text-xs font-semibold text-accent-primary">{candidate.cycle_name}</p>
                  ) : null}
                  {candidate.phone ? (
                    <p className="text-xs text-text-muted" dir="ltr">
                      {candidate.phone}
                    </p>
                  ) : null}
                </div>
                <p className="text-sm" dir="ltr">
                  {candidate.personal_number}
                </p>
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${STATUS_TONES[candidate.status]}`}>
                  {STATUS_LABELS[candidate.status]}
                </span>
                <div className="text-sm">
                  {stageView === "overview" ? (
                    <span className="text-text-muted">—</span>
                  ) : summary ? (
                    <div>
                      <p className="font-bold">{summary.text}</p>
                      {summary.detail ? (
                        <p className="text-xs text-text-muted">{summary.detail}</p>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-text-muted">אין נתונים</span>
                  )}
                </div>
                <CandidateActionBar candidateId={candidate.id} canDecide={isRamad || isAdmin} />
                <div className="flex gap-1">
                  {isRamad ? (
                    <button
                      type="button"
                      className={secondaryButtonClass}
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
                      className="inline-flex items-center justify-center rounded-xl bg-rose-500/15 px-3 py-2.5 text-sm font-bold text-rose-700"
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
          })
        )}
      </div>
    </div>
  );
}

function CandidateActionBar({
  candidateId,
  canDecide,
}: {
  candidateId: string;
  canDecide: boolean;
}) {
  const actions = [
    { href: `/agam/candidates/${candidateId}`, label: "תיק", icon: UserRound },
    {
      href: `/agam/candidates/${candidateId}/evaluation`,
      label: "הערכה",
      icon: CalendarCheck,
    },
    { href: `/agam/candidates/${candidateId}?stage=preparation_day`, label: "מכין", icon: FileText },
    { href: `/agam/candidates/${candidateId}?stage=smach`, label: "סמ״ח", icon: Award },
    { href: `/agam/candidates/${candidateId}?stage=documents`, label: "מסמכים", icon: FolderOpen },
    {
      href: `/agam/candidates/${candidateId}?stage=final_decision`,
      label: "החלטה",
      icon: Gavel,
      disabled: !canDecide,
    },
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {actions.map((action) => {
        const Icon = action.icon;
        if (action.disabled) {
          return (
            <span
              key={action.label}
              className="inline-flex items-center gap-1 rounded-lg bg-surface-2 px-2 py-1 text-[11px] font-bold text-text-muted opacity-50"
            >
              <Icon size={12} />
              {action.label}
            </span>
          );
        }
        return (
          <Link
            key={action.label}
            href={action.href}
            className="inline-flex items-center gap-1 rounded-lg bg-surface-2 px-2 py-1 text-[11px] font-bold text-text-primary hover:bg-accent-primary/12 hover:text-accent-primary"
          >
            <Icon size={12} />
            {action.label}
          </Link>
        );
      })}
    </div>
  );
}
