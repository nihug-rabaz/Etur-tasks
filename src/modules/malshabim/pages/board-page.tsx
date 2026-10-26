"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronLeft,
  ClipboardCheck,
  Filter,
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
  emptyStateClass,
  pageShellClass,
  primaryButtonClass,
  secondaryButtonClass,
  selectClass,
} from "@/modules/malshabim/lib/ui";
import type {
  MalshabimCandidate,
  MalshabimCandidateStatus,
} from "@/modules/malshabim/types";
import type { ModuleRole } from "@/shared/modules/types";

type Segment = "all" | MalshabimBoardBucket;

const BUCKET_ACCENT: Record<MalshabimBoardBucket, string> = {
  awaiting: "border-s-emerald-600 bg-emerald-600/[0.06]",
  open: "border-s-amber-500 bg-amber-500/[0.06]",
  done: "border-s-slate-400 bg-slate-500/[0.05]",
};

const BUCKET_BADGE: Record<MalshabimBoardBucket, string> = {
  awaiting: "bg-emerald-600 text-white",
  open: "bg-amber-500 text-white",
  done: "bg-slate-600 text-white",
};

function displayName(c: MalshabimCandidate): string {
  return (
    c.request_meta?.requester?.trim() ||
    c.full_name?.trim() ||
    "ללא שם"
  );
}

