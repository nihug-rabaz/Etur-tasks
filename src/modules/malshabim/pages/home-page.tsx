"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Download,
  FileText,
  Plus,
  Search,
  Users,
} from "lucide-react";
import {
  ADVANCED_STATUSES,
  CANDIDATE_STATUSES,
  STATUS_COLORS,
  ADVANCED_STATUS_COLORS,
  filterCandidates,
  type MalshabimCandidateFilters,
} from "@/modules/malshabim/lib/status";
import { RECRUITMENT_TRACKS, REQUEST_TYPES } from "@/modules/malshabim/lib/question-bank";
import { downloadCandidatesCsv } from "@/modules/malshabim/lib/csv";
import {
  emptyStateClass,
  fieldClass,
  pageShellClass,
  panelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/modules/malshabim/lib/ui";
import type { MalshabimCandidate } from "@/modules/malshabim/types";
import type { ModuleRole } from "@/shared/modules/types";

function canEditRole(role: ModuleRole | null): boolean {
  return role === "admin" || role === "user";
}

export function MalshabimHomePage({
  initialCandidates,
  initialRole,
}: {
  initialCandidates: MalshabimCandidate[];
  initialRole: ModuleRole;
}) {
  const canEdit = canEditRole(initialRole);
  const [filters, setFilters] = useState<MalshabimCandidateFilters>({
    search: "",
    track: "all",
    candidateStatus: "all",
    advancedStatus: "all",
    requestType: "all",
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
    drafts: drafts.length,
    quizPassed: active.filter((c) => c.quiz_passed).length,
  };

  const setFilter = <K extends keyof MalshabimCandidateFilters>(
    key: K,
    value: MalshabimCandidateFilters[K],
  ) => setFilters((prev) => ({ ...prev, [key]: value }));

  return (
    <div className={pageShellClass} dir="rtl">
      <article
        className={`${panelClass} flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6`}
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            מדור אומ״ץ
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-text-primary">
            מלש״בים
          </h1>
          <p className="mt-2 max-w-xl text-sm text-text-secondary">
            ראיונות, תיקי מועמדים, לוח עבודה וסטטיסטיקה
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
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
          </div>
        </div>
      </article>

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={Users} label="סה״כ מועמדים" value={stats.total} />
        <StatCard icon={FileText} label="טיוטות" value={stats.drafts} />
        <StatCard icon={CheckCircle2} label="עברו מבחן" value={stats.quizPassed} />
      </section>

      <article className={`${panelClass} space-y-4 p-4 sm:p-5`}>
        <div className="relative">
          <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            className={`${fieldClass} pe-10`}
            placeholder="חיפוש לפי שם, טלפון, ת.ז, עיר…"
            value={filters.search || ""}
            onChange={(e) => setFilter("search", e.target.value)}
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <select
            className={fieldClass}
            value={filters.track || "all"}
            onChange={(e) => setFilter("track", e.target.value)}
          >
            <option value="all">כל המסלולים</option>
            {RECRUITMENT_TRACKS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            className={fieldClass}
            value={filters.candidateStatus || "all"}
            onChange={(e) => setFilter("candidateStatus", e.target.value)}
          >
            <option value="all">כל הסטטוסים</option>
            {CANDIDATE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className={fieldClass}
            value={filters.advancedStatus || "all"}
            onChange={(e) => setFilter("advancedStatus", e.target.value)}
          >
            <option value="all">סטטוס מורחב</option>
            {ADVANCED_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className={fieldClass}
            value={filters.requestType || "all"}
            onChange={(e) => setFilter("requestType", e.target.value)}
          >
            <option value="all">איתור / בקשה</option>
            {REQUEST_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </article>

      {drafts.length > 0 ? (
        <article className={`${panelClass} p-4 sm:p-5`}>
          <h2 className="mb-3 text-lg font-bold text-text-primary">טיוטות</h2>
          <ul className="divide-y divide-black/5 dark:divide-white/10">
            {drafts.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/malshabim/interview?id=${c.id}`}
                  className="flex items-center justify-between gap-3 py-3 transition hover:opacity-80"
                >
                  <div>
                    <p className="font-bold text-text-primary">{c.full_name || "ללא שם"}</p>
                    <p className="text-xs text-text-muted">
                      שלב {((c.draft_step ?? 0) + 1)} · {c.phone || "—"}
                    </p>
                  </div>
                  <span className="rounded-lg bg-amber-500/15 px-2 py-1 text-xs font-bold text-amber-700">
                    טיוטה
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </article>
      ) : null}

      <article className={`${panelClass} overflow-hidden`}>
        <div className="border-b border-black/5 px-4 py-3 dark:border-white/10 sm:px-5">
          <h2 className="text-lg font-bold text-text-primary">
            מועמדים ({filtered.length})
          </h2>
        </div>
        {filtered.length === 0 ? (
          <p className={emptyStateClass}>אין מועמדים להצגה</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-right text-sm">
              <thead className="bg-surface-2/50 text-xs font-bold text-text-muted">
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
                  const status = (c.candidate_status || "חדש") as keyof typeof STATUS_COLORS;
                  const adv = (c.advanced_status ||
                    "בטיפול") as keyof typeof ADVANCED_STATUS_COLORS;
                  return (
                    <tr
                      key={c.id}
                      className="border-t border-black/5 transition hover:bg-surface-2/40 dark:border-white/10"
                    >
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
                        <div className="flex flex-wrap gap-1">
                          <span
                            className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${STATUS_COLORS[status] || "bg-surface-2"}`}
                          >
                            {c.candidate_status || "חדש"}
                          </span>
                          {c.candidate_status !== "הושלם" ? (
                            <span
                              className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${ADVANCED_STATUS_COLORS[adv] || "bg-surface-2"}`}
                            >
                              {c.advanced_status || "בטיפול"}
                            </span>
                          ) : null}
                        </div>
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
    <div className={`${panelClass} flex items-center gap-3 p-4`}>
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-primary/12 text-accent-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-semibold text-text-muted">{label}</p>
        <p className="text-2xl font-extrabold text-text-primary">{value}</p>
      </div>
    </div>
  );
}
