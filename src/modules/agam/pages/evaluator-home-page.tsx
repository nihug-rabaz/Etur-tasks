"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, ChevronLeft, Loader2, Search } from "lucide-react";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { formatAgamDate } from "@/modules/agam/lib/date-format";
import { EVALUATOR_ENTRIES, entryTone, type EvaluatorEntryMeta } from "@/modules/agam/lib/evaluator-entries";
import {
  dividerTopClass,
  fieldClass,
  pageShellClass,
  panelClass,
  panelPadClass,
  quietTabActiveClass,
  quietTabIdleClass,
} from "@/modules/agam/lib/ui";
import type {
  EvaluatorCycleSummary,
  EvaluatorEntryState,
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

function ActiveCyclePicker({ payload, onChanged }: { payload: RosterPayload; onChanged: () => void }) {
  const [saving, setSaving] = useState(false);

  const save = async (cycleId: string) => {
    setSaving(true);
    try {
      await agamFetch("/api/agam/evaluate", {
        method: "PUT",
        body: JSON.stringify({ cycleId: cycleId || null }),
      });
      toast.success(cycleId ? "המחזור הפעיל עודכן" : "המחזור הפעיל ייבחר אוטומטית");
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "העדכון נכשל");
    } finally {
      setSaving(false);
    }
  };

  const groups = [
    { label: "מחזורים עם מועמדים", rows: payload.cycles.filter((cycle) => cycle.candidate_count > 0) },
    { label: "מחזורים ריקים", rows: payload.cycles.filter((cycle) => cycle.candidate_count === 0) },
  ].filter((group) => group.rows.length > 0);

  return (
    <label className="flex w-full flex-col gap-1 sm:w-72">
      <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-text-muted">
        המחזור שמוצג למעריכים
        {saving ? <Loader2 size={11} className="animate-spin" /> : null}
      </span>
      <select
        value={payload.pinnedCycleId ?? ""}
        disabled={saving}
        onChange={(event) => void save(event.target.value)}
        className={`${fieldClass} cursor-pointer py-2`}
      >
        <option value="">אוטומטי — המחזור הקרוב שיש בו מועמדים</option>
        {groups.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.rows.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycleLabel(cycle)}
                {cycle.candidate_count > 0 ? ` · ${cycle.candidate_count} מועמדים` : ""}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

function EntryCell({ meta, entry }: { meta: EvaluatorEntryMeta; entry: EvaluatorEntryState }) {
  const tone = entryTone(entry);
  if (tone === "mine") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
        <Check size={13} strokeWidth={2.75} />
        מילאתי
      </span>
    );
  }
  if (tone === "others") {
    return (
      <span className="text-xs font-semibold text-text-secondary" title={entry.by ?? undefined}>
        {meta.shared ? "בוצע" : `${entry.count} מעריכים`}
      </span>
    );
  }
  return <span className="text-xs text-text-muted/60">—</span>;
}

