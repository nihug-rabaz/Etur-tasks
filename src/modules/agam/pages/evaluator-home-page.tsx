"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, ChevronLeft, Lock, Loader2, Pencil, Plus, Search, Users } from "lucide-react";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { formatAgamDate } from "@/modules/agam/lib/date-format";
import { EVALUATOR_ENTRIES, entryTone, type EvaluatorEntryMeta } from "@/modules/agam/lib/evaluator-entries";
import {
  dividerTopClass,
  fieldClass,
  pageShellClass,
  panelClass,
  panelPadClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/modules/agam/lib/ui";
import type {
  EvaluatorCycleSummary,
  EvaluatorEntryKind,
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

type StageTab = "all" | EvaluatorEntryKind;
type StatusFilter = "all" | "todo" | "done";

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "הכל" },
  { key: "todo", label: "למילוי" },
  { key: "done", label: "מילאתי" },
];

function cycleLabel(cycle: EvaluatorCycleSummary): string {
  return cycle.cohort_year ? `${cycle.name} ${cycle.cohort_year}` : cycle.name;
}

function isMine(entry: EvaluatorEntryState): boolean {
  return Boolean(entry.mineId);
}

function isTodoForMe(meta: EvaluatorEntryMeta, entry: EvaluatorEntryState): boolean {
  if (meta.shared) return !entry.done;
  return !entry.mineId;
}

