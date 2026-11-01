"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Reorder, useDragControls } from "framer-motion";
import {
  ArrowDownWideNarrow,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  GripVertical,
  ListOrdered,
  Plus,
  RotateCcw,
  Save,
  Trophy,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { canEvaluate } from "@/modules/agam/lib/permissions";
import { STATUS_LABELS } from "@/modules/agam/lib/stages";
import { pageShellClass, panelClass, panelPadClass, primaryButtonClass, secondaryButtonClass } from "@/modules/agam/lib/ui";
import type { AgamCycle, AgamRankingRow } from "@/modules/agam/types";
import type { ModuleRole } from "@/shared/modules/types";

type RankingPayload = { cycle: AgamCycle; rows: AgamRankingRow[]; role: ModuleRole };

const PODIUM_TONES = [
  "bg-amber-400/20 text-amber-800 ring-amber-500/30 dark:text-amber-200",
  "bg-slate-300/30 text-slate-700 ring-slate-400/30 dark:text-slate-200",
  "bg-orange-300/25 text-orange-800 ring-orange-400/30 dark:text-orange-200",
];

function byDayScore(a: AgamRankingRow, b: AgamRankingRow): number {
  const left = a.day_average ?? -Infinity;
  const right = b.day_average ?? -Infinity;
  if (left !== right) return right - left;
  return a.full_name.localeCompare(b.full_name, "he");
}

function splitRows(rows: AgamRankingRow[]) {
  const ranked = rows
    .filter((row) => row.cycle_rank != null)
    .sort((a, b) => (a.cycle_rank ?? 0) - (b.cycle_rank ?? 0));
  const unranked = rows.filter((row) => row.cycle_rank == null);
  return { ranked, unranked };
}

export function AgamCycleRankingPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [payload, setPayload] = useState<RankingPayload | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [ranked, setRanked] = useState<AgamRankingRow[]>([]);
  const [unranked, setUnranked] = useState<AgamRankingRow[]>([]);
  const [savedOrder, setSavedOrder] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  const applyRows = useCallback((rows: AgamRankingRow[]) => {
    const split = splitRows(rows);
    setSavedOrder(split.ranked.map((row) => row.id).join(","));
    if (split.ranked.length === 0 && split.unranked.length > 0) {
      setRanked([...split.unranked].sort(byDayScore));
      setUnranked([]);
      setPrefilled(true);
    } else {
      setRanked(split.ranked);
      setUnranked(split.unranked);
      setPrefilled(false);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await agamFetch<RankingPayload>(`/api/agam/cycles/${id}/ranking`);
      setPayload(data);
      applyRows(data.rows);
    } catch {
      toast.error("טעינת הדירוג נכשלה");
      setPayload(null);
    } finally {
      setLoaded(true);
    }
  }, [applyRows, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(() => ranked.map((row) => row.id).join(",") !== savedOrder, [ranked, savedOrder]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  if (!loaded) return <p className="p-6 text-sm text-text-muted">טוען…</p>;
  if (!payload) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className={`${panelClass} p-8 text-center`}>המחזור לא נמצא.</div>
      </div>
    );
  }

  const editable = canEvaluate(payload.role);
  const total = ranked.length + unranked.length;

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= ranked.length) return;
    setRanked((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeFromRanking = (row: AgamRankingRow) => {
    setRanked((current) => current.filter((item) => item.id !== row.id));
    setUnranked((current) => [...current, row].sort((a, b) => a.full_name.localeCompare(b.full_name, "he")));
  };

  const addToRanking = (row: AgamRankingRow) => {
    setUnranked((current) => current.filter((item) => item.id !== row.id));
    setRanked((current) => [...current, row]);
  };

  const addAll = () => {
    setRanked((current) => [...current, ...[...unranked].sort(byDayScore)]);
    setUnranked([]);
  };

  const sortByScore = () => setRanked((current) => [...current].sort(byDayScore));

  const reset = () => applyRows(payload.rows);

  const save = async () => {
    setSaving(true);
    try {
      const data = await agamFetch<{ rows: AgamRankingRow[] }>(`/api/agam/cycles/${id}/ranking`, {
        method: "PUT",
        body: JSON.stringify({ orderedIds: ranked.map((row) => row.id) }),
      });
      setPayload((current) => (current ? { ...current, rows: data.rows } : current));
      applyRows(data.rows);
      toast.success("הדירוג נשמר");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "שמירת הדירוג נכשלה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`${pageShellClass} mx-auto max-w-4xl`}>
      <header className={`${panelClass} ${panelPadClass}`}>
        <Link
          href={`/agam/cycles/${id}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-accent-primary"
        >
          <ArrowRight size={13} />
          {payload.cycle.name}
        </Link>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-700 dark:text-amber-300">
              <Trophy size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">דירוג מועמדים</h1>
              <p className="mt-0.5 text-sm text-text-secondary">
                {editable ? "גררו את הכרטיסים או השתמשו בחיצים כדי לקבוע את הסדר" : "הדירוג של המחזור"}
                <span className="mx-1.5 opacity-40">·</span>
                <span className="font-bold tabular-nums">
                  {ranked.length}/{total}
                </span>{" "}
                מדורגים
              </p>
            </div>
          </div>

          {editable ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={sortByScore}
                disabled={ranked.length < 2}
                title="סידור מחדש לפי ממוצע יום המיונים"
              >
                <ArrowDownWideNarrow size={15} />
                לפי ציון יום מיונים
              </button>
              {dirty ? (
                <button type="button" className={secondaryButtonClass} onClick={reset}>
                  <RotateCcw size={15} />
                  ביטול שינויים
                </button>
              ) : null}
              <button
                type="button"
                className={primaryButtonClass}
                onClick={() => void save()}
                disabled={!dirty || saving}
              >
                <Save size={15} />
                {saving ? "שומר…" : "שמירת דירוג"}
              </button>
            </div>
          ) : null}
        </div>

        {prefilled && editable ? (
          <p className="mt-3 rounded-xl bg-accent-primary/[0.07] px-3 py-2 text-xs font-semibold text-text-secondary">
            עדיין לא נקבע דירוג למחזור. סידרנו את המועמדים לפי ציון יום המיונים כנקודת התחלה. שנו לפי הצורך ושמרו.
          </p>
        ) : null}
      </header>

      <section className={`${panelClass} ${panelPadClass}`}>
        <div className="mb-3 flex items-center gap-2">
          <ListOrdered size={17} className="text-accent-primary" />
          <h2 className="text-base font-extrabold text-text-primary">סדר הדירוג</h2>
        </div>

        {ranked.length === 0 ? (
          <p className="rounded-2xl bg-surface-2/70 px-4 py-6 text-center text-sm text-text-muted">
            {total === 0 ? "אין מועמדים במחזור." : "אין מועמדים מדורגים. הוסיפו מועמדים מהרשימה למטה."}
          </p>
        ) : (
          <Reorder.Group axis="y" values={ranked} onReorder={editable ? setRanked : () => undefined} className="space-y-2">
            {ranked.map((row, index) => (
              <RankingItem
                key={row.id}
                row={row}
                rank={index + 1}
                total={ranked.length}
                editable={editable}
                onUp={() => move(index, -1)}
                onDown={() => move(index, 1)}
                onRemove={() => removeFromRanking(row)}
              />
            ))}
          </Reorder.Group>
        )}
      </section>

      {unranked.length > 0 ? (
        <section className={`${panelClass} ${panelPadClass}`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-text-primary">לא מדורגים</h2>
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold tabular-nums text-text-muted">
                {unranked.length}
              </span>
            </div>
            {editable ? (
              <button
                type="button"
                className="text-xs font-bold text-accent-primary transition hover:underline"
                onClick={addAll}
              >
                הוספת כולם לסוף הדירוג
              </button>
            ) : null}
          </div>
          <ul className="space-y-2">
            {unranked.map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-3 rounded-2xl bg-surface-2/60 px-3 py-2.5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-1 text-sm font-bold text-text-muted">
                  –
                </span>
                <CandidateSummary row={row} />
                {editable ? (
                  <button
                    type="button"
                    className="ms-auto inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-surface-1 px-3 text-xs font-bold text-text-primary shadow-sm transition hover:text-accent-primary"
                    onClick={() => addToRanking(row)}
                  >
                    <Plus size={13} />
                    לדירוג
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function RankingItem({
  row,
  rank,
  total,
  editable,
  onUp,
  onDown,
  onRemove,
}: {
  row: AgamRankingRow;
  rank: number;
  total: number;
  editable: boolean;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  const controls = useDragControls();
  const podium = PODIUM_TONES[rank - 1];

  return (
    <Reorder.Item
      value={row}
      dragListener={false}
      dragControls={controls}
      className="group relative flex items-center gap-3 rounded-2xl bg-surface-1 px-3 py-2.5 shadow-[0_1px_3px_rgba(22,24,29,0.08),inset_0_0_0_1px_rgba(22,24,29,0.05)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
      whileDrag={{ scale: 1.015, boxShadow: "0 14px 32px rgba(22,24,29,0.16)", zIndex: 10 }}
    >
      {editable ? (
        <button
          type="button"
          aria-label="גרירה"
          className="flex h-9 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-text-muted/60 transition hover:text-text-primary active:cursor-grabbing"
          onPointerDown={(event) => controls.start(event)}
        >
          <GripVertical size={17} />
        </button>
      ) : null}

      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base font-extrabold tabular-nums ring-1 ${
          podium ?? "bg-accent-primary/10 text-accent-primary ring-transparent"
        }`}
      >
        {rank}
      </span>

      <CandidateSummary row={row} />

      {editable ? (
        <div className="ms-auto flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            aria-label="העלאה במקום"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition hover:bg-surface-2 hover:text-text-primary disabled:opacity-30"
            disabled={rank === 1}
            onClick={onUp}
          >
            <ChevronUp size={17} />
          </button>
          <button
            type="button"
            aria-label="הורדה במקום"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition hover:bg-surface-2 hover:text-text-primary disabled:opacity-30"
            disabled={rank === total}
            onClick={onDown}
          >
            <ChevronDown size={17} />
          </button>
          <button
            type="button"
            aria-label="הוצאה מהדירוג"
            title="הוצאה מהדירוג"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted opacity-0 transition hover:bg-rose-500/10 hover:text-rose-600 group-hover:opacity-100 focus-visible:opacity-100"
            onClick={onRemove}
          >
            <X size={15} />
          </button>
        </div>
      ) : null}
    </Reorder.Item>
  );
}

function CandidateSummary({ row }: { row: AgamRankingRow }) {
  const metrics = [
    { label: "יום מיונים", value: row.day_average },
    { label: "יום מכין", value: row.prep_average },
    { label: "סמ״ח", value: row.smach_average },
    { label: "מדד", value: row.planning_index },
    { label: "דפ״ר", value: row.dapar },
  ].filter((metric) => metric.value != null);

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1.5">
      <div className="min-w-0">
        <Link
          href={`/agam/candidates/${row.id}`}
          className="block truncate text-sm font-extrabold text-text-primary transition hover:text-accent-primary"
        >
          {row.full_name}
        </Link>
        <p className="text-[11px] text-text-muted">
          <span dir="ltr" className="tabular-nums">
            {row.personal_number}
          </span>
          <span className="mx-1 opacity-40">·</span>
          {STATUS_LABELS[row.status] ?? row.status}
        </p>
      </div>
      {metrics.length > 0 ? (
        <dl className="flex flex-wrap items-center gap-1.5">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="inline-flex items-baseline gap-1 rounded-lg bg-surface-2 px-2 py-1 text-[11px]"
            >
              <dt className="font-semibold text-text-muted">{metric.label}</dt>
              <dd className="font-extrabold tabular-nums text-text-primary">{metric.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
