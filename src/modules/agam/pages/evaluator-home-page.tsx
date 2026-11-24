"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Check, ChevronLeft, Loader2, Search, Settings2, UsersRound, X } from "lucide-react";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { formatAgamDate } from "@/modules/agam/lib/date-format";
import {
  EVALUATOR_ENTRIES,
  avatarTone,
  entryTone,
  initials,
} from "@/modules/agam/lib/evaluator-entries";
import type {
  EvaluatorCycleSummary,
  EvaluatorRosterItem,
} from "@/modules/agam/services/evaluator-portal.service";
import type { ModuleRole } from "@/shared/modules/types";

interface RosterPayload {
  cycle: EvaluatorCycleSummary | null;
  candidates: EvaluatorRosterItem[];
  me: { id: string; name: string | null; role: ModuleRole };
  canEvaluate: boolean;
  canManage: boolean;
  pinnedCycleId: string | null;
  cycles: EvaluatorCycleSummary[];
}

type Filter = "all" | "todo" | "mine" | "no_interview";

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "הכל" },
  { key: "todo", label: "טרם הערכתי" },
  { key: "mine", label: "הערכתי" },
  { key: "no_interview", label: "ללא ראיון" },
];

function hasMine(candidate: EvaluatorRosterItem): boolean {
  return EVALUATOR_ENTRIES.some((meta) => Boolean(candidate.entries[meta.kind].mineId));
}

function cycleLabel(cycle: EvaluatorCycleSummary): string {
  return cycle.cohort_year ? `${cycle.name} ${cycle.cohort_year}` : cycle.name;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "לילה טוב";
  if (hour < 12) return "בוקר טוב";
  if (hour < 17) return "צהריים טובים";
  if (hour < 21) return "ערב טוב";
  return "לילה טוב";
}

function ActiveCyclePicker({
  payload,
  onChanged,
}: {
  payload: RosterPayload;
  onChanged: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const value = payload.pinnedCycleId ?? "";

  const save = async (cycleId: string) => {
    setSaving(true);
    try {
      await agamFetch("/api/agam/evaluate", {
        method: "PUT",
        body: JSON.stringify({ cycleId: cycleId || null }),
      });
      toast.success(cycleId ? "המחזור הפעיל עודכן" : "המחזור הפעיל ייבחר אוטומטית לפי תאריך");
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "העדכון נכשל");
    } finally {
      setSaving(false);
    }
  };

  return (
    <label className="ui-card flex items-center gap-2.5 rounded-2xl bg-surface-1/80 px-3 py-2 backdrop-blur">
      <Settings2 size={15} className="shrink-0 text-text-muted" />
      <span className="shrink-0 text-[12px] font-extrabold text-text-secondary">מחזור פעיל למעריכים</span>
      <select
        value={value}
        disabled={saving}
        onChange={(event) => void save(event.target.value)}
        className="min-w-0 flex-1 cursor-pointer rounded-lg bg-transparent py-1 text-[13px] font-bold text-text-primary outline-none"
      >
        <option value="">אוטומטי — המחזור הקרוב שיש בו מועמדים</option>
        {[
          { label: "מחזורים עם מועמדים", rows: payload.cycles.filter((cycle) => cycle.candidate_count > 0) },
          { label: "מחזורים ריקים", rows: payload.cycles.filter((cycle) => cycle.candidate_count === 0) },
        ]
          .filter((group) => group.rows.length > 0)
          .map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.rows.map((cycle) => (
                <option key={cycle.id} value={cycle.id}>
                  {cycleLabel(cycle)}
                  {cycle.cycle_date ? ` · ${formatAgamDate(cycle.cycle_date)}` : ""}
                  {cycle.candidate_count > 0 ? ` · ${cycle.candidate_count} מועמדים` : ""}
                </option>
              ))}
            </optgroup>
          ))}
      </select>
      {saving ? <Loader2 size={14} className="animate-spin text-text-muted" /> : null}
    </label>
  );
}

function StatTile({ label, value, total, accent }: { label: string; value: number; total?: number; accent: string }) {
  const pct = total ? Math.round((value / Math.max(total, 1)) * 100) : null;
  return (
    <div className="rounded-2xl bg-surface-1/85 px-4 py-3 shadow-[0_0_0_1px_rgba(22,24,29,0.04)] backdrop-blur dark:bg-white/[0.04] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
      <p className="text-[11px] font-bold text-text-muted">{label}</p>
      <p className="mt-0.5 flex items-baseline gap-1 tabular-nums">
        <span className="text-2xl font-black tracking-tight text-text-primary">{value}</span>
        {total != null ? <span className="text-[13px] font-bold text-text-muted">/ {total}</span> : null}
      </p>
      {pct != null ? (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div className={`h-full rounded-full ${accent} transition-[width] duration-700`} style={{ width: `${pct}%` }} />
        </div>
      ) : null}
    </div>
  );
}

