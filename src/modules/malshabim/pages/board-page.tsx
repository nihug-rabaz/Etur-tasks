"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { toast } from "sonner";
import {
  CANDIDATE_STATUSES,
  STATUS_COLORS,
  filterCandidates,
  normalizeCandidateStatus,
  type MalshabimCandidateFilters,
} from "@/modules/malshabim/lib/status";
import { RECRUITMENT_TRACKS, REQUEST_TYPES } from "@/modules/malshabim/lib/question-bank";
import { malshabimFetch } from "@/modules/malshabim/lib/fetch";
import {
  cardClass,
  chipActiveClass,
  chipIdleClass,
  pageShellClass,
  pageSubtitleClass,
  pageTitleClass,
  panelClass,
  searchClass,
  selectClass,
} from "@/modules/malshabim/lib/ui";
import type {
  MalshabimCandidate,
  MalshabimCandidateStatus,
} from "@/modules/malshabim/types";
import type { ModuleRole } from "@/shared/modules/types";

function asSelectedList(value: string | string[] | undefined): string[] {
  if (!value || value === "all") return [];
  return Array.isArray(value) ? value : [value];
}

function toggleFilterValue(
  current: string | string[] | undefined,
  value: string,
): string[] {
  const list = asSelectedList(current);
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function MalshabimBoardPage({
  initialCandidates,
  initialRole,
}: {
  initialCandidates: MalshabimCandidate[];
  initialRole: ModuleRole;
}) {
  const canEdit = initialRole === "admin" || initialRole === "user";
  const [candidates, setCandidates] = useState(
    initialCandidates.filter((c) => !c.is_draft),
  );
  const [filters, setFilters] = useState<MalshabimCandidateFilters>({
    search: "",
    track: "all",
    candidateStatus: [],
    requestType: [],
  });

  const filtered = useMemo(
    () => filterCandidates(candidates, filters),
    [candidates, filters],
  );

  const columns = useMemo(() => {
    const map = Object.fromEntries(
      CANDIDATE_STATUSES.map((status) => [status, [] as MalshabimCandidate[]]),
    ) as Record<MalshabimCandidateStatus, MalshabimCandidate[]>;
    for (const candidate of filtered) {
      const status = normalizeCandidateStatus(candidate.candidate_status);
      map[status].push(candidate);
    }
    return map;
  }, [filtered]);

  const setFilter = <K extends keyof MalshabimCandidateFilters>(
    key: K,
    value: MalshabimCandidateFilters[K],
  ) => setFilters((prev) => ({ ...prev, [key]: value }));

  const selectedStatuses = asSelectedList(filters.candidateStatus);
  const selectedRequestTypes = asSelectedList(filters.requestType);
  const filtersActive =
    Boolean(filters.search?.trim()) ||
    (filters.track && filters.track !== "all") ||
    selectedStatuses.length > 0 ||
    selectedRequestTypes.length > 0;

  const clearFilters = () =>
    setFilters({ search: "", track: "all", candidateStatus: [], requestType: [] });

  const moveTo = async (id: string, status: MalshabimCandidateStatus) => {
    if (!canEdit) return;
    const prev = candidates;
    setCandidates((list) =>
      list.map((c) => (c.id === id ? { ...c, candidate_status: status } : c)),
    );
    try {
      await malshabimFetch(`/api/malshabim/candidates/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          candidate_status: status,
          update_log_entry: {
            changes: `סטטוס עודכן ל: ${status}`,
          },
        }),
      });
    } catch {
      setCandidates(prev);
      toast.error("עדכון סטטוס נכשל");
    }
  };

  const visibleStatuses =
    selectedStatuses.length > 0
      ? CANDIDATE_STATUSES.filter((status) => selectedStatuses.includes(status))
      : CANDIDATE_STATUSES;

  return (
    <div className={pageShellClass} dir="rtl">
      <div className={`${panelClass} space-y-4 p-4 sm:p-5`}>
        <div>
          <h1 className={pageTitleClass}>לוח עבודה</h1>
          <p className={pageSubtitleClass}>
            עמודות לפי סטטוס{canEdit ? " — לחצו על סטטוס לשינוי" : ""} ·{" "}
            {filtered.length} מועמדים
          </p>
        </div>

        <div className="space-y-3">
          <div className="relative flex items-center">
            <Search
              className="pointer-events-none absolute start-4 h-4 w-4 text-text-muted"
              aria-hidden
            />
            <input
              className={searchClass}
              placeholder="חיפוש לפי שם, טלפון, ת.ז, עיר…"
              value={filters.search || ""}
              onChange={(e) => setFilter("search", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <select
              className={`${selectClass} sm:max-w-[12rem]`}
              value={typeof filters.track === "string" ? filters.track : "all"}
              onChange={(e) => setFilter("track", e.target.value)}
              aria-label="מסלול"
            >
              <option value="all">כל המסלולים</option>
              {RECRUITMENT_TRACKS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <div className="flex flex-1 flex-wrap gap-1.5">
              {CANDIDATE_STATUSES.map((status) => {
                const activeChip = selectedStatuses.includes(status);
                return (
                  <button
                    key={status}
                    type="button"
                    className={activeChip ? chipActiveClass : chipIdleClass}
                    onClick={() =>
                      setFilter(
                        "candidateStatus",
                        toggleFilterValue(filters.candidateStatus, status),
                      )
                    }
                  >
                    {status}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {REQUEST_TYPES.map((type) => {
                const activeChip = selectedRequestTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    className={activeChip ? chipActiveClass : chipIdleClass}
                    onClick={() =>
                      setFilter("requestType", toggleFilterValue(filters.requestType, type))
                    }
                  >
                    {type}
                  </button>
                );
              })}
            </div>
            {filtersActive ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full bg-surface-2/80 px-3 py-2 text-xs font-bold text-text-secondary transition hover:bg-surface-2 sm:ms-auto"
                onClick={clearFilters}
              >
                <X className="h-3.5 w-3.5" /> נקה
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {visibleStatuses.map((status) => (
          <section
            key={status}
            className={`${cardClass} flex min-h-[280px] flex-col overflow-hidden`}
          >
            <header
              className={`flex items-center justify-between gap-2 px-3 py-3 sm:px-4 ${STATUS_COLORS[status]}`}
            >
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white">
                {status}
              </span>
              <span className="text-xs font-bold text-white/90">
                {columns[status].length}
              </span>
            </header>
            <ul className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
              {columns[status].map((candidate) => (
                <li
                  key={candidate.id}
                  className="rounded-2xl bg-surface-1 p-3 shadow-sm"
                >
                  <Link
                    href={`/malshabim/candidates/${candidate.id}`}
                    className="block text-sm font-bold text-text-primary hover:text-accent-primary"
                  >
                    {candidate.full_name || "ללא שם"}
                  </Link>
                  <p className="mt-1 text-xs font-medium text-text-muted">
                    #{candidate.serial_number ?? "—"} · {candidate.city || "—"}
                  </p>
                  {canEdit ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {CANDIDATE_STATUSES.filter((s) => s !== status).map((next) => (
                        <button
                          key={next}
                          type="button"
                          className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-bold text-text-secondary transition hover:bg-surface-2/80 hover:text-text-primary"
                          onClick={() => void moveTo(candidate.id, next)}
                        >
                          {next}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