function RosterTable({ candidates }: { candidates: EvaluatorRosterItem[] }) {
  const router = useRouter();
  const thClass = "px-3 py-2.5 text-start text-[11px] font-extrabold text-text-muted first:ps-4 last:pe-4";
  const rowClass =
    "[&:not(:first-child)]:shadow-[inset_0_1px_0_rgba(20,33,43,0.06)] dark:[&:not(:first-child)]:shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]";

  return (
    <div className="overflow-hidden rounded-2xl bg-surface-1 shadow-[0_0_0_1px_rgba(20,33,43,0.07),0_8px_24px_rgba(20,33,43,0.04)] dark:bg-[#181a22] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
      <table className="hidden w-full border-collapse text-sm md:table">
        <thead className="bg-surface-2/60">
          <tr>
            <th className={thClass}>מועמד</th>
            <th className={thClass}>פיקוד</th>
            {EVALUATOR_ENTRIES.map((meta) => (
              <th key={meta.kind} className={`${thClass} w-28`}>
                {meta.title}
              </th>
            ))}
            <th className={`${thClass} w-10`} aria-label="פתיחה" />
          </tr>
        </thead>
        <tbody>
          {candidates.map((candidate) => {
            const href = `/agam/evaluate/${candidate.id}`;
            return (
              <tr
                key={candidate.id}
                onClick={() => router.push(href)}
                className={`group cursor-pointer transition-colors hover:bg-accent-primary/[0.04] ${rowClass}`}
              >
                <td className="py-3 pe-3 ps-4">
                  <Link
                    href={href}
                    onClick={(event) => event.stopPropagation()}
                    className="block truncate font-extrabold text-text-primary transition group-hover:text-accent-primary"
                  >
                    {candidate.full_name}
                  </Link>
                  <span className="text-[11px] font-semibold tabular-nums text-text-muted" dir="ltr">
                    {candidate.personal_number}
                  </span>
                </td>
                <td className="max-w-[10rem] truncate px-3 py-3 text-xs font-semibold text-text-secondary">
                  {candidate.command || "—"}
                </td>
                {EVALUATOR_ENTRIES.map((meta) => (
                  <td key={meta.kind} className="px-3 py-3">
                    <EntryCell meta={meta} entry={candidate.entries[meta.kind]} />
                  </td>
                ))}
                <td className="py-3 pe-4 ps-1 text-text-muted transition group-hover:text-accent-primary">
                  <ChevronLeft size={16} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <ul className="md:hidden">
        {candidates.map((candidate) => (
          <li key={candidate.id} className={rowClass}>
            <Link
              href={`/agam/evaluate/${candidate.id}`}
              className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-accent-primary/[0.05]"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-extrabold text-text-primary">{candidate.full_name}</p>
                <p className="truncate text-[11px] font-semibold text-text-muted">
                  <span dir="ltr" className="tabular-nums">
                    {candidate.personal_number}
                  </span>
                  {candidate.command ? ` · ${candidate.command}` : ""}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                  {EVALUATOR_ENTRIES.map((meta) => {
                    const tone = entryTone(candidate.entries[meta.kind]);
                    return (
                      <span
                        key={meta.kind}
                        className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                          tone === "mine"
                            ? "text-emerald-700 dark:text-emerald-300"
                            : tone === "others"
                              ? "text-text-secondary"
                              : "text-text-muted/70"
                        }`}
                      >
                        {tone === "mine" ? (
                          <Check size={11} strokeWidth={3} />
                        ) : (
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${tone === "others" ? "bg-text-secondary" : "bg-text-muted/30"}`}
                          />
                        )}
                        {meta.short}
                      </span>
                    );
                  })}
                </div>
              </div>
              <ChevronLeft size={16} className="shrink-0 text-text-muted" />
            </Link>
          </li>
        ))}
      </ul>
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
  const touched = useMemo(() => candidates.filter(hasMine).length, [candidates]);

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

  if (loading) {
    return <p className="p-6 text-sm text-text-muted">טוען…</p>;
  }

  const cycle = payload?.cycle ?? null;
  const dates = cycle
    ? [
        { label: "יום מיונים", value: cycle.selection_day },
        { label: "יום מכין", value: cycle.prep_day },
        { label: "סמ״ח", value: cycle.smach_start },
      ].filter((row) => row.value)
    : [];

  return (
    <div className={pageShellClass} dir="rtl">
      <header className={`${panelClass} ${panelPadClass}`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">פורטל מעריכים</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-text-primary sm:text-[1.85rem]">
              {cycle ? `מחזור ${cycleLabel(cycle)}` : "אין מחזור פעיל"}
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              {cycle
                ? `${candidates.length} מועמדים · הערכת ${touched} מתוך ${candidates.length}`
                : "כשצוות הקורס יפתח מחזור מיון, המועמדים שלו יופיעו כאן"}
            </p>
            {dates.length > 0 ? (
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-text-muted">
                {dates.map((row) => (
                  <span key={row.label}>
                    {row.label}{" "}
                    <span className="font-bold tabular-nums text-text-secondary">{formatAgamDate(row.value)}</span>
                  </span>
                ))}
              </p>
            ) : null}
          </div>
          {payload?.canManage ? <ActiveCyclePicker payload={payload} onChanged={() => void load()} /> : null}
        </div>

        {cycle && candidates.length > 0 ? (
          <div className={`mt-4 flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between ${dividerTopClass}`}>
            <div className="relative sm:max-w-sm sm:flex-1">
              <Search size={15} className="pointer-events-none absolute inset-y-0 start-3 my-auto text-text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="חיפוש לפי שם, מספר אישי או פיקוד"
                className={`${fieldClass} ps-9`}
              />
            </div>
            <div className="flex gap-1 overflow-x-auto" role="tablist">
              {FILTERS.map((item) => {
                const active = filter === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilter(item.key)}
                    className={active ? quietTabActiveClass : quietTabIdleClass}
                  >
                    {item.label}
                    {active ? (
                      <span className="absolute inset-x-2.5 -bottom-px h-0.5 rounded-full bg-text-primary" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </header>

      {!cycle ? null : candidates.length === 0 ? (
        <p className={`${panelClass} ${panelPadClass} text-center text-sm text-text-muted`}>
          עדיין אין מועמדים במחזור.
        </p>
      ) : visible.length === 0 ? (
        <p className={`${panelClass} ${panelPadClass} text-center text-sm text-text-muted`}>
          לא נמצאו מועמדים.
        </p>
      ) : (
        <RosterTable candidates={visible} />
      )}
    </div>
  );
}