function EntryDots({ candidate }: { candidate: EvaluatorRosterItem }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {EVALUATOR_ENTRIES.map((meta) => {
        const entry = candidate.entries[meta.kind];
        const tone = entryTone(entry);
        const title =
          tone === "mine"
            ? `${meta.title}: מילאת`
            : tone === "others"
              ? meta.shared
                ? `${meta.title}: בוצע ע״י ${entry.by ?? "מעריך אחר"}`
                : `${meta.title}: ${entry.count} מעריכים`
              : `${meta.title}: טרם מולא`;
        return (
          <span
            key={meta.kind}
            title={title}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[11px] font-extrabold transition ${
              tone === "mine"
                ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                : tone === "others"
                  ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                  : "bg-surface-2 text-text-muted"
            }`}
          >
            {tone === "mine" ? (
              <Check size={11} strokeWidth={3} />
            ) : (
              <span className={`h-1.5 w-1.5 rounded-full ${tone === "others" ? "bg-sky-500" : "bg-text-muted/40"}`} />
            )}
            {meta.short}
            {tone === "others" && !meta.shared && entry.count > 0 ? (
              <span className="tabular-nums opacity-70">{entry.count}</span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

function CandidateCard({ candidate }: { candidate: EvaluatorRosterItem }) {
  const mine = hasMine(candidate);
  return (
    <Link
      href={`/agam/evaluate/${candidate.id}`}
      className="group relative flex flex-col gap-3.5 overflow-hidden rounded-[22px] bg-surface-1 p-4 shadow-[0_0_0_1px_rgba(22,24,29,0.05),0_10px_30px_-22px_rgba(22,24,29,0.35)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.35),0_18px_40px_-24px_rgba(16,185,129,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:bg-[#1a1c24] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.07)]"
    >
      {mine ? (
        <span aria-hidden className="absolute inset-y-0 start-0 w-1 bg-gradient-to-b from-emerald-400 to-teal-500" />
      ) : null}
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarTone(candidate.id)} text-[15px] font-black text-white shadow-sm`}
        >
          {initials(candidate.full_name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-extrabold text-text-primary">{candidate.full_name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-[12px] font-semibold text-text-muted">
            <span dir="ltr" className="tabular-nums">
              {candidate.personal_number}
            </span>
            {candidate.command ? (
              <>
                <span aria-hidden>·</span>
                <span className="truncate">{candidate.command}</span>
              </>
            ) : null}
          </p>
        </div>
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-text-muted transition group-hover:bg-emerald-500 group-hover:text-white">
          <ChevronLeft size={16} />
        </span>
      </div>
      <EntryDots candidate={candidate} />
    </Link>
  );
}

function RosterSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-[7.5rem] animate-pulse rounded-[22px] bg-surface-1/70" />
      ))}
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col items-center rounded-[24px] bg-surface-1/80 px-6 py-14 text-center shadow-[0_0_0_1px_rgba(22,24,29,0.04)] dark:bg-white/[0.03]">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-text-muted">
        <UsersRound size={26} />
      </span>
      <p className="mt-4 text-base font-extrabold text-text-primary">{title}</p>
      <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-text-muted">{text}</p>
    </div>
  );
}

