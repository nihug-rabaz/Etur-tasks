"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Plus,
  Search,
  Upload,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  CANDIDATE_STATUSES,
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
import type { MalshabimCandidate } from "@/modules/malshabim/types";
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
  const [importing, setImporting] = useState(false);
  const [filters, setFilters] = useState<MalshabimCandidateFilters>({
    search: "",
    track: "all",
    candidateStatus: [],
    requestType: [],
  });

  const drafts = useMemo(
    () => initialCandidates.filter((c) => c.is_draft),
    [initialCandidates],
  );
  const active = useMemo(
    () => initialCandidates.filter((c) => !c.is_draft),
    [initialCandidates],
  );
  const filtered = useMemo(
    () => filterCandidates(active, filters),
    [active, filters],
  );

  const stats = {
    total: active.length,
    interviews: drafts.length,
    quizPassed: active.filter((c) => c.quiz_passed).length,
  };

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

  const onImportFile = async (file: File | null) => {
    if (!file || !isAdmin) return;
    setImporting(true);
    try {
      const rows = await parseTemplateFile(file);
      const candidates = templateRowsToImportPayload(rows);
      if (candidates.length === 0) {
        toast.error("לא נמצאו שורות לייבוא");
        return;
      }
      const result = await malshabimFetch<{
        inserted?: number;
        updated?: number;
        skipped?: number;
      }>("/api/malshabim/import", {
        method: "POST",
        body: JSON.stringify({ candidates }),
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
      <article className={`${panelClass} space-y-4 p-4 sm:p-5`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className={pageTitleClass}>מלש״בים</h1>
            <p className={pageSubtitleClass}>
              {filtered.length} מועמדים מוצגים · {stats.total} פעילים
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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

        <div className="grid gap-2 sm:grid-cols-3">
          <StatCard icon={Users} label="סה״כ מועמדים" value={stats.total} />
          <StatCard icon={FileText} label="ראיון" value={stats.interviews} />
          <StatCard icon={CheckCircle2} label="עברו מבחן" value={stats.quizPassed} />
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              className={searchClass}
              placeholder="חיפוש לפי שם, טלפון, ת.ז, עיר…"
              value={filters.search || ""}
              onChange={(e) => setFilter("search", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
            <select
              className={selectClass}
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
                className="inline-flex items-center gap-1 rounded-full bg-surface-2/80 px-3 py-2 text-xs font-bold text-text-secondary transition hover:bg-surface-2"
                onClick={clearFilters}
              >
                <X className="h-3.5 w-3.5" /> נקה
              </button>
            ) : null}
          </div>
        </div>
      </article>

      {drafts.length > 0 ? (
        <article className={`${panelClass} p-4 sm:p-5`}>
          <h2 className="mb-3 text-base font-bold text-text-primary">ראיון</h2>
          <ul className="divide-y divide-border-weak">
            {drafts.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/malshabim/interview?id=${c.id}`}
                  className="flex items-center justify-between gap-3 py-3 transition hover:opacity-80"
                >
                  <div>
                    <p className="font-bold text-text-primary">{c.full_name || "ללא שם"}</p>
                    <p className="text-xs font-medium text-text-muted">
                      שלב {(c.draft_step ?? 0) + 1} · {c.phone || "—"}
                    </p>
                  </div>
                  <span className="rounded-full bg-accent-primary/12 px-2.5 py-1 text-xs font-bold text-accent-primary">
                    ראיון
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </article>
      ) : null}

      <article className={`${panelClass} overflow-hidden`}>
        <div className="border-b border-border-weak px-4 py-3 sm:px-5">
          <h2 className="text-base font-bold text-text-primary">מועמדים ({filtered.length})</h2>
        </div>
        {filtered.length === 0 ? (
          <div className="p-4">
            <p className={emptyStateClass}>אין מועמדים להצגה</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-right text-sm">
              <thead className={tableHeadClass}>
                <tr>
                  <th className="px-4 py-3">מס׳</th>
                  <th className="px-4 py-3">שם</th>
                  <th className="px-4 py-3">טלפון</th>
                  <th className="px-4 py-3">עיר</th>
                  <th className="px-4 py-3">סטטוס</th>
                  <th className="px-4 py-3">מסלול</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const status = normalizeCandidateStatus(c.candidate_status);
                  return (
                    <tr key={c.id} className={tableRowClass}>
                      <td className="px-4 py-3 font-semibold text-text-muted">
                        <Link href={`/malshabim/candidates/${c.id}`}>
                          {c.serial_number ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-bold text-text-primary">
                        <Link href={`/malshabim/candidates/${c.id}`}>
                          {c.full_name || "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{c.phone || "—"}</td>
                      <td className="px-4 py-3 text-text-secondary">{c.city || "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_COLORS[status]}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {c.recruitment_track || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <div className={`${cardClass} flex items-center gap-3 p-3 sm:p-4`}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-primary/12 text-accent-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-semibold text-text-muted">{label}</p>
        <p className="text-xl font-bold text-text-primary sm:text-2xl">{value}</p>
      </div>
    </div>
  );
}
