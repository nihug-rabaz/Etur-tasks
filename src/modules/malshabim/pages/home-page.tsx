"use client";

import { useMemo, useRef, useState } from "react";
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
  const [importing, setImporting] = useState(false);
  const [candidates, setCandidates] = useState(initialCandidates);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
  const filtered = useMemo(
    () => filterCandidates(active, filters),
    [active, filters],
  );

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
    Boolean(filters.search?.trim()) ||
    (filters.track && filters.track !== "all") ||
    selectedStatuses.length > 0 ||
    selectedRequestTypes.length > 0;

  const clearFilters = () =>
    setFilters({ search: "", track: "all", candidateStatus: [], requestType: [] });

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
      <div className={`${panelClass} min-w-0 overflow-hidden p-4 sm:p-5`}>
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
                      <td className="px-4 py-3">
                        <Link
                          href={`/malshabim/candidates/${c.id}`}
                          className="inline-flex items-center gap-1 rounded-full bg-accent-primary/12 px-2.5 py-1 text-xs font-bold text-accent-primary transition hover:bg-accent-primary/20"
                          aria-label={`פתח תיק של ${c.full_name || "מועמד"}`}
                        >
                          כניסה
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
