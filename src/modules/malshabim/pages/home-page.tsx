"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  ClipboardCheck,
  FileSpreadsheet,
  KanbanSquare,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  Search,
  Upload,
  UserRoundSearch,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  CANDIDATE_STATUSES,
  FILTER_EMPTY_VALUE,
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
import {
  exportTemplate,
  parseTemplateFile,
  templateRowsToImportPayload,
} from "@/modules/malshabim/lib/excel-template";
import { malshabimFetch } from "@/modules/malshabim/lib/fetch";
import {
  cardClass,
  emptyStateClass,
  pageShellClass,
  pageSubtitleClass,
  pageTitleClass,
  panelClass,
  primaryButtonClass,
  searchClass,
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

const HOME_FILTERS_KEY = "malshabim-home-filters";
const HOME_VIEW_KEY = "malshabim-home-view-mode";

const DEFAULT_FILTERS: MalshabimCandidateFilters = {
  search: "",
  track: "all",
  candidateStatus: [],
  statusType: "all",
  requestType: "all",
  fromDate: "",
  toDate: "",
};

function loadStoredFilters(): MalshabimCandidateFilters {
  try {
    const raw = sessionStorage.getItem(HOME_FILTERS_KEY);
    if (!raw) return DEFAULT_FILTERS;
    const parsed = JSON.parse(raw) as MalshabimCandidateFilters;
    return { ...DEFAULT_FILTERS, ...parsed, search: "" };
  } catch {
    return DEFAULT_FILTERS;
  }
}

function loadStoredViewMode(): "list" | "grid" {
  try {
    const raw = sessionStorage.getItem(HOME_VIEW_KEY);
    return raw === "grid" ? "grid" : "list";
  } catch {
    return "list";
  }
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
  const filesSearchRef = useRef<HTMLDivElement>(null);
  const [importing, setImporting] = useState(false);
  const [candidates, setCandidates] = useState(initialCandidates);
  const [filesOpen, setFilesOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [filesSearchOpen, setFilesSearchOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [filtersHydrated, setFiltersHydrated] = useState(false);
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);
  const [pendingApprovalCount, setPendingApprovalCount] = useState<number | null>(() =>
    initialCandidates.filter((c) => !c.is_draft && c.awaiting_admin_approval).length,
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<MalshabimCandidateStatus>("בטיפול");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [filters, setFilters] = useState<MalshabimCandidateFilters>(DEFAULT_FILTERS);

  useEffect(() => {
    setFilters(loadStoredFilters());
    setViewMode(loadStoredViewMode());
    setFiltersHydrated(true);
  }, []);

  useEffect(() => {
    if (!filtersHydrated) return;
    try {
      const persistable = {
        track: filters.track,
        candidateStatus: filters.candidateStatus,
        statusType: filters.statusType,
        requestType: filters.requestType,
        fromDate: filters.fromDate,
        toDate: filters.toDate,
      };
      sessionStorage.setItem(HOME_FILTERS_KEY, JSON.stringify(persistable));
      sessionStorage.setItem(HOME_VIEW_KEY, viewMode);
    } catch {
      // ignore
    }
  }, [filters, viewMode, filtersHydrated]);

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

  useEffect(() => {
    if (!isAdmin) return;
    void (async () => {
      try {
        const res = await malshabimFetch<{ candidates?: unknown[] }>(
          "/api/malshabim/approvals",
        );
        setPendingApprovalCount(
          Array.isArray(res.candidates) ? res.candidates.length : 0,
        );
      } catch {
        setPendingApprovalCount(null);
      }
    })();
  }, [isAdmin]);

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
      const target = event.target as Node;
      if (!searchBoxRef.current?.contains(target)) setSearchOpen(false);
      if (!filesSearchRef.current?.contains(target)) setFilesSearchOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setFilesSearchOpen(false);
      }
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
    setFilters(DEFAULT_FILTERS);
    setSearchOpen(false);
    try {
      sessionStorage.removeItem(HOME_FILTERS_KEY);
    } catch {
      // ignore
    }
  };

  const toggleStatusFilter = (status: MalshabimCandidateStatus) => {
    setFilter("candidateStatus", toggleFilterValue(filters.candidateStatus, status));
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleSelectAllFiltered = () => {
    const ids = filtered.map((c) => c.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
    setSelectedIds(allSelected ? [] : ids);
  };

  const applyBulkStatus = async () => {
    if (!canEdit || selectedIds.length === 0) return;
    setBulkSaving(true);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          malshabimFetch(`/api/malshabim/candidates/${id}`, {
            method: "PATCH",
            body: JSON.stringify({
              candidate_status: bulkStatus,
              update_log_entry: {
                changes: `סטטוס עודכן ל: ${bulkStatus} (עדכון מרובה)`,
                updated_by: "מערכת",
              },
            }),
          }),
        ),
      );
      setCandidates((list) =>
        list.map((c) =>
          selectedIds.includes(c.id) ? { ...c, candidate_status: bulkStatus } : c,
        ),
      );
      const updatedCount = selectedIds.length;
      setSelectedIds([]);
      toast.success(`עודכן סטטוס ל־${updatedCount} תיקים`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "עדכון מרובה נכשל");
    } finally {
      setBulkSaving(false);
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

  const actionCardClass =
    "flex min-h-[108px] flex-col justify-between rounded-2xl border border-border-weak bg-surface-1 p-3.5 text-right shadow-sm transition hover:border-accent-primary/35 hover:shadow-md sm:p-4";
  const sideTileBase =
    "inline-flex min-h-[72px] w-full flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl px-3 py-3 text-center text-sm font-bold shadow-sm transition disabled:opacity-40";
  const blueTileClass = `${sideTileBase} bg-blue-600 text-white hover:bg-blue-700`;
  const greenTileClass = `${sideTileBase} bg-emerald-600 text-white hover:bg-emerald-700`;

  return (
    <div className={pageShellClass} dir="rtl">
      <section className="overflow-hidden rounded-3xl border border-border-weak bg-gradient-to-b from-surface-1 to-surface-2/60 shadow-sm">
        <div className="border-b border-border-weak px-4 py-5 sm:px-6">
          <p className="text-xs font-bold tracking-wide text-text-muted">מודול מלש״בים</p>
          <h1 className={`${pageTitleClass} mt-1 !text-3xl`}>מלש״בים</h1>
          <p className={pageSubtitleClass}>
            מה דורש טיפול עכשיו · {filtered.length} תיקים מוצגים מתוך {stats.total}
          </p>
        </div>

        <div className="relative z-30 border-b border-border-weak px-4 py-4 sm:px-6" ref={searchBoxRef}>
          <div className="relative flex items-center">
            <Search
              className="pointer-events-none absolute start-4 h-4 w-4 text-text-muted"
              aria-hidden
            />
            <input
              className={`${searchClass} !rounded-2xl !border !border-border-weak !bg-surface-2 !py-3.5`}
              placeholder="חיפוש מלש״ב — מס׳ תיק, שם, טלפון, ת.ז…"
              value={filters.search || ""}
              onChange={(e) => {
                setFilter("search", e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              aria-controls="malshabim-search-results"
              autoComplete="off"
            />
            {searchQuery ? (
              <button
                type="button"
                className="absolute end-3 rounded-full p-1 text-text-muted transition hover:bg-surface-1 hover:text-text-primary"
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
              className="absolute inset-x-4 top-[calc(100%-0.25rem)] z-50 max-h-80 overflow-y-auto rounded-2xl border border-border-weak bg-surface-1 p-2 shadow-xl shadow-black/10 sm:inset-x-6"
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

        {/* Cards (right) + action tiles (left) */}
        <div className="flex flex-col gap-3 p-4 sm:p-6 md:flex-row md:items-stretch md:gap-3">
          <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            {canEdit ? (
              <Link href="/malshabim/interview" className={actionCardClass}>
                <span className="w-fit rounded-xl bg-accent-primary/15 p-2.5 text-accent-primary">
                  <Plus className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-base font-black text-text-primary sm:text-lg">ראיון חדש</p>
                  <p className="mt-1 text-xs font-medium text-text-muted">פתיחת תיק ראיון</p>
                </div>
              </Link>
            ) : (
              <div className={`${actionCardClass} opacity-50`}>
                <span className="w-fit rounded-xl bg-surface-2 p-2.5 text-text-muted">
                  <Plus className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-base font-black text-text-primary sm:text-lg">ראיון חדש</p>
                  <p className="mt-1 text-xs font-medium text-text-muted">אין הרשאה</p>
                </div>
              </div>
            )}
            {canEdit ? (
              <Link href="/malshabim/waitlist?new=1" className={actionCardClass}>
                <span className="w-fit rounded-xl bg-violet-600/15 p-2.5 text-violet-700">
                  <Plus className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-base font-black text-text-primary sm:text-lg">פנייה חדשה</p>
                  <p className="mt-1 text-xs font-medium text-text-muted">רישום למחכים לראיון</p>
                </div>
              </Link>
            ) : (
              <div className={`${actionCardClass} opacity-50`}>
                <span className="w-fit rounded-xl bg-surface-2 p-2.5 text-text-muted">
                  <Plus className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-base font-black text-text-primary sm:text-lg">פנייה חדשה</p>
                  <p className="mt-1 text-xs font-medium text-text-muted">אין הרשאה</p>
                </div>
              </div>
            )}
            <Link href="/malshabim/admin/approvals" className={actionCardClass}>
              <div className="flex items-center gap-2.5">
                <span className="rounded-xl bg-emerald-600/15 p-2.5 text-emerald-700">
                  <ClipboardCheck className="h-5 w-5" />
                </span>
                <p className="text-2xl font-black tabular-nums leading-none text-text-primary sm:text-3xl">
                  {pendingApprovalCount ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-base font-black text-text-primary sm:text-lg">מחכים לאישור מנהל</p>
                <p className="mt-1 text-xs font-medium text-text-muted">אישור או דחייה</p>
              </div>
            </Link>
            <Link href="/malshabim/waitlist" className={actionCardClass}>
              <div className="flex items-center gap-2.5">
                <span className="rounded-xl bg-amber-500/15 p-2.5 text-amber-700">
                  <UserRoundSearch className="h-5 w-5" />
                </span>
                <p className="text-2xl font-black tabular-nums leading-none text-text-primary sm:text-3xl">
                  {waitlistCount ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-base font-black text-text-primary sm:text-lg">מחכים לראיון</p>
                <p className="mt-1 text-xs font-medium text-text-muted">רשימת פניות ממתינות</p>
              </div>
            </Link>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-3 md:w-40 lg:w-44">
            <Link href="/malshabim/board" className={blueTileClass}>
              <KanbanSquare className="h-5 w-5" />
              <span>טבלת עבודה</span>
            </Link>
            {canEdit ? (
              <button
                type="button"
                className={greenTileClass}
                onClick={() => exportTemplate()}
              >
                <FileSpreadsheet className="h-5 w-5" />
                <span>ייצא תבנית</span>
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
                  className={greenTileClass}
                  disabled={importing}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-5 w-5" />
                  <span>{importing ? "מייבא…" : "ייבא אקסל"}</span>
                </button>
              </>
            ) : null}
          </div>
        </div>
      </section>

      {/* Separate tab above candidate files */}
      <Link
        href="/malshabim/drafts"
        className={`${cardClass} flex items-center justify-between gap-3 border border-border-weak bg-surface-1 px-4 py-4 transition hover:border-accent-primary/40 hover:shadow-md sm:px-5`}
      >
        <div>
          <p className="text-base font-black text-text-primary">
            ראיונות שלא הושלמו
          </p>
          <p className="mt-0.5 text-xs font-medium text-text-muted">
            {drafts.length > 0 ? `${drafts.length} טיוטות שמורות` : "אין טיוטות כרגע"}
          </p>
        </div>
        <ChevronLeft className="h-5 w-5 text-text-muted" />
      </Link>

      {/* Files area — filters + list */}
      <section className={`${panelClass} relative z-20 min-w-0 overflow-visible`}>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 p-4 text-right sm:p-5"
          onClick={() => setFilesOpen((open) => !open)}
          aria-expanded={filesOpen}
        >
          <div>
            <h2 className="text-lg font-black text-text-primary">תיקי מועמדים</h2>
            <p className="text-xs font-medium text-text-muted">
              סינון ורשימה · {filtered.length} מוצגים
            </p>
          </div>
          {filesOpen ? (
            <ChevronUp className="h-5 w-5 text-text-muted" />
          ) : (
            <ChevronDown className="h-5 w-5 text-text-muted" />
          )}
        </button>

        {filesOpen ? (
          <div className="space-y-3 border-t border-border-weak p-4 sm:p-5">
            <div className="relative z-20" ref={filesSearchRef}>
              <div className="relative flex items-center">
                <Search
                  className="pointer-events-none absolute start-4 h-4 w-4 text-text-muted"
                  aria-hidden
                />
                <input
                  className={`${searchClass} !rounded-2xl !border !border-border-weak !bg-surface-2 !py-3.5`}
                  placeholder="חיפוש מלש״ב — מס׳ תיק, שם, טלפון, ת.ז…"
                  value={filters.search || ""}
                  onChange={(e) => {
                    setFilter("search", e.target.value);
                    setFilesSearchOpen(true);
                  }}
                  onFocus={() => setFilesSearchOpen(true)}
                  aria-controls="malshabim-files-search-results"
                  autoComplete="off"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    className="absolute end-3 rounded-full p-1 text-text-muted transition hover:bg-surface-1 hover:text-text-primary"
                    aria-label="נקה חיפוש"
                    onClick={() => {
                      setFilter("search", "");
                      setFilesSearchOpen(false);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              {filesSearchOpen && searchQuery.length >= 1 ? (
                <div
                  id="malshabim-files-search-results"
                  role="listbox"
                  className="absolute inset-x-0 top-[calc(100%+0.35rem)] z-50 max-h-80 overflow-y-auto rounded-2xl border border-border-weak bg-surface-1 p-2 shadow-xl shadow-black/10"
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
                              onClick={() => setFilesSearchOpen(false)}
                            >
                              <div className="min-w-0 text-right">
                                <p className="truncate font-bold text-text-primary">
                                  {c.full_name || "ללא שם"}
                                </p>
                                <p className="truncate text-xs font-medium text-text-muted">
                                  {[
                                    c.phone,
                                    c.city,
                                    c.serial_number != null ? `מס׳ ${c.serial_number}` : null,
                                  ]
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
            <div className="flex flex-wrap items-center gap-1.5">
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

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="flex min-w-[9rem] flex-1 flex-col gap-1 text-xs font-bold text-text-muted sm:max-w-[11rem]">
              איתור / בקשה
              <select
                className={selectClass}
                value={typeof filters.requestType === "string" ? filters.requestType : "all"}
                onChange={(e) => setFilter("requestType", e.target.value)}
              >
                <option value="all">הכול</option>
                <option value={FILTER_EMPTY_VALUE}>ללא</option>
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
                <option value={FILTER_EMPTY_VALUE}>ללא מסלול</option>
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
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                    activeChip
                      ? STATUS_COLORS[status]
                      : "bg-surface-2 text-text-secondary hover:bg-surface-2/80"
                  }`}
                  onClick={() => toggleStatusFilter(status)}
                >
                  {status}
                  <span className="ms-1 opacity-80">({statusCounts[status]})</span>
                </button>
              );
            })}
          </div>

      {canEdit && filtered.length > 0 ? (
        <div className={`${panelClass} flex flex-wrap items-center gap-2 p-3`}>
          <label className="inline-flex items-center gap-2 text-xs font-bold text-text-secondary">
            <input
              type="checkbox"
              checked={
                filtered.length > 0 &&
                filtered.every((c) => selectedIds.includes(c.id))
              }
              onChange={toggleSelectAllFiltered}
            />
            בחר הכל ({selectedIds.length})
          </label>
          <select
            className={`${selectClass} !w-auto`}
            value={bulkStatus}
            onChange={(e) =>
              setBulkStatus(e.target.value as MalshabimCandidateStatus)
            }
            disabled={selectedIds.length === 0 || bulkSaving}
          >
            {CANDIDATE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={primaryButtonClass}
            disabled={selectedIds.length === 0 || bulkSaving}
            onClick={() => void applyBulkStatus()}
          >
            {bulkSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            שנה סטטוס לנבחרים
          </button>
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
              <div
                key={c.id}
                className={`${cardClass} flex flex-col gap-3 border-s-4 p-4 ${
                  status === "בטיפול"
                    ? "border-s-amber-500"
                    : status === "אושר ושובץ"
                      ? "border-s-violet-600"
                      : status === "אושר ולא שובץ"
                        ? "border-s-emerald-600"
                        : "border-s-rose-600"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2">
                    {canEdit ? (
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={selectedIds.includes(c.id)}
                        onChange={() => toggleSelected(c.id)}
                        aria-label={`בחר את ${c.full_name || "מועמד"}`}
                      />
                    ) : null}
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-text-primary">
                        {c.full_name || "ללא שם"}
                      </p>
                      <p className="text-xs font-medium text-text-muted">
                        #{c.serial_number ?? "—"}
                        {c.recruitment_track ? ` · ${c.recruitment_track}` : ""}
                      </p>
                    </div>
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
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border-weak bg-surface-1">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-right text-sm">
              <thead className={tableHeadClass}>
                <tr>
                  {canEdit ? <th className="px-3 py-3"> </th> : null}
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
                      {canEdit ? (
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(c.id)}
                            onChange={() => toggleSelected(c.id)}
                            aria-label={`בחר את ${c.full_name || "מועמד"}`}
                          />
                        </td>
                      ) : null}
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
        ) : null}
      </section>
    </div>
  );
}
