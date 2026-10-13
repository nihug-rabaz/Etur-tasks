"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Download,
  FileSpreadsheet,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  CANDIDATE_STATUSES,
  STATUS_BADGE_CLASS,
  STATUS_COLORS,
  filterCandidates,
  normalizeCandidateStatus,
  type MalshabimCandidateFilters,
} from "@/modules/malshabim/lib/status";
import { RECRUITMENT_TRACKS, REQUEST_TYPES } from "@/modules/malshabim/lib/question-bank";
import { downloadCandidatesCsv } from "@/modules/malshabim/lib/csv";
import {
  exportTemplate,
  parseTemplateFile,
  templateRowsToImportPayload,
} from "@/modules/malshabim/lib/excel-template";
import { malshabimFetch } from "@/modules/malshabim/lib/fetch";
import {
  cardClass,
  chipActiveClass,
  chipIdleClass,
  emptyStateClass,
  pageShellClass,
  pageSubtitleClass,
  pageTitleClass,
  panelClass,
  primaryButtonClass,
  searchClass,
  secondaryButtonClass,
  selectClass,
  tableHeadClass,
  tableRowClass,
} from "@/modules/malshabim/lib/ui";
import type { MalshabimCandidate, MalshabimCandidateStatus } from "@/modules/malshabim/types";
import type { ModuleRole } from "@/shared/modules/types";

function canEditRole(role: ModuleRole | null): boolean {
  return role === "admin" || role === "user";
}

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