function mineCount(candidate: EvaluatorRosterItem): number {
  return EVALUATOR_ENTRIES.filter((meta) => isMine(candidate.entries[meta.kind])).length;
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

function StageTabs({
  active,
  onChange,
  candidates,
}: {
  active: StageTab;
  onChange: (kind: StageTab) => void;
  candidates: EvaluatorRosterItem[];
}) {
  const allTodo = candidates.filter((row) =>
    EVALUATOR_ENTRIES.some((meta) => isTodoForMe(meta, row.entries[meta.kind])),
  ).length;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" role="tablist" aria-label="סוגי מילוי">
      <button
        type="button"
        role="tab"
        aria-selected={active === "all"}
        onClick={() => onChange("all")}
        className={`rounded-2xl px-3.5 py-3.5 text-start transition ${
          active === "all"
            ? "bg-accent-primary text-white shadow-[0_12px_28px_-14px_color-mix(in_srgb,var(--accent-primary)_80%,transparent)]"
            : "bg-surface-2/80 text-text-primary hover:bg-surface-2"
        }`}
      >
        <span className="flex items-center gap-2">
          <span
            className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${
              active === "all" ? "bg-white/15 text-white" : "bg-surface-1 text-accent-primary"
            }`}
          >
            <Users size={16} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-extrabold">כל המועמדים</span>
            <span className={`mt-0.5 block text-[11px] font-bold ${active === "all" ? "text-white/75" : "text-text-muted"}`}>
              {candidates.length} במחזור
              {allTodo > 0 ? ` · ${allTodo} עם משימות` : ""}
            </span>
          </span>
        </span>
      </button>

      {EVALUATOR_ENTRIES.map((meta) => {
        const Icon = meta.icon;
        const selected = active === meta.kind;
        const todo = candidates.filter((row) => isTodoForMe(meta, row.entries[meta.kind])).length;
        const mine = candidates.filter((row) => isMine(row.entries[meta.kind])).length;
        return (
          <button
            key={meta.kind}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(meta.kind)}
            className={`rounded-2xl px-3.5 py-3.5 text-start transition ${
              selected
                ? "bg-accent-primary text-white shadow-[0_12px_28px_-14px_color-mix(in_srgb,var(--accent-primary)_80%,transparent)]"
                : "bg-surface-2/80 text-text-primary hover:bg-surface-2"
            }`}
          >
            <span className="flex items-center gap-2">
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${
                  selected ? "bg-white/15 text-white" : "bg-surface-1 text-accent-primary"
                }`}
              >
                <Icon size={16} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-extrabold">{meta.title}</span>
                <span className={`mt-0.5 block text-[11px] font-bold ${selected ? "text-white/75" : "text-text-muted"}`}>
                  {todo > 0 ? `${todo} למילוי` : mine > 0 ? `${mine} מולאו` : "אין מועמדים"}
                </span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function StageTile({
  candidateId,
  meta,
  entry,
  canEvaluate,
}: {
  candidateId: string;
  meta: EvaluatorEntryMeta;
  entry: EvaluatorEntryState;
  canEvaluate: boolean;
}) {
  const tone = entryTone(entry);
  const lockedByOther = meta.shared && tone === "others";
  const href = `/agam/evaluate/${candidateId}?form=${meta.kind}`;
  const Icon = meta.icon;

  const status =
    tone === "mine"
      ? entry.score != null
        ? `מילאתי · ${entry.score}`
        : "מילאתי"
      : lockedByOther
        ? entry.by
          ? `ע״י ${entry.by}`
          : "בוצע"
        : tone === "others"
          ? entry.count === 1
            ? "מעריך אחד"
            : `${entry.count} מעריכים`
          : meta.shared
            ? "למילוי"
            : "להוספה";

  const shellClass = `group flex h-full min-h-[5.75rem] flex-col justify-between rounded-2xl px-3.5 py-3 transition ${
    tone === "mine"
      ? "bg-emerald-500/[0.08] ring-1 ring-emerald-500/20 hover:bg-emerald-500/[0.12]"
      : lockedByOther
        ? "bg-surface-2/70 ring-1 ring-transparent"
        : "bg-surface-2/80 ring-1 ring-transparent hover:bg-accent-primary/10 hover:ring-accent-primary/20"
  }`;

  const actionBadge =
    tone === "mine" ? (
      <span
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.18)] dark:text-emerald-300"
        title="עריכה"
      >
        <Pencil size={14} strokeWidth={2.4} />
      </span>
    ) : lockedByOther ? (
      <span
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface-1 text-text-muted shadow-[inset_0_0_0_1px_rgba(20,33,43,0.06)]"
        title="נעול"
      >
        <Lock size={13} />
      </span>
    ) : (
      <span
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent-primary/12 text-accent-primary shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent-primary)_22%,transparent)] transition group-hover:bg-accent-primary group-hover:text-white group-hover:shadow-[0_8px_18px_-10px_color-mix(in_srgb,var(--accent-primary)_70%,transparent)]"
        title={meta.shared ? "מילוי" : "הוספה"}
      >
        <Plus size={16} strokeWidth={2.6} />
      </span>
    );

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span
          className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${
            tone === "mine"
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              : lockedByOther
                ? "bg-surface-1 text-text-muted"
                : "bg-surface-1 text-accent-primary"
          }`}
        >
          {tone === "mine" ? <Check size={15} strokeWidth={2.6} /> : <Icon size={15} />}
        </span>
        {actionBadge}
      </div>
      <div className="mt-3 min-w-0">
        <p className="truncate text-sm font-extrabold text-text-primary">{meta.short}</p>
        <p
          className={`mt-0.5 truncate text-[11px] font-bold ${
            tone === "mine" ? "text-emerald-700/90 dark:text-emerald-300/90" : "text-text-muted"
          }`}
        >
          {status}
        </p>
      </div>
    </>
  );

  if (!canEvaluate || lockedByOther) {
    return (
      <div className={`${shellClass} cursor-default opacity-90`} title={lockedByOther ? `בוצע ע״י ${entry.by ?? "מעריך אחר"}` : undefined}>
        {inner}
      </div>
    );
  }

  return (
    <Link href={href} className={shellClass}>
      {inner}
    </Link>
  );
}

function CandidateOverviewCard({
  candidate,
  canEvaluate,
}: {
  candidate: EvaluatorRosterItem;
  canEvaluate: boolean;
}) {
  const done = mineCount(candidate);
  return (
    <article className="rounded-2xl bg-surface-1 p-4 shadow-[0_0_0_1px_rgba(20,33,43,0.07),0_8px_24px_rgba(20,33,43,0.04)] dark:bg-[#181a22] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/agam/evaluate/${candidate.id}`}
            className="block truncate text-base font-extrabold text-text-primary transition hover:text-accent-primary"
          >
            {candidate.full_name}
          </Link>
          <p className="mt-0.5 truncate text-[12px] font-semibold text-text-muted">
            <span dir="ltr" className="tabular-nums">
              {candidate.personal_number}
            </span>
            {candidate.command ? ` · ${candidate.command}` : ""}
            <span className="ms-2 tabular-nums text-text-secondary">
              · {done}/{EVALUATOR_ENTRIES.length} מילאתי
            </span>
          </p>
        </div>
        <Link href={`/agam/evaluate/${candidate.id}`} className={`${secondaryButtonClass} shrink-0`}>
          פתיחת תיק
          <ChevronLeft size={14} />
        </Link>
      </div>

      <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {EVALUATOR_ENTRIES.map((meta) => (
          <StageTile
            key={meta.kind}
            candidateId={candidate.id}
            meta={meta}
            entry={candidate.entries[meta.kind]}
            canEvaluate={canEvaluate}
          />
        ))}
      </div>
    </article>
  );
}

