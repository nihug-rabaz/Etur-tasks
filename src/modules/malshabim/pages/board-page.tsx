"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronLeft,
  ClipboardCheck,
  Plus,
  Search,
  UserRoundSearch,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  BOARD_BUCKET_LABELS,
  CANDIDATE_STATUSES,
  STATUS_BADGE_CLASS,
  filterCandidates,
  formatDateTime,
  getBoardBucket,
  getLastStatusUpdateDate,
  normalizeCandidateStatus,
  type MalshabimBoardBucket,
  type MalshabimCandidateFilters,
} from "@/modules/malshabim/lib/status";
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
  selectClass,
  tableHeadClass,
  tableRowClass,
} from "@/modules/malshabim/lib/ui";
import type {
  MalshabimCandidate,
  MalshabimCandidateStatus,
} from "@/modules/malshabim/types";
import type { ModuleRole } from "@/shared/modules/types";

type Segment = "all" | MalshabimBoardBucket;

function displayName(c: MalshabimCandidate): string {
  return (
    c.request_meta?.requester?.trim() ||
    c.full_name?.trim() ||
    "ללא שם"
  );
}

export function MalshabimBoardPage({
  initialCandidates,
  initialRole,
}: {
  initialCandidates: MalshabimCandidate[];
  initialRole: ModuleRole;
}) {
  const canEdit = initialRole === "admin" || initialRole === "user";
  const isAdmin = initialRole === "admin";
  const [candidates, setCandidates] = useState(
    initialCandidates.filter((c) => !c.is_draft),
  );
  const [segment, setSegment] = useState<Segment>("all");
  const [unitFilter, setUnitFilter] = useState("all");
  const [openSections, setOpenSections] = useState<Record<MalshabimBoardBucket, boolean>>({
    awaiting: true,
    open: true,
    done: false,
  });
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);
  const [filters, setFilters] = useState<MalshabimCandidateFilters>({
    search: "",
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

  const units = useMemo(() => {
    const set = new Set<string>();
    for (const c of candidates) {
      const unit = c.request_meta?.unit?.trim();
      if (unit) set.add(unit);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "he"));
  }, [candidates]);

  const filtered = useMemo(
    () =>
      filterCandidates(candidates, {
        ...filters,
        unit: unitFilter === "all" ? undefined : unitFilter,
      }),
    [candidates, filters, unitFilter],
  );

  const byBucket = useMemo(() => {
    const map: Record<MalshabimBoardBucket, MalshabimCandidate[]> = {
      awaiting: [],
      open: [],
      done: [],
    };
    for (const c of filtered) {
      map[getBoardBucket(c)].push(c);
    }
    return map;
  }, [filtered]);

  const awaitingCount = useMemo(
    () => candidates.filter((c) => c.awaiting_admin_approval).length,
    [candidates],
  );

  const visibleBuckets: MalshabimBoardBucket[] =
    segment === "all" ? ["awaiting", "open", "done"] : [segment];

  const setSearch = (search: string) => setFilters((prev) => ({ ...prev, search }));

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

  const segmentChip = (id: Segment, label: string, count?: number) => {
    const active = segment === id;
    return (
      <button
        type="button"
        className={active ? chipActiveClass : chipIdleClass}
        onClick={() => setSegment(id)}
      >
        {label}
        {typeof count === "number" ? (
          <span className="ms-1 opacity-80">({count})</span>
        ) : null}
      </button>
    );
  };

  const renderTable = (rows: MalshabimCandidate[]) => {
    if (rows.length === 0) {
      return <p className={emptyStateClass}>אין תיקים בקטגוריה זו</p>;
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-right text-sm">
          <thead className={tableHeadClass}>
            <tr>
              <th className="px-3 py-3">שם הפונה / מועמד</th>
              <th className="px-3 py-3">טלפון</th>
              <th className="px-3 py-3">לאיזו יחידה</th>
              <th className="px-3 py-3">לאיזה תפקיד</th>
              <th className="px-3 py-3">סטטוס</th>
              <th className="px-3 py-3">תאריך</th>
              <th className="px-3 py-3"> </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const status = normalizeCandidateStatus(c.candidate_status);
              const meta = c.request_meta || {};
              const href = `/malshabim/candidates/${c.id}`;
              const dateValue =
                getLastStatusUpdateDate(c) || c.approval_requested_at || c.updated_at;
              return (
                <tr key={c.id} className={tableRowClass}>
                  <td className="px-3 py-3">
                    <Link
                      href={href}
                      className="font-bold text-text-primary hover:text-accent-primary"
                    >
                      {displayName(c)}
                    </Link>
                    {c.full_name &&
                    meta.requester &&
                    meta.requester.trim() !== c.full_name.trim() ? (
                      <p className="text-xs text-text-muted">מועמד: {c.full_name}</p>
                    ) : null}
                    {c.awaiting_admin_approval ? (
                      <span className="mt-1 inline-block rounded-full bg-emerald-600/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        ממתין לאישור
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-text-secondary">{c.phone || "—"}</td>
                  <td className="px-3 py-3 text-text-secondary">{meta.unit || "—"}</td>
                  <td className="px-3 py-3 text-text-secondary">{meta.role || "—"}</td>
                  <td className="px-3 py-3">
                    {canEdit && !c.awaiting_admin_approval ? (
                      <select
                        className={`${selectClass} !w-auto !py-1.5 text-xs`}
                        value={status}
                        onChange={(e) =>
                          void moveTo(c.id, e.target.value as MalshabimCandidateStatus)
                        }
                      >
                        {CANDIDATE_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_BADGE_CLASS[status]}`}
                      >
                        {status}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs text-text-muted">
                    {formatDateTime(dateValue)}
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={href}
                      className="inline-flex items-center gap-1 rounded-full bg-accent-primary px-3 py-1.5 text-xs font-bold text-white"
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
    );
  };

  return (
    <div className={pageShellClass} dir="rtl">
      <div className={`${panelClass} p-4 sm:p-5`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <h1 className={pageTitleClass}>טבלת עבודה</h1>
            <p className={pageSubtitleClass}>
              מעקב פניות ותיקים · {filtered.length} מוצגים
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <>
                <Link href="/malshabim/interview" className={primaryButtonClass}>
                  <Plus className="h-4 w-4" /> פתח תיק
                </Link>
                <Link
                  href="/malshabim/waitlist?new=1"
                  className={`${primaryButtonClass} !bg-violet-600 hover:!bg-violet-700`}
                >
                  <Plus className="h-4 w-4" /> הוספת פנייה
                </Link>
              </>
            ) : null}
          </div>
        </div>

        <div className="relative mt-4">
          <Search
            className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
            aria-hidden
          />
          <input
            className={searchClass}
            placeholder="חיפוש לפי שם, טלפון, יחידה, תפקיד…"
            value={filters.search || ""}
            onChange={(e) => setSearch(e.target.value)}
          />
          {filters.search ? (
            <button
              type="button"
              className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-text-muted hover:bg-surface-2"
              aria-label="נקה חיפוש"
              onClick={() => setSearch("")}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {segmentChip("all", "הכל", filtered.length)}
          {segmentChip("awaiting", BOARD_BUCKET_LABELS.awaiting, byBucket.awaiting.length)}
          {segmentChip("open", BOARD_BUCKET_LABELS.open, byBucket.open.length)}
          {segmentChip("done", BOARD_BUCKET_LABELS.done, byBucket.done.length)}
          {units.length > 0 ? (
            <label className="ms-auto flex items-center gap-2 text-xs font-bold text-text-muted">
              סינון לפי יחידה
              <select
                className={`${selectClass} !w-auto`}
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
              >
                <option value="all">כל היחידות</option>
                {units.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </div>

      <div className={`grid gap-3 ${isAdmin ? "sm:grid-cols-2" : ""}`}>
        <Link
          href="/malshabim/waitlist"
          className={`${cardClass} flex items-center gap-3 p-4 transition hover:opacity-90`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600">
            <UserRoundSearch className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-text-muted">ממתינים לראיון</p>
            <p className="text-2xl font-black text-text-primary">
              {waitlistCount ?? "—"}
            </p>
          </div>
        </Link>
        {isAdmin ? (
          <Link
            href="/malshabim/admin/approvals"
            className={`${cardClass} flex items-center gap-3 p-4 transition hover:opacity-90`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600/15 text-emerald-700">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-text-muted">ממתינים לאישור</p>
              <p className="text-2xl font-black text-text-primary">{awaitingCount}</p>
            </div>
          </Link>
        ) : null}
      </div>

      <div className="space-y-3">
        {visibleBuckets.map((bucket) => {
          const rows = byBucket[bucket];
          const collapsible = segment === "all";
          const open = collapsible ? openSections[bucket] : true;
          const header = (
            <div className="flex w-full items-center justify-between gap-3 p-4 text-right">
              <div>
                <h2 className="text-base font-bold text-text-primary">
                  {BOARD_BUCKET_LABELS[bucket]}
                </h2>
                <p className="text-xs font-medium text-text-muted">{rows.length} תיקים</p>
              </div>
              {collapsible ? (
                <ChevronDown
                  className={`h-5 w-5 text-text-muted transition ${open ? "rotate-180" : ""}`}
                />
              ) : null}
            </div>
          );
          return (
            <section key={bucket} className={`${panelClass} overflow-hidden`}>
              {collapsible ? (
                <button
                  type="button"
                  className="w-full"
                  onClick={() =>
                    setOpenSections((prev) => ({ ...prev, [bucket]: !prev[bucket] }))
                  }
                  aria-expanded={open}
                >
                  {header}
                </button>
              ) : (
                header
              )}
              {open ? <div className="border-t border-border-weak p-2 sm:p-3">{renderTable(rows)}</div> : null}
            </section>
          );
        })}
      </div>

      {canEdit ? (
        <p className="text-center text-xs text-text-muted">
          אפשר לשנות סטטוס ישירות מהטבלה ·{" "}
          <Link href="/malshabim" className="font-bold text-accent-primary">
            חזרה לתיקי מועמדים
          </Link>
        </p>
      ) : null}
    </div>
  );
}