export function AgamEvaluatorHomePage() {
  const [payload, setPayload] = useState<RosterPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    try {
      setPayload(await agamFetch<RosterPayload>("/api/agam/evaluate"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "טעינת המחזור נכשלה");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const candidates = useMemo(() => payload?.candidates ?? [], [payload]);
  const stats = useMemo(() => {
    const total = candidates.length;
    return {
      total,
      interviews: candidates.filter((row) => row.entries.interview.done).length,
      touched: candidates.filter(hasMine).length,
      myEntries: candidates.reduce(
        (sum, row) => sum + EVALUATOR_ENTRIES.filter((meta) => row.entries[meta.kind].mineId).length,
        0,
      ),
    };
  }, [candidates]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidates.filter((row) => {
      if (q && !`${row.full_name} ${row.personal_number} ${row.command ?? ""}`.toLowerCase().includes(q)) return false;
      if (filter === "todo") return !hasMine(row);
      if (filter === "mine") return hasMine(row);
      if (filter === "no_interview") return !row.entries.interview.done;
      return true;
    });
  }, [candidates, query, filter]);

  const firstName = payload?.me.name?.trim().split(/\s+/)[0] ?? "";
  const cycle = payload?.cycle ?? null;
  const dates = cycle
    ? [
        { label: "יום מיונים", value: cycle.selection_day },
        { label: "יום מכין", value: cycle.prep_day },
        { label: "סמ״ח", value: cycle.smach_start },
      ].filter((row) => row.value)
    : [];

  return (
    <div className="flex flex-col gap-5" dir="rtl">
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-bl from-emerald-600 via-teal-600 to-sky-700 px-5 pb-5 pt-6 text-white shadow-[0_24px_60px_-30px_rgba(13,148,136,0.75)] sm:px-7 sm:pt-7">
        <div aria-hidden className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 right-10 h-56 w-56 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="relative">
          <p className="text-[13px] font-bold text-white/75">
            {greeting()}
            {firstName ? `, ${firstName}` : ""}
          </p>
          <h1 className="mt-1 text-[1.75rem] font-black leading-tight tracking-tight sm:text-[2rem]">
            {loading ? "טוען מחזור…" : cycle ? `מחזור ${cycleLabel(cycle)}` : "אין מחזור פעיל"}
          </h1>
          <p className="mt-1 text-[13px] font-semibold text-white/75">
            בחרו מועמד כדי להוסיף ראיון והערכות. ההערכה שלכם נשמרת ישירות לתיק.
          </p>
          {dates.length > 0 ? (
            <div className="mt-3.5 flex flex-wrap gap-1.5">
              {dates.map((row) => (
                <span
                  key={row.label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-bold backdrop-blur"
                >
                  <CalendarDays size={12} />
                  {row.label}
                  <span className="tabular-nums text-white/80">{formatAgamDate(row.value)}</span>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {payload?.canManage ? <ActiveCyclePicker payload={payload} onChanged={() => void load()} /> : null}

      {cycle && candidates.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <StatTile label="מועמדים במחזור" value={stats.total} accent="bg-emerald-500" />
          <StatTile label="ראיונות שבוצעו" value={stats.interviews} total={stats.total} accent="bg-violet-500" />
          <StatTile label="מועמדים שהערכתי" value={stats.touched} total={stats.total} accent="bg-emerald-500" />
          <StatTile label="ההערכות שלי" value={stats.myEntries} accent="bg-sky-500" />
        </div>
      ) : null}

      {cycle && candidates.length > 0 ? (
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute inset-y-0 start-3.5 my-auto text-text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="חיפוש לפי שם, מספר אישי או פיקוד"
              className="ui-field h-11 w-full rounded-2xl bg-surface-1 pe-10 ps-10 text-sm font-semibold text-text-primary outline-none placeholder:text-text-muted"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="ניקוי חיפוש"
                className="absolute inset-y-0 end-2 my-auto inline-flex h-7 w-7 items-center justify-center rounded-full text-text-muted hover:bg-surface-2"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
          <div className="flex gap-1 overflow-x-auto rounded-2xl bg-surface-2/80 p-1" role="tablist">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={filter === item.key}
                onClick={() => setFilter(item.key)}
                className={`shrink-0 rounded-xl px-3 py-1.5 text-[12px] font-extrabold transition ${
                  filter === item.key
                    ? "bg-surface-1 text-text-primary shadow-sm"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {loading ? (
        <RosterSkeleton />
      ) : !cycle ? (
        <EmptyState title="אין מחזור פעיל כרגע" text="כשצוות הקורס יפתח מחזור מיון, המועמדים שלו יופיעו כאן." />
      ) : candidates.length === 0 ? (
        <EmptyState title="עדיין אין מועמדים במחזור" text="מועמדים שישויכו למחזור יופיעו כאן אוטומטית." />
      ) : visible.length === 0 ? (
        <EmptyState title="לא נמצאו מועמדים" text="נסו חיפוש אחר או החליפו סינון." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((candidate) => (
            <CandidateCard key={candidate.id} candidate={candidate} />
          ))}
        </div>
      )}

      {cycle && candidates.length > 0 ? (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] font-bold text-text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Check size={11} strokeWidth={3} className="text-emerald-600" />
            מילאתי
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            מולא ע״י מעריכים אחרים
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-text-muted/40" />
            טרם מולא
          </span>
        </div>
      ) : null}
    </div>
  );
}
