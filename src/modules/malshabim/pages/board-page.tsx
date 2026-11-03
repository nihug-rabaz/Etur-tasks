"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Download,
  FileText,
  FolderOpen,
  LayoutGrid,
  List,
  Pencil,
  RefreshCw,
  Search,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  CANDIDATE_STATUSES,
  FILTER_EMPTY_VALUE,
  STATUS_BADGE_CLASS,
  STATUS_COLORS,
  filterCandidates,
  formatDateTime,
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
import { malshabimFetch } from "@/modules/malshabim/lib/fetch";
import { SearchableMultiSelect } from "@/modules/malshabim/components/searchable-multi-select";
import { MonthYearRangeSelect } from "@/modules/malshabim/components/month-year-range-select";
import {
  emptyStateClass,
  pageShellClass,
  secondaryButtonClass,
  selectClass,
} from "@/modules/malshabim/lib/ui";
import type {
  MalshabimCandidate,
  MalshabimCandidateStatus,
} from "@/modules/malshabim/types";
import type { ModuleRole } from "@/shared/modules/types";

const DEFAULT_FILTERS: MalshabimCandidateFilters = {
  search: "",
  track: [],
  candidateStatus: [],
  statusType: [],
  requestType: [],
  fromDate: "",
  toDate: "",
  enlistmentMonths: [],
};

function asSelectedList(value: string | string[] | undefined): string[] {
  if (!value || value === "all") return [];
  return Array.isArray(value) ? value : [value];
}

function nextStatus(current: MalshabimCandidateStatus): MalshabimCandidateStatus {
  const index = CANDIDATE_STATUSES.indexOf(current);
  if (index < 0) return CANDIDATE_STATUSES[0];
  return CANDIDATE_STATUSES[(index + 1) % CANDIDATE_STATUSES.length];
}

