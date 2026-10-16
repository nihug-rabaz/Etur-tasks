"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  FileSpreadsheet,
  FileText,
  KanbanSquare,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  UserRoundSearch,
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
import {
  RECRUITMENT_TRACKS,
  REQUEST_TYPES,
  STATUS_TYPES,
} from "@/modules/malshabim/lib/question-bank";
import { downloadCandidatesCsv } from "@/modules/malshabim/lib/csv";
import { downloadCandidatesExcel } from "@/modules/malshabim/lib/excel-report";
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
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);
  const [filters, setFilters] = useState<MalshabimCandidateFilters>({
    search: "",
    track: "all",
    candidateStatus: [],
    statusType: "all",
    requestType: "all",
    fromDate: "",
    toDate: "",
  });

  useEffect(() => {
    void (async () => {
      try {
        const res = await malshabimFetch<{ count?: number; entries?: unknown[] }>(
          "/api/malshabim/waitlist",
        );
        setWaitlistCount(
          typeof res.count === "number" ? res.count : (res.entries?.length ?? 0),
        );
      } catch {
        setWaitlistCount(null);
      }
    })();
  }, []);

  const drafts = useMemo(
    () => candidates.filter((c) => c.is_draft),
    [candidates],
  );
  const active = useMemo(
    () => candidates.filter((c) => !c.is_draft),
    [candidates],
  );
  const filtered = useMemo(
    () => filterCandidates(active, filters),
    [active, filters],
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
  const showSearchPanel = searchOpen && searchQuery.length >= 1;

  const clearFilters = () => {
    setFilters({
      search: "",
      track: "all",
      candidateStatus: [],
      statusType: "all",
      requestType: "all",
      fromDate: "",
      toDate: "",
    });
    setSearchOpen(false);
  };

  const toggleStatusFilter = (status: MalshabimCandidateStatus) => {
    setFilter("candidateStatus", toggleFilterValue(filters.candidateStatus, status));
  };

  const deleteCandidate = async (id: string, isDraft: boolean) => {
    if (isDraft ? !canEdit : !isAdmin) return;
    const message = isDraft
      ? "למחוק את הטיוטה?"
      : "למחוק את התיק לצמיתות? הפעולה אינה ניתנת לביטול.";
    if (!window.confirm(message)) return;
    setDeletingId(id);
    try {
      await malshabimFetch(`/api/malshabim/candidates/${id}`, { method: "DELETE" });
      setCandidates((list) => list.filter((c) => c.id !== id));
      toast.success(isDraft ? "הטיוטה נמחקה" : "התיק נמחק");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "מחיקה נכשלה");
    } finally {
      setDeletingId(null);
    }
  };

  const viewToggleClass = (activeMode: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
      activeMode
        ? "bg-text-primary text-white"
        : "bg-surface-2 text-text-secondary hover:bg-surface-2/80"
    }`;

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
            <h1 className={pageTitleClass}>תיקי מועמדים</h1>
            <p className={pageSubtitleClass}>סינון, ייצוא ומעבר בין תצוגות</p>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <Link
              href="/malshabim/waitlist"
              className={`${primaryButtonClass} !bg-violet-600 hover:!bg-violet-700`}
            >
              <UserRoundSearch className="h-4 w-4" />
              חייבים ראיון
              {waitlistCount != null && waitlistCount > 0 ? (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-black">
                  {waitlistCount}
                </span>
              ) : null}
            </Link>
            <Link href="/malshabim/board" className={secondaryButtonClass}>
              <KanbanSquare className="h-4 w-4" /> טבלת עבודה
            </Link>
            <Link href="/malshabim/statistics" className={secondaryButtonClass}>
              <BarChart3 className="h-4 w-4" /> סטטיסטיקות
            </Link>
            {canEdit ? (
              <>
                <Link href="/malshabim/interview" className={primaryButtonClass}>
                  <Plus className="h-4 w-4" /> ראיון חדש
                </Link>
                <Link href="/malshabim/waitlist?new=1" className={secondaryButtonClass}>
                  <Plus className="h-4 w-4" /> פנייה חדשה
                </Link>
              </>
            ) : null}
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

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            className={viewToggleClass(false)}
            onClick={() => downloadCandidatesExcel(filtered)}
          >
            Excel
          </button>
          <button
            type="button"
            className={viewToggleClass(false)}
            onClick={() => downloadCandidatesCsv(filtered)}
          >
            CSV
          </button>
          <button
            type="button"
            className={viewToggleClass(viewMode === "grid")}
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> GRID
          </button>
          <button
            type="button"
            className={viewToggleClass(viewMode === "list")}
            onClick={() => setViewMode("list")}
          >
            <List className="h-3.5 w-3.5" /> רשימה
          </button>
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
                placeholder="מס' תיק, שם, טלפון, ת.ז, סיכום…"
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
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="flex min-w-[9rem] flex-1 flex-col gap-1 text-xs font-bold text-text-muted sm:max-w-[11rem]">
              איתור / בקשה
              <select
                className={selectClass}
                value={typeof filters.requestType === "string" ? filters.requestType : "all"}
                onChange={(e) => setFilter("requestType", e.target.value)}
              >
                <option value="all">הכול</option>
                {REQUEST_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[9rem] flex-1 flex-col gap-1 text-xs font-bold text-text-muted sm:max-w-[11rem]">
              מסלול גיוס
              <select
                className={selectClass}
                value={typeof filters.track === "string" ? filters.track : "all"}
                onChange={(e) => setFilter("track", e.target.value)}
              >
                <option value="all">כל המסלולים</option>
                {RECRUITMENT_TRACKS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[9rem] flex-1 flex-col gap-1 text-xs font-bold text-text-muted sm:max-w-[11rem]">
              סטטוס
              <select
                className={selectClass}
                value={typeof filters.statusType === "string" ? filters.statusType : "all"}
                onChange={(e) => setFilter("statusType", e.target.value)}
              >
                <option value="all">כל הסטטוסים</option>
                {STATUS_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[9rem] flex-1 flex-col gap-1 text-xs font-bold text-text-muted sm:max-w-[12rem]">
              סטטוס עבודה
              <select
                className={selectClass}
                value={selectedStatuses[0] || "all"}
                onChange={(e) =>
                  setFilter(
                    "candidateStatus",
                    e.target.value === "all" ? [] : [e.target.value],
                  )
                }
              >
                <option value="all">כל הסטטוסים</option>
                {CANDIDATE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[9rem] flex-col gap-1 text-xs font-bold text-text-muted">
              סטטוס עודכן מ-
              <input
                type="date"
                className={selectClass}
                value={filters.fromDate || ""}
                onChange={(e) => setFilter("fromDate", e.target.value)}
              />
            </label>
            <label className="flex min-w-[9rem] flex-col gap-1 text-xs font-bold text-text-muted">
              סטטוס עודכן עד
              <input
                type="date"
                className={selectClass}
                value={filters.toDate || ""}
                onChange={(e) => setFilter("toDate", e.target.value)}
              />
            </label>
            <div className="flex flex-wrap items-center gap-2 sm:ms-auto">
              <span className="text-xs font-bold text-text-muted">
                {filtered.length} מתוך {stats.total}
              </span>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full bg-surface-2/80 px-3 py-2 text-xs font-bold text-text-secondary transition hover:bg-surface-2"
                onClick={clearFilters}
              >
                <X className="h-3.5 w-3.5" /> ניקוי
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
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
                          onClick={() => void deleteCandidate(c.id, true)}
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
      ) : viewMode === "grid" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => {
            const status = normalizeCandidateStatus(c.candidate_status);
            const fileHref = `/malshabim/candidates/${c.id}`;
            return (
              <div key={c.id} className={`${cardClass} flex flex-col gap-3 p-4`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-text-primary">
                      {c.full_name || "ללא שם"}
                    </p>
                    <p className="text-xs font-medium text-text-muted">
                      #{c.serial_number ?? "—"}
                      {c.recruitment_track ? ` · ${c.recruitment_track}` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_BADGE_CLASS[status]}`}
                  >
                    {status}
                  </span>
                </div>
                <p className="text-sm font-medium text-text-secondary">{c.phone || "—"}</p>
                <div className="mt-auto flex flex-wrap items-center gap-2">
                  <Link
                    href={fileHref}
                    className="inline-flex items-center gap-1 rounded-full bg-accent-primary px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:opacity-90"
                  >
                    פתח תיק
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Link>
                  {isAdmin ? (
                    <button
                      type="button"
                      className={`${secondaryButtonClass} !text-rose-600`}
                      disabled={deletingId === c.id}
                      onClick={() => void deleteCandidate(c.id, false)}
                      aria-label={`מחק תיק של ${c.full_name || "מועמד"}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
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
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Link
                            href={fileHref}
                            className="inline-flex items-center gap-1 rounded-full bg-accent-primary px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:opacity-90"
                            aria-label={`פתח תיק של ${c.full_name || "מועמד"}`}
                          >
                            פתח תיק
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </Link>
                          {isAdmin ? (
                            <button
                              type="button"
                              className={`${secondaryButtonClass} !px-2 !text-rose-600`}
                              disabled={deletingId === c.id}
                              onClick={() => void deleteCandidate(c.id, false)}
                              aria-label={`מחק תיק של ${c.full_name || "מועמד"}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
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