function KpiCard({
  label,
  value,
  tone,
  href,
  active,
  onClick,
  icon,
}: {
  label: string;
  value: number | string;
  tone: string;
  href?: string;
  active?: boolean;
  onClick?: () => void;
  icon: ReactNode;
}) {
  const className = [
    "flex min-h-[96px] flex-col justify-between rounded-2xl border border-border-weak bg-surface-1 p-4 text-right shadow-sm transition",
    "hover:border-accent-primary/40 hover:shadow-md",
    active ? "ring-2 ring-accent-primary ring-offset-2 ring-offset-surface-1" : "",
  ].join(" ");

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className={`rounded-xl p-2 ${tone}`}>{icon}</span>
        <p className="text-3xl font-black tabular-nums tracking-tight text-text-primary">
          {value}
        </p>
      </div>
      <p className="mt-3 text-sm font-bold text-text-secondary">{label}</p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }

  return (
    <button type="button" className={`${className} w-full`} onClick={onClick}>
      {body}
    </button>
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

  const openCount = useMemo(
    () => candidates.filter((c) => getBoardBucket(c) === "open").length,
    [candidates],
  );

  const doneCount = useMemo(
    () => candidates.filter((c) => getBoardBucket(c) === "done").length,
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

  const renderTable = (rows: MalshabimCandidate[]) => {
    if (rows.length === 0) {
      return <p className={emptyStateClass}>אין תיקים בקטגוריה זו</p>;
    }
    return (
      <div className="overflow-x-auto rounded-xl border border-border-weak bg-surface-1">
        <table className="w-full min-w-[860px] text-right text-sm">
          <thead>
            <tr className="border-b border-border-weak bg-surface-2/80 text-[11px] font-bold tracking-wide text-text-muted">
              <th className="px-4 py-3">שם הפונה</th>
              <th className="px-4 py-3">טלפון</th>
              <th className="px-4 py-3">יחידה</th>
              <th className="px-4 py-3">תפקיד</th>
              <th className="px-4 py-3">סטטוס</th>
              <th className="px-4 py-3">תאריך</th>
              <th className="px-4 py-3">פעולה</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c, index) => {
              const status = normalizeCandidateStatus(c.candidate_status);
              const meta = c.request_meta || {};
              const href = `/malshabim/candidates/${c.id}`;
              const dateValue =
                getLastStatusUpdateDate(c) || c.approval_requested_at || c.updated_at;
              return (
                <tr
                  key={c.id}
                  className={`border-b border-border-weak/80 last:border-0 ${
                    index % 2 === 0 ? "bg-surface-1" : "bg-surface-2/35"
                  } hover:bg-accent-primary/5`}
                >
                  <td className="px-4 py-3.5">
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
                      <span className="mt-1 inline-block rounded-md bg-emerald-600/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        ממתין לאישור
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3.5 font-medium tabular-nums text-text-secondary">
                    {c.phone || "—"}
                  </td>
                  <td className="px-4 py-3.5 text-text-secondary">{meta.unit || "—"}</td>
                  <td className="px-4 py-3.5 text-text-secondary">{meta.role || "—"}</td>
                  <td className="px-4 py-3.5">
                    {canEdit && !c.awaiting_admin_approval ? (
                      <select
                        className={`${selectClass} !w-auto !rounded-lg !py-1.5 text-xs`}
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
                        className={`inline-block rounded-md px-2.5 py-1 text-[11px] font-bold ${STATUS_BADGE_CLASS[status]}`}
                      >
                        {status}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-text-muted">
                    {formatDateTime(dateValue)}
                  </td>
                  <td className="px-4 py-3.5">
                    <Link
                      href={href}
                      className="inline-flex items-center gap-1 rounded-lg bg-accent-primary px-3 py-1.5 text-xs font-bold text-white"
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
      {/* Sketch-style summary strip */}
      <section className="overflow-hidden rounded-3xl border border-border-weak bg-gradient-to-b from-surface-1 to-surface-2/60 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-border-weak px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div>
            <p className="text-xs font-bold tracking-wide text-text-muted">
              מלש״בים · לוח פניות
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-text-primary">
              טבלת עבודה
            </h1>
            <p className="mt-1 text-sm font-medium text-text-secondary">
              {filtered.length} מוצגים מתוך {candidates.length} תיקים
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
                  className={`${secondaryButtonClass} !border !border-violet-500/30 !bg-violet-600/10 !text-violet-800`}
                >
                  <Plus className="h-4 w-4" /> הוספת פנייה
                </Link>
              </>
            ) : null}
            <Link href="/malshabim" className={secondaryButtonClass}>
              תיקי מועמדים
            </Link>
          </div>
        </div>

        <div
          className={`grid gap-3 p-4 sm:p-6 ${
            isAdmin ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"
          }`}
        >
          <KpiCard
            label="ממתינים לראיון"
            value={waitlistCount ?? "—"}
            tone="bg-amber-500/15 text-amber-700"
            href="/malshabim/waitlist"
            icon={<UserRoundSearch className="h-5 w-5" />}
          />
          {isAdmin ? (
            <KpiCard
              label="ממתינים לאישור"
              value={awaitingCount}
              tone="bg-emerald-600/15 text-emerald-700"
              href="/malshabim/admin/approvals"
              icon={<ClipboardCheck className="h-5 w-5" />}
            />
          ) : null}
          <KpiCard
            label="בטיפול"
            value={openCount}
            tone="bg-amber-500/15 text-amber-700"
            active={segment === "open"}
            onClick={() => setSegment(segment === "open" ? "all" : "open")}
            icon={<Filter className="h-5 w-5" />}
          />
          <KpiCard
            label="הושלמו"
            value={doneCount}
            tone="bg-slate-500/15 text-slate-700"
            active={segment === "done"}
            onClick={() => setSegment(segment === "done" ? "all" : "done")}
            icon={<ClipboardCheck className="h-5 w-5" />}
          />
        </div>
      </section>

      {/* Search + unit filter */}
      <section className="rounded-3xl border border-border-weak bg-surface-1 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
              aria-hidden
            />
            <input
              className="w-full rounded-2xl border border-border-weak bg-surface-2 py-3.5 ps-11 pe-11 text-sm font-medium text-text-primary outline-none transition focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/25"
              placeholder="חיפוש מלש״ב — שם, טלפון, יחידה, תפקיד…"
              value={filters.search || ""}
              onChange={(e) => setSearch(e.target.value)}
            />
            {filters.search ? (
              <button
                type="button"
                className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-text-muted hover:bg-surface-1"
                aria-label="נקה חיפוש"
                onClick={() => setSearch("")}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={
                segment === "all"
                  ? "rounded-xl bg-accent-primary px-3 py-2 text-xs font-bold text-white"
                  : "rounded-xl bg-surface-2 px-3 py-2 text-xs font-bold text-text-secondary"
              }
              onClick={() => setSegment("all")}
            >
              הכל
            </button>
            {units.length > 0 ? (
              <label className="flex items-center gap-2 rounded-xl border border-border-weak bg-surface-2 px-3 py-2 text-xs font-bold text-text-muted">
                סינון יחידה
                <select
                  className="bg-transparent text-text-primary outline-none"
                  value={unitFilter}
                  onChange={(e) => setUnitFilter(e.target.value)}
                >
                  <option value="all">הכל</option>
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
      </section>

      {/* Accordion stages — sketch-style full-width rows */}
      <div className="space-y-3">
        {visibleBuckets.map((bucket) => {
          const rows = byBucket[bucket];
          const collapsible = segment === "all";
          const open = collapsible ? openSections[bucket] : true;
          return (
            <section
              key={bucket}
              className={`overflow-hidden rounded-2xl border border-border-weak border-s-4 bg-surface-1 shadow-sm ${BUCKET_ACCENT[bucket]}`}
            >
              {collapsible ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-4 text-right sm:px-5"
                  onClick={() =>
                    setOpenSections((prev) => ({ ...prev, [bucket]: !prev[bucket] }))
                  }
                  aria-expanded={open}
                >
                  <span
                    className={`inline-flex min-w-10 items-center justify-center rounded-lg px-2.5 py-1 text-sm font-black tabular-nums ${BUCKET_BADGE[bucket]}`}
                  >
                    {rows.length}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-black text-text-primary">
                      {BOARD_BUCKET_LABELS[bucket]}
                    </h2>
                    <p className="text-xs font-medium text-text-muted">
                      לחצו לפתיחה / סגירה
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-text-muted transition ${open ? "rotate-180" : ""}`}
                  />
                </button>
              ) : (
                <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
                  <span
                    className={`inline-flex min-w-10 items-center justify-center rounded-lg px-2.5 py-1 text-sm font-black tabular-nums ${BUCKET_BADGE[bucket]}`}
                  >
                    {rows.length}
                  </span>
                  <h2 className="text-lg font-black text-text-primary">
                    {BOARD_BUCKET_LABELS[bucket]}
                  </h2>
                </div>
              )}
              {open ? (
                <div className="border-t border-border-weak/80 bg-surface-1/80 p-3 sm:p-4">
                  {renderTable(rows)}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