function StatCard({
  label,
  value,
  tone,
  active,
  onClick,
  icon,
  href,
}: {
  label: string;
  value: number;
  tone?: string;
  active?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  href?: string;
}) {
  const className = [
    "flex min-h-[92px] items-center gap-3 rounded-2xl border border-border-weak bg-surface-1 p-3 text-right shadow-sm transition sm:p-4",
    onClick || href ? "hover:border-accent-primary/40 hover:shadow-md" : "",
    active ? "ring-2 ring-accent-primary ring-offset-2 ring-offset-surface-1" : "",
  ].join(" ");

  const body = (
    <>
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
          tone || "bg-accent-primary/12 text-accent-primary"
        }`}
      >
        {icon ?? <span className="text-sm font-black">{value}</span>}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-text-muted">{label}</p>
        <p className="text-xl font-black tabular-nums text-text-primary sm:text-2xl">
          {value}
        </p>
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" className={`${className} w-full`} onClick={onClick}>
        {body}
      </button>
    );
  }
  return <div className={className}>{body}</div>;
}

export function MalshabimBoardPage({
  initialCandidates,
  initialRole,
}: {
  initialCandidates: MalshabimCandidate[];
  initialRole: ModuleRole;
}) {
  const canEdit = initialRole === "admin" || initialRole === "user";
  const [allCandidates, setAllCandidates] = useState(initialCandidates);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<MalshabimCandidateStatus>("בטיפול");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [filters, setFilters] = useState<MalshabimCandidateFilters>(DEFAULT_FILTERS);

  const candidates = useMemo(
    () => allCandidates.filter((c) => !c.is_draft),
    [allCandidates],
  );
  const drafts = useMemo(
    () => allCandidates.filter((c) => c.is_draft),
    [allCandidates],
  );

  const filtered = useMemo(
    () => filterCandidates(candidates, filters),
    [candidates, filters],
  );

  const filteredIdSet = useMemo(
    () => new Set(filtered.map((c) => c.id)),
    [filtered],
  );
  const visibleSelectedIds = useMemo(
    () => selectedIds.filter((id) => filteredIdSet.has(id)),
    [selectedIds, filteredIdSet],
  );

  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(
      CANDIDATE_STATUSES.map((status) => [status, 0]),
    ) as Record<MalshabimCandidateStatus, number>;
    for (const c of candidates) {
      counts[normalizeCandidateStatus(c.candidate_status)] += 1;
    }
    return counts;
  }, [candidates]);

  const stats = {
    total: candidates.length,
    drafts: drafts.length,
    quizPassed: candidates.filter((c) => c.quiz_passed).length,
    quizFailed: candidates.filter((c) => !c.quiz_passed).length,
  };

  const selectedStatuses = asSelectedList(filters.candidateStatus);
  const selectedTracks = asSelectedList(filters.track);
  const selectedStatusTypes = asSelectedList(filters.statusType);
  const selectedRequestTypes = asSelectedList(filters.requestType);
  const selectedEnlistmentMonths = filters.enlistmentMonths || [];

  const setFilter = <K extends keyof MalshabimCandidateFilters>(
    key: K,
    value: MalshabimCandidateFilters[K],
  ) => setFilters((prev) => ({ ...prev, [key]: value }));

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSelectedIds([]);
  };

  const toggleMulti = (
    key: "track" | "candidateStatus" | "statusType" | "requestType" | "enlistmentMonths",
    value: string,
  ) => {
    const current =
      key === "enlistmentMonths"
        ? filters.enlistmentMonths || []
        : asSelectedList(filters[key]);
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    setFilter(key, next);
  };

  const toggleStatusFilter = (status: MalshabimCandidateStatus) => {
    toggleMulti("candidateStatus", status);
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

  const patchStatus = async (id: string, status: MalshabimCandidateStatus) => {
    await malshabimFetch(`/api/malshabim/candidates/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        candidate_status: status,
        update_log_entry: { changes: `סטטוס עודכן ל: ${status}` },
      }),
    });
  };

  const moveTo = async (id: string, status: MalshabimCandidateStatus) => {
    if (!canEdit) return;
    const prev = allCandidates;
    setAllCandidates((list) =>
      list.map((c) => (c.id === id ? { ...c, candidate_status: status } : c)),
    );
    try {
      await patchStatus(id, status);
    } catch {
      setAllCandidates(prev);
      toast.error("עדכון סטטוס נכשל");
    }
  };

  const advanceStatus = async (candidate: MalshabimCandidate) => {
    const current = normalizeCandidateStatus(candidate.candidate_status);
    await moveTo(candidate.id, nextStatus(current));
  };

  const applyBulkStatus = async () => {
    if (!canEdit || visibleSelectedIds.length === 0) return;
    setBulkSaving(true);
    const targetIds = visibleSelectedIds;
    const prev = allCandidates;
    setAllCandidates((list) =>
      list.map((c) =>
        targetIds.includes(c.id) ? { ...c, candidate_status: bulkStatus } : c,
      ),
    );
    try {
      await Promise.all(targetIds.map((id) => patchStatus(id, bulkStatus)));
      toast.success(`עודכן סטטוס ל־${targetIds.length} תיקים`);
      setSelectedIds([]);
    } catch {
      setAllCandidates(prev);
      toast.error("עדכון מרובה נכשל");
    } finally {
      setBulkSaving(false);
    }
  };

  const greenBtn =
    "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700";
  const purpleBtn =
    "inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700";

  return (
    <div className={pageShellClass} dir="rtl">
      {/* Header like reference */}
      <section className="rounded-3xl border border-border-weak bg-surface-1 p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-accent-primary sm:text-3xl">
              טבלת עבודה
            </h1>
            <p className="mt-1 text-sm font-medium text-text-secondary">
              ריכוז מועמדים, סינון מסלול ושינוי סטטוס מהיר
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/malshabim/statistics" className={purpleBtn}>
              <BarChart3 className="h-4 w-4" /> ייצוא לסטטיסטיקה
            </Link>
            <button
              type="button"
              className={greenBtn}
              onClick={() => downloadCandidatesExcel(filtered)}
            >
              <Download className="h-4 w-4" /> Excel
            </button>
            <button
              type="button"
              className={greenBtn}
              onClick={() => downloadCandidatesCsv(filtered)}
            >
              <Download className="h-4 w-4" /> CSV
            </button>
            <Link href="/malshabim" className={secondaryButtonClass}>
              <ArrowRight className="h-4 w-4" /> חזרה לבית
            </Link>
          </div>
        </div>
      </section>

      {/* Stats cubes */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
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
          href="/malshabim/drafts"
          icon={<FileText className="h-5 w-5" />}
          label="ראיונות שלא הושלמו"
          value={stats.drafts}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="עברו מבחן"
          value={stats.quizPassed}
          tone="bg-emerald-600/15 text-emerald-700"
        />
        <StatCard
          icon={<XCircle className="h-5 w-5" />}
          label="לא עברו מבחן"
          value={stats.quizFailed}
          tone="bg-rose-600/15 text-rose-700"
        />
      </div>

      {/* Advanced filters — always open like reference */}
      <section className="rounded-3xl border border-border-weak bg-surface-2/70 p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1.5 text-xs font-bold text-text-muted sm:col-span-2 lg:col-span-1">
            חיפוש חופשי
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                className="w-full rounded-xl border border-border-weak bg-surface-1 py-2.5 ps-10 pe-3 text-sm font-semibold text-text-primary outline-none focus:ring-2 focus:ring-accent-primary/30"
                placeholder="מס׳ תיק, שם, טלפון, ת.ז…"
                value={filters.search || ""}
                onChange={(e) => setFilter("search", e.target.value)}
              />
            </div>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-bold text-text-muted">
            סטטוס עודכן מ-
            <input
              type="date"
              className={selectClass}
              value={filters.fromDate || ""}
              onChange={(e) => setFilter("fromDate", e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-bold text-text-muted">
            סטטוס עודכן עד
            <input
              type="date"
              className={selectClass}
              value={filters.toDate || ""}
              onChange={(e) => setFilter("toDate", e.target.value)}
            />
          </label>
          <div className="flex flex-wrap items-end gap-2 sm:col-span-2">
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={clearFilters}
            >
              <RefreshCw className="h-4 w-4" /> ניקוי
            </button>
            <span className="pb-2 text-xs font-bold text-text-muted">
              {filtered.length} מתוך {stats.total}
            </span>
          </div>

          <SearchableMultiSelect
            label="מסלול גיוס"
            value={selectedTracks}
            onChange={(next) => setFilter("track", next)}
            options={[
              { value: FILTER_EMPTY_VALUE, label: "ללא מסלול" },
              ...RECRUITMENT_TRACKS.map((t) => ({ value: t, label: t })),
            ]}
          />
          <SearchableMultiSelect
            label="סטטוס (מלש״ב / חייל)"
            value={selectedStatusTypes}
            onChange={(next) => setFilter("statusType", next)}
            options={STATUS_TYPES.map((type) => ({ value: type, label: type }))}
          />
          <SearchableMultiSelect
            label="סטטוס עבודה"
            value={selectedStatuses}
            onChange={(next) => setFilter("candidateStatus", next)}
            options={CANDIDATE_STATUSES.map((status) => ({
              value: status,
              label: status,
            }))}
          />
          <SearchableMultiSelect
            label="איתור / בקשה"
            value={selectedRequestTypes}
            onChange={(next) => setFilter("requestType", next)}
            options={[
              { value: FILTER_EMPTY_VALUE, label: "ללא" },
              ...REQUEST_TYPES.map((type) => ({ value: type, label: type })),
            ]}
          />
          <MonthYearRangeSelect
            label="חודשי גיוס"
            value={selectedEnlistmentMonths}
            onChange={(next) => setFilter("enlistmentMonths", next)}
            fromYear={2024}
            toYear={2028}
          />
        </div>
      </section>

      {/* Bulk bar */}
      <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-border-weak bg-surface-1 px-3 py-3 shadow-sm sm:px-4">
        <div className="ms-auto flex items-center gap-1 rounded-xl bg-surface-2 p-1">
          <button
            type="button"
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold ${
              viewMode === "table"
                ? "bg-accent-primary text-white"
                : "text-text-secondary"
            }`}
            onClick={() => setViewMode("table")}
          >
            <List className="h-3.5 w-3.5" /> טבלה
          </button>
          <button
            type="button"
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold ${
              viewMode === "kanban"
                ? "bg-accent-primary text-white"
                : "text-text-secondary"
            }`}
            onClick={() => setViewMode("kanban")}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> קנבן
          </button>
        </div>

        {canEdit ? (
          <>
            <label className="inline-flex items-center gap-2 text-xs font-bold text-text-secondary">
              <input
                type="checkbox"
                checked={
                  filtered.length > 0 &&
                  filtered.every((c) => selectedIds.includes(c.id))
                }
                onChange={toggleSelectAllFiltered}
              />
              סימון כל המוצגים ({visibleSelectedIds.length})
            </label>
            <select
              className={`${selectClass} !w-auto`}
              value={bulkStatus}
              onChange={(e) =>
                setBulkStatus(e.target.value as MalshabimCandidateStatus)
              }
            >
              {CANDIDATE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900"
              disabled={bulkSaving || visibleSelectedIds.length === 0}
              onClick={() => void applyBulkStatus()}
            >
              <Pencil className="h-3.5 w-3.5" />
              {bulkSaving ? "מעדכן…" : "עדכון סטטוס מסומנים"}
            </button>
          </>
        ) : null}
      </section>

      {filtered.length === 0 ? (
        <p className={emptyStateClass}>אין מועמדים להצגה</p>
      ) : viewMode === "kanban" ? (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
          {CANDIDATE_STATUSES.map((status) => {
            const rows = filtered.filter(
              (c) => normalizeCandidateStatus(c.candidate_status) === status,
            );
            return (
              <section
                key={status}
                className="rounded-2xl border border-border-weak bg-surface-1 p-3 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_BADGE_CLASS[status]}`}
                  >
                    {status}
                  </span>
                  <span className="text-xs font-bold text-text-muted">{rows.length}</span>
                </div>
                <ul className="space-y-2">
                  {rows.map((c) => (
                    <li
                      key={c.id}
                      className="rounded-xl border border-border-weak bg-surface-2/60 px-3 py-2"
                    >
                      <p className="font-bold text-text-primary">
                        {c.full_name || "ללא שם"}
                      </p>
                      <p className="text-xs text-text-muted">
                        #{c.serial_number ?? "—"} · {c.recruitment_track || "—"}
                      </p>
                      <Link
                        href={`/malshabim/candidates/${c.id}`}
                        className="mt-2 inline-flex text-xs font-bold text-accent-primary"
                      >
                        פתח תיק
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-border-weak bg-surface-1 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-right text-sm">
              <thead>
                <tr className="border-b border-border-weak bg-surface-2/80 text-[11px] font-bold tracking-wide text-text-muted">
                  {canEdit ? <th className="px-3 py-3"> </th> : null}
                  <th className="px-4 py-3">מס׳ תיק</th>
                  <th className="px-4 py-3">שם</th>
                  <th className="px-4 py-3">מסלול</th>
                  <th className="px-4 py-3">סטטוס עבודה</th>
                  <th className="px-4 py-3">סטטוס מורחב</th>
                  <th className="px-4 py-3">ראיון קרוב</th>
                  <th className="px-4 py-3">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, index) => {
                  const status = normalizeCandidateStatus(c.candidate_status);
                  const href = `/malshabim/candidates/${c.id}`;
                  return (
                    <tr
                      key={c.id}
                      className={`border-b border-border-weak/80 last:border-0 ${
                        index % 2 === 0 ? "bg-surface-1" : "bg-surface-2/30"
                      } hover:bg-accent-primary/5`}
                    >
                      {canEdit ? (
                        <td className="px-3 py-3.5">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(c.id)}
                            onChange={() => toggleSelected(c.id)}
                            aria-label={`בחר את ${c.full_name || "מועמד"}`}
                          />
                        </td>
                      ) : null}
                      <td className="px-4 py-3.5 font-semibold text-text-muted">
                        <Link href={href} className="hover:text-accent-primary">
                          #{c.serial_number ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-text-primary">
                        <Link href={href} className="hover:text-accent-primary">
                          {c.full_name || "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-text-secondary">
                        {c.recruitment_track || "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_BADGE_CLASS[status]}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {c.advanced_status ? (
                          <span className="inline-block rounded-full bg-sky-600/15 px-2.5 py-1 text-[11px] font-bold text-sky-800 dark:text-sky-200">
                            {c.advanced_status}
                          </span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-text-muted">
                        {c.interview_at ? formatDateTime(c.interview_at) : "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center gap-2">
                          {canEdit ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-900"
                              onClick={() => void advanceStatus(c)}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              סטטוס הבא
                            </button>
                          ) : null}
                          <Link
                            href={href}
                            className="inline-flex items-center gap-1 rounded-lg border border-border-weak bg-surface-1 px-3 py-1.5 text-xs font-bold text-text-primary"
                          >
                            <FolderOpen className="h-3.5 w-3.5" />
                            תיק
                          </Link>
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