export function MalshabimHomePage({
  initialCandidates,
  initialRole,
}: {
  initialCandidates: MalshabimCandidate[];
  initialRole: ModuleRole;
}) {
  const canEdit = canEditRole(initialRole);
  const isAdmin = initialRole === "admin";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const [importing, setImporting] = useState(false);
  const [candidates, setCandidates] = useState(initialCandidates);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [filters, setFilters] = useState<MalshabimCandidateFilters>({
    search: "",
    track: "all",
    candidateStatus: [],
    requestType: [],
  });

  const drafts = useMemo(
    () => candidates.filter((c) => c.is_draft),
    [candidates],
  );
  const active = useMemo(
    () => candidates.filter((c) => !c.is_draft),
    [candidates],
  );
  /** Table follows chip filters only — search opens a popup instead. */
  const filtered = useMemo(
    () =>
      filterCandidates(active, {
        track: filters.track,
        candidateStatus: filters.candidateStatus,
        requestType: filters.requestType,
      }),
    [active, filters.track, filters.candidateStatus, filters.requestType],
  );
  const searchQuery = (filters.search || "").trim();
  const searchHits = useMemo(
    () =>
      searchQuery.length >= 1
        ? filterCandidates(active, { search: searchQuery }).slice(0, 25)
        : [],
    [active, searchQuery],
  );

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!searchBoxRef.current?.contains(event.target as Node)) setSearchOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, []);

  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(
      CANDIDATE_STATUSES.map((status) => [status, 0]),
    ) as Record<MalshabimCandidateStatus, number>;
    for (const c of active) {
      counts[normalizeCandidateStatus(c.candidate_status)] += 1;
    }
    return counts;
  }, [active]);

  const stats = {
    total: active.length,
    drafts: drafts.length,
    quizPassed: active.filter((c) => c.quiz_passed).length,
    quizFailed: active.filter((c) => !c.quiz_passed).length,
  };

  const setFilter = <K extends keyof MalshabimCandidateFilters>(
    key: K,
    value: MalshabimCandidateFilters[K],
  ) => setFilters((prev) => ({ ...prev, [key]: value }));

  const selectedStatuses = asSelectedList(filters.candidateStatus);
  const selectedRequestTypes = asSelectedList(filters.requestType);
  const filtersActive =
    Boolean(searchQuery) ||
    (filters.track && filters.track !== "all") ||
    selectedStatuses.length > 0 ||
    selectedRequestTypes.length > 0;
  const showSearchPanel = searchOpen && searchQuery.length >= 1;

  const clearFilters = () => {
    setFilters({ search: "", track: "all", candidateStatus: [], requestType: [] });
    setSearchOpen(false);
  };

  const toggleStatusFilter = (status: MalshabimCandidateStatus) => {
    setFilter("candidateStatus", toggleFilterValue(filters.candidateStatus, status));
  };

  const deleteDraft = async (id: string) => {
    if (!canEdit) return;
    if (!window.confirm("למחוק את הטיוטה?")) return;
    setDeletingId(id);
    try {
      await malshabimFetch(`/api/malshabim/candidates/${id}`, { method: "DELETE" });
      setCandidates((list) => list.filter((c) => c.id !== id));
      toast.success("הטיוטה נמחקה");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "מחיקה נכשלה");
    } finally {
      setDeletingId(null);
    }
  };

  const onImportFile = async (file: File | null) => {
    if (!file || !isAdmin) return;
    setImporting(true);
    try {
      const rows = await parseTemplateFile(file);
      const payload = templateRowsToImportPayload(rows);
      if (payload.length === 0) {
        toast.error("לא נמצאו שורות לייבוא");
        return;
      }
      const result = await malshabimFetch<{
        inserted?: number;
        updated?: number;
        skipped?: number;
      }>("/api/malshabim/import", {
        method: "POST",
        body: JSON.stringify({ candidates: payload }),
      });
      toast.success(
        `ייבוא הושלם · נוספו ${result.inserted ?? 0} · עודכנו ${result.updated ?? 0} · דולגו ${result.skipped ?? 0}`,
      );
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ייבוא נכשל");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className={pageShellClass} dir="rtl">
      <div className={`${panelClass} relative z-20 min-w-0 overflow-visible p-4 sm:p-5`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h1 className={pageTitleClass}>מלש״בים</h1>
            <p className={pageSubtitleClass}>
              {filtered.length} מועמדים מוצגים · {stats.total} פעילים
            </p>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            {canEdit ? (
              <Link href="/malshabim/interview" className={primaryButtonClass}>
                <Plus className="h-4 w-4" /> ראיון חדש
              </Link>
            ) : null}
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => downloadCandidatesCsv(filtered)}
            >
              <Download className="h-4 w-4" /> ייצוא CSV
            </button>
            {canEdit ? (
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => exportTemplate()}
              >
                <FileSpreadsheet className="h-4 w-4" /> ייצא תבנית
              </button>
            ) : null}
            {isAdmin ? (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => void onImportFile(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  className={secondaryButtonClass}
                  disabled={importing}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  {importing ? "מייבא…" : "ייבא אקסל"}
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-4 min-w-0 space-y-3">
          <div className="relative z-30" ref={searchBoxRef}>
            <div className="relative flex items-center">
              <Search
                className="pointer-events-none absolute start-4 h-4 w-4 text-text-muted"
                aria-hidden
              />
              <input
                className={searchClass}
                placeholder="חיפוש לפי שם, טלפון, ת.ז, עיר…"
                value={filters.search || ""}
                onChange={(e) => {
                  setFilter("search", e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                aria-expanded={showSearchPanel}
                aria-controls="malshabim-search-results"
                autoComplete="off"
              />
              {searchQuery ? (
                <button
                  type="button"
                  className="absolute end-3 rounded-full p-1 text-text-muted transition hover:bg-surface-2 hover:text-text-primary"
                  aria-label="נקה חיפוש"
                  onClick={() => {
                    setFilter("search", "");
                    setSearchOpen(false);
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            {showSearchPanel ? (
              <div
                id="malshabim-search-results"
                role="listbox"
                className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 max-h-80 overflow-y-auto rounded-2xl border border-border-weak bg-surface-1 p-2 shadow-xl shadow-black/10"
              >
                {searchHits.length === 0 ? (
                  <p className="px-3 py-4 text-center text-sm font-medium text-text-muted">
                    לא נמצאו תוצאות
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {searchHits.map((c) => {
                      const status = normalizeCandidateStatus(c.candidate_status);
                      return (
                        <li key={c.id}>
                          <Link
                            href={`/malshabim/candidates/${c.id}`}
                            role="option"
                            className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition hover:bg-surface-2"
                            onClick={() => setSearchOpen(false)}
                          >
                            <div className="min-w-0 text-right">
                              <p className="truncate font-bold text-text-primary">
                                {c.full_name || "ללא שם"}
                              </p>
                              <p className="truncate text-xs font-medium text-text-muted">
                                {[c.phone, c.city, c.serial_number != null ? `מס׳ ${c.serial_number}` : null]
                                  .filter(Boolean)
                                  .join(" · ") || "—"}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_BADGE_CLASS[status]}`}
                            >
                              {status}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ) : null}
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
                    onClick={() => toggleStatusFilter(status)}
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

      {/* Live dashboard squares */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="סה״כ מועמדים"
          value={stats.total}
          onClick={clearFilters}
        />
        {CANDIDATE_STATUSES.map((status) => (
          <StatCard
            key={status}
            label={status}
            value={statusCounts[status]}
            tone={STATUS_COLORS[status]}
            active={selectedStatuses.includes(status)}
            onClick={() => toggleStatusFilter(status)}
          />
        ))}
        <StatCard
          icon={FileText}
          label="טיוטות"
          value={stats.drafts}
          onClick={() => setDraftsOpen(true)}
        />
        <StatCard
          icon={CheckCircle2}
          label="עברו מבחן"
          value={stats.quizPassed}
        />
        <StatCard
          icon={XCircle}
          label="לא עברו מבחן"
          value={stats.quizFailed}
        />
      </div>

      {drafts.length > 0 ? (
        <div className={`${cardClass} overflow-hidden`}>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 p-4 text-right sm:p-5"
            onClick={() => setDraftsOpen((open) => !open)}
            aria-expanded={draftsOpen}
          >
            <div>
              <h2 className="text-base font-bold text-text-primary">טיוטות</h2>
              <p className="text-xs font-medium text-text-muted">
                {drafts.length} טיוטות שמורות
              </p>
            </div>
            {draftsOpen ? (
              <ChevronUp className="h-5 w-5 text-text-muted" />
            ) : (
              <ChevronDown className="h-5 w-5 text-text-muted" />
            )}
          </button>
          {draftsOpen ? (
            <ul className="divide-y divide-border-weak border-t border-border-weak">
              {drafts.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-text-primary">{c.full_name || "ללא שם"}</p>
                    <p className="text-xs font-medium text-text-muted">
                      שלב {(c.draft_step ?? 0) + 1} · {c.phone || "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {canEdit ? (
                      <>
                        <Link
                          href={`/malshabim/interview?id=${c.id}`}
                          className={primaryButtonClass}
                        >
                          <Pencil className="h-4 w-4" /> מילוי
                        </Link>
                        <button
                          type="button"
                          className={`${secondaryButtonClass} !text-rose-600`}
                          disabled={deletingId === c.id}
                          onClick={() => void deleteDraft(c.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          {deletingId === c.id ? "מוחק…" : "מחיקה"}
                        </button>
                      </>
                    ) : (
                      <Link
                        href={`/malshabim/interview?id=${c.id}`}
                        className={secondaryButtonClass}
                      >
                        צפייה
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className={emptyStateClass}>אין מועמדים להצגה</div>
      ) : (
        <div className={`${panelClass} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-right text-sm">
              <thead className={tableHeadClass}>
                <tr>
                  <th className="px-4 py-3">מס׳</th>
                  <th className="px-4 py-3">שם</th>
                  <th className="px-4 py-3">טלפון</th>
                  <th className="px-4 py-3">עיר</th>
                  <th className="px-4 py-3">סטטוס</th>
                  <th className="px-4 py-3">מסלול</th>
                  <th className="px-4 py-3"> </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const status = normalizeCandidateStatus(c.candidate_status);
                  const fileHref = `/malshabim/candidates/${c.id}`;
                  return (
                    <tr key={c.id} className={`${tableRowClass} group`}>
                      <td className="px-4 py-3 font-semibold text-text-muted">
                        <Link href={fileHref} className="hover:text-accent-primary">
                          {c.serial_number ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-bold text-text-primary">
                        <Link href={fileHref} className="hover:text-accent-primary">
                          {c.full_name || "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{c.phone || "—"}</td>
                      <td className="px-4 py-3 text-text-secondary">{c.city || "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_BADGE_CLASS[status]}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {c.recruitment_track || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={fileHref}
                          className="inline-flex items-center gap-1 rounded-full bg-accent-primary px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:opacity-90"
                          aria-label={`פתח תיק של ${c.full_name || "מועמד"}`}
                        >
                          פתח תיק
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
  active,
  onClick,
}: {
  icon?: typeof Users;
  label: string;
  value: number;
  tone?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
          tone || "bg-accent-primary/12 text-accent-primary"
        }`}
      >
        {Icon ? <Icon className="h-5 w-5" /> : <span className="text-sm font-black">{value}</span>}
      </div>
      <div>
        <p className="text-xs font-semibold text-text-muted">{label}</p>
        <p className="text-xl font-bold text-text-primary sm:text-2xl">{value}</p>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${cardClass} flex items-center gap-3 p-3 text-right transition hover:opacity-90 sm:p-4 ${
          active ? "ring-2 ring-accent-primary" : ""
        }`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={`${cardClass} flex items-center gap-3 p-3 sm:p-4`}>{content}</div>
  );
}