function CandidateStageCard({
  candidate,
  meta,
  canEvaluate,
}: {
  candidate: EvaluatorRosterItem;
  meta: EvaluatorEntryMeta;
  canEvaluate: boolean;
}) {
  const entry = candidate.entries[meta.kind];
  const tone = entryTone(entry);
  const href = `/agam/evaluate/${candidate.id}?form=${meta.kind}`;
  const lockedByOther = meta.shared && tone === "others";
  const Icon = meta.icon;

  const statusLabel =
    tone === "mine"
      ? entry.score != null
        ? `מילאתי · ${entry.score}`
        : "מילאתי"
      : meta.shared && tone === "others"
        ? `ע״י ${entry.by ?? "מעריך אחר"}`
        : tone === "others"
          ? entry.count === 1
            ? "מעריך אחד מילא"
            : `${entry.count} מעריכים מילאו`
          : meta.shared
            ? "טרם בוצע ראיון"
            : "טרם הוספת הערכה";

  const actionHref = canEvaluate && !lockedByOther ? href : `/agam/evaluate/${candidate.id}`;

  return (
    <article className="flex h-full flex-col rounded-2xl bg-surface-1 p-4 shadow-[0_0_0_1px_rgba(20,33,43,0.07),0_8px_24px_rgba(20,33,43,0.04)] dark:bg-[#181a22] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
      <div className="flex items-start justify-between gap-2">
        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            tone === "mine"
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              : lockedByOther
                ? "bg-surface-2 text-text-muted"
                : "bg-accent-primary/10 text-accent-primary"
          }`}
        >
          {tone === "mine" ? <Check size={16} strokeWidth={2.6} /> : lockedByOther ? <Lock size={15} /> : <Icon size={16} />}
        </span>
        {canEvaluate && !lockedByOther ? (
          <Link
            href={href}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition ${
              tone === "mine"
                ? "bg-emerald-500/15 text-emerald-700 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.18)] hover:bg-emerald-500 hover:text-white dark:text-emerald-300"
                : "bg-accent-primary/12 text-accent-primary shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent-primary)_22%,transparent)] hover:bg-accent-primary hover:text-white hover:shadow-[0_8px_18px_-10px_color-mix(in_srgb,var(--accent-primary)_70%,transparent)]"
            }`}
            title={tone === "mine" ? "עריכה" : meta.shared ? "מילוי ראיון" : "הוספת הערכה"}
            aria-label={tone === "mine" ? "עריכה" : meta.shared ? "מילוי ראיון" : "הוספת הערכה"}
          >
            {tone === "mine" ? <Pencil size={15} strokeWidth={2.4} /> : <Plus size={17} strokeWidth={2.6} />}
          </Link>
        ) : lockedByOther ? (
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-text-muted">
            <Lock size={14} />
          </span>
        ) : null}
      </div>

      <div className="mt-3 min-w-0 flex-1">
        <Link
          href={actionHref}
          className="block truncate text-[15px] font-extrabold text-text-primary transition hover:text-accent-primary"
        >
          {candidate.full_name}
        </Link>
        <p className="mt-0.5 truncate text-[11px] font-semibold text-text-muted">
          <span dir="ltr" className="tabular-nums">
            {candidate.personal_number}
          </span>
          {candidate.command ? ` · ${candidate.command}` : ""}
        </p>
        <p
          className={`mt-2.5 line-clamp-2 text-[11px] font-bold leading-snug ${
            tone === "mine"
              ? "text-emerald-700 dark:text-emerald-300"
              : tone === "others"
                ? "text-text-secondary"
                : "text-text-muted"
          }`}
        >
          {statusLabel}
        </p>
      </div>
    </article>
  );
}

export function AgamEvaluatorHomePage() {
  const [payload, setPayload] = useState<RosterPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<StageTab>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

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
  const activeMeta = stage === "all" ? null : (EVALUATOR_ENTRIES.find((meta) => meta.kind === stage) ?? null);
  const isAllTab = stage === "all";

  const stageStats = useMemo(() => {
    if (!activeMeta) {
      const touched = candidates.filter((row) => mineCount(row) > 0).length;
      return { todo: candidates.length - touched, mine: touched };
    }
    return {
      todo: candidates.filter((row) => isTodoForMe(activeMeta, row.entries[stage as EvaluatorEntryKind])).length,
      mine: candidates.filter((row) => isMine(row.entries[stage as EvaluatorEntryKind])).length,
    };
  }, [candidates, activeMeta, stage]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidates.filter((row) => {
      if (q && !`${row.full_name} ${row.personal_number} ${row.command ?? ""}`.toLowerCase().includes(q)) {
        return false;
      }
      if (isAllTab) {
        if (statusFilter === "todo") {
          return EVALUATOR_ENTRIES.some((meta) => isTodoForMe(meta, row.entries[meta.kind]));
        }
        if (statusFilter === "done") return mineCount(row) > 0;
        return true;
      }
      if (!activeMeta) return true;
      const entry = row.entries[stage as EvaluatorEntryKind];
      if (statusFilter === "todo") return isTodoForMe(activeMeta, entry);
      if (statusFilter === "done") return isMine(entry);
      return true;
    });
  }, [candidates, query, stage, statusFilter, activeMeta, isAllTab]);

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
                ? `${candidates.length} מועמדים במחזור · בחרו שלב למילוי או פתחו תיק מלא`
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
          <div className={`mt-4 pt-4 ${dividerTopClass}`}>
            <StageTabs
              active={stage}
              onChange={(kind) => {
                setStage(kind);
                setStatusFilter("all");
              }}
              candidates={candidates}
            />
          </div>
        ) : null}
      </header>

      {!cycle ? null : candidates.length === 0 ? (
        <p className={`${panelClass} ${panelPadClass} text-center text-sm text-text-muted`}>
          עדיין אין מועמדים במחזור.
        </p>
      ) : (
        <section className="space-y-3">
          <div className={`${panelClass} ${panelPadClass}`}>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-text-primary">
                {isAllTab ? "כל המועמדים" : activeMeta?.title}
              </h2>
              <p className="mt-0.5 text-xs font-semibold text-text-muted">
                {isAllTab
                  ? "בחרו מועמד לתיק המלא, או לחצו על שלב כדי לפתוח ישר את הטופס"
                  : stageStats.todo > 0
                    ? `${stageStats.todo} מועמדים ממתינים למילוי · ${stageStats.mine} כבר מילאת`
                    : stageStats.mine > 0
                      ? `מילאת את כל מה שנדרש בשלב הזה (${stageStats.mine})`
                      : "אין פעילות בשלב הזה עדיין"}
                {!isAllTab && activeMeta?.date(cycle) ? ` · ${formatAgamDate(activeMeta.date(cycle))}` : ""}
              </p>
            </div>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative sm:max-w-sm sm:flex-1">
                <Search size={15} className="pointer-events-none absolute inset-y-0 start-3 my-auto text-text-muted" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="חיפוש לפי שם, מספר אישי או פיקוד"
                  className={`${fieldClass} ps-9`}
                />
              </div>
              <div className="flex gap-1 overflow-x-auto rounded-xl bg-surface-2/70 p-1" role="tablist">
                {STATUS_FILTERS.map((item) => {
                  const active = statusFilter === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setStatusFilter(item.key)}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        active
                          ? "bg-surface-1 text-text-primary shadow-sm"
                          : "text-text-muted hover:text-text-primary"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {visible.length === 0 ? (
            <p className={`${panelClass} ${panelPadClass} text-center text-sm text-text-muted`}>
              לא נמצאו מועמדים לפי הסינון.
            </p>
          ) : isAllTab || !activeMeta ? (
            <ul className="space-y-2.5">
              {visible.map((candidate) => (
                <li key={candidate.id}>
                  <CandidateOverviewCard candidate={candidate} canEvaluate={Boolean(payload?.canEvaluate)} />
                </li>
              ))}
            </ul>
          ) : (
            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((candidate) => (
                <li key={candidate.id} className="min-w-0">
                  <CandidateStageCard
                    candidate={candidate}
                    meta={activeMeta}
                    canEvaluate={Boolean(payload?.canEvaluate)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
