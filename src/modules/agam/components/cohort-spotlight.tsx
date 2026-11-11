"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, Link2, Plus, Search, Trophy, UserRound } from "lucide-react";
import { toast } from "sonner";
import { CandidateRosterTable, sortByCycleRank } from "@/modules/agam/components/candidate-roster-table";
import { CreateCycleDrawer } from "@/modules/agam/components/create-cycle-drawer";
import { CycleStagePanel } from "@/modules/agam/components/cycle-stage-panel";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { cycleInviteAbsoluteUrl } from "@/modules/agam/lib/cycle-invite";
import { formatAgamDate, toDateInputValue } from "@/modules/agam/lib/date-format";
import { STAGE_VIEWS } from "@/modules/agam/lib/stages";
import { panelClass } from "@/modules/agam/lib/ui";
import {
  YEARBOOK_MONTHS,
  cycleMonthNumber,
  yearbookTabLabel,
} from "@/modules/agam/lib/yearbook-months";
import type { AgamCandidate, AgamCycle, AgamCycleStageBoard, AgamStageKey } from "@/modules/agam/types";

const NO_YEAR = "none";

function sortYearbookCycles(rows: AgamCycle[]): AgamCycle[] {
  const monthRank = new Map(YEARBOOK_MONTHS.map((slot, index) => [slot.month, index]));
  return [...rows].sort((a, b) => {
    const aMonth = cycleMonthNumber(a.cycle_date);
    const bMonth = cycleMonthNumber(b.cycle_date);
    const aRank = aMonth != null ? monthRank.get(aMonth) : undefined;
    const bRank = bMonth != null ? monthRank.get(bMonth) : undefined;
    if (aRank != null && bRank != null) return aRank - bRank;
    if (aRank != null) return -1;
    if (bRank != null) return 1;
    return toDateInputValue(a.cycle_date).localeCompare(toDateInputValue(b.cycle_date));
  });
}

function cycleWhen(day: string, today: string): { label: string; tone: "past" | "today" | "soon" } {
  if (!day) return { label: "ללא תאריך", tone: "soon" };
  if (day === today) return { label: "היום", tone: "today" };
  const diff = Math.round(
    (new Date(`${day}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86_400_000,
  );
  if (diff < 0) return { label: "הסתיים", tone: "past" };
  if (diff === 1) return { label: "מחר", tone: "soon" };
  if (diff <= 30) return { label: `בעוד ${diff} ימים`, tone: "soon" };
  return { label: "מתוכנן", tone: "soon" };
}

function pickDefaultCycle(cycles: AgamCycle[], today: string): string | null {
  const rows = cycles.map((cycle) => ({ id: cycle.id, day: toDateInputValue(cycle.cycle_date) }));
  const upcoming = rows.filter((row) => row.day && row.day >= today).sort((a, b) => a.day.localeCompare(b.day));
  if (upcoming[0]) return upcoming[0].id;
  return rows.sort((a, b) => b.day.localeCompare(a.day))[0]?.id ?? null;
}

const yearOf = (cycle: AgamCycle) => (cycle.cohort_year == null ? NO_YEAR : String(cycle.cohort_year));

export function CohortSpotlight({
  cycles,
  candidates,
  canCreate = false,
  onCycleCreated,
  onCyclesEnsured,
  onActiveCycleChange,
}: {
  cycles: AgamCycle[];
  candidates: AgamCandidate[];
  canCreate?: boolean;
  onCycleCreated?: (cycle: AgamCycle) => void;
  onCyclesEnsured?: (created: AgamCycle[]) => void;
  onActiveCycleChange?: (cycle: AgamCycle | null) => void;
}) {
  const linkedCycleId = useSearchParams().get("cycle");
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const today = useMemo(() => toDateInputValue(new Date()), []);
  const currentYear = String(new Date().getFullYear());

  const years = useMemo(() => {
    const set = new Set(cycles.map(yearOf));
    return [...set].sort((a, b) => {
      if (a === NO_YEAR) return 1;
      if (b === NO_YEAR) return -1;
      return Number(b) - Number(a);
    });
  }, [cycles]);

  const defaultYear = useMemo(() => {
    if (years.includes(currentYear)) return currentYear;
    const numeric = years.filter((y) => y !== NO_YEAR).map(Number);
    if (numeric.length === 0) return years[0] ?? NO_YEAR;
    const target = Number(currentYear);
    return String(numeric.reduce((best, y) => (Math.abs(y - target) < Math.abs(best - target) ? y : best)));
  }, [years, currentYear]);

  const [yearPick, setYearPick] = useState<string | null>(null);
  const [cyclePick, setCyclePick] = useState<string | null>(null);
  const year = yearPick ?? defaultYear;
  const appliedLinkRef = useRef<string | null>(null);
  const ensuredYears = useRef(new Set<number>());

  const yearCycles = useMemo(
    () => sortYearbookCycles(cycles.filter((cycle) => yearOf(cycle) === year)),
    [cycles, year],
  );

  // Apply ?cycle= only once per id — never re-force year when cycles refresh.
  useEffect(() => {
    if (!linkedCycleId) {
      appliedLinkRef.current = null;
      return;
    }
    if (appliedLinkRef.current === linkedCycleId) return;
    const linked = cycles.find((cycle) => cycle.id === linkedCycleId);
    if (!linked) return;
    appliedLinkRef.current = linkedCycleId;
    setYearPick(yearOf(linked));
    setCyclePick(linked.id);
    document.getElementById("cohort-spotlight")?.scrollIntoView({ block: "start" });
  }, [linkedCycleId, cycles]);

  const cycleId =
    cyclePick && yearCycles.some((cycle) => cycle.id === cyclePick)
      ? cyclePick
      : pickDefaultCycle(yearCycles, today);
  const activeCycle = yearCycles.find((cycle) => cycle.id === cycleId) ?? null;

  useEffect(() => {
    onActiveCycleChange?.(activeCycle);
    setInviteCopied(false);
  }, [activeCycle?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- notify parent when the visible cycle changes

  useEffect(() => {
    if (!canCreate) return;
    const targetYear = year !== NO_YEAR ? Number(year) : Number(currentYear);
    if (!Number.isInteger(targetYear) || ensuredYears.current.has(targetYear)) return;
    ensuredYears.current.add(targetYear);
    void (async () => {
      try {
        const data = await agamFetch<{ created: AgamCycle[] }>(
          "/api/agam/cycles/ensure-year",
          { method: "POST", body: JSON.stringify({ cohortYear: targetYear }) },
        );
        if (data.created.length > 0) onCyclesEnsured?.(data.created);
      } catch {
        ensuredYears.current.delete(targetYear);
      }
    })();
  }, [canCreate, year, currentYear, onCyclesEnsured]);

  const [query, setQuery] = useState("");
  const [stageView, setStageView] = useState<AgamStageKey | "overview">("overview");
  const [boardCache, setBoardCache] = useState<Record<string, AgamCycleStageBoard>>({});
  const [loadingBoard, setLoadingBoard] = useState(false);
  const loadingBoardFor = useRef<string | null>(null);

  const loadBoard = async (cycleId: string) => {
    if (boardCache[cycleId] || loadingBoardFor.current === cycleId) return;
    loadingBoardFor.current = cycleId;
    setLoadingBoard(true);
    try {
      const data = await agamFetch<{ board: AgamCycleStageBoard }>(
        `/api/agam/cycles/${cycleId}/stage-board`,
      );
      setBoardCache((prev) => ({ ...prev, [cycleId]: data.board }));
    } catch {
      toast.error("טעינת נתוני השלבים נכשלה");
    } finally {
      if (loadingBoardFor.current === cycleId) loadingBoardFor.current = null;
      setLoadingBoard(false);
    }
  };

  useEffect(() => {
    setStageView("overview");
    setQuery("");
  }, [activeCycle?.id]);

  const cycleCandidates = useMemo(
    () =>
      activeCycle
        ? sortByCycleRank(candidates.filter((c) => c.cycle_id === activeCycle.id && !c.archived))
        : [],
    [candidates, activeCycle],
  );
  const roster = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cycleCandidates;
    return cycleCandidates.filter((c) => `${c.full_name} ${c.personal_number}`.toLowerCase().includes(q));
  }, [cycleCandidates, query]);
  const activeStage = STAGE_VIEWS.find((stage) => stage.key === stageView) ?? null;
  const stageBoard = activeCycle ? boardCache[activeCycle.id] ?? null : null;

  const counts = {
    pending: cycleCandidates.filter((c) => c.status === "pending").length,
    passed: cycleCandidates.filter((c) => c.status === "passed").length,
    notPassed: cycleCandidates.filter((c) => c.status === "not_passed").length,
  };
  const yearCandidates = yearCycles.reduce((sum, cycle) => sum + (cycle.candidate_count ?? 0), 0);
  const activeDay = activeCycle ? toDateInputValue(activeCycle.cycle_date) : "";
  const activeWhen = cycleWhen(activeDay, today);

  const createDrawer = canCreate ? (
    <CreateCycleDrawer
      open={createOpen}
      onOpenChange={setCreateOpen}
      defaultCohortYear={year && year !== NO_YEAR ? year : currentYear}
      onCreated={(cycle) => {
        onCycleCreated?.({ ...cycle, candidate_count: cycle.candidate_count ?? 0 });
        setYearPick(cycle.cohort_year == null ? NO_YEAR : String(cycle.cohort_year));
        setCyclePick(cycle.id);
        setQuery("");
      }}
    />
  ) : null;

  if (cycles.length === 0 && !canCreate) {
    return (
      <article className={`${panelClass} px-6 py-10 text-center`}>
        <p className="text-sm font-bold text-text-primary">אין מחזורים עדיין</p>
        <p className="mt-1 text-xs text-text-muted">צרו מחזור ראשון כדי להתחיל לרשום מועמדים.</p>
        {createDrawer}
      </article>
    );
  }

  return (
    <article id="cohort-spotlight" className={`${panelClass} scroll-mt-20 overflow-hidden`}>
      {createDrawer}
      {/* Year bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
        <div className="flex items-baseline gap-3">
          <h2 className="text-2xl font-black tracking-tight text-text-primary tabular-nums">
            {year === NO_YEAR ? "ללא שנתון" : `שנתון ${year}`}
          </h2>
          {year === currentYear ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              נוכחי
            </span>
          ) : null}
          <span className="text-xs font-semibold text-text-muted">
            {yearCycles.length} מחזורים · {yearCandidates} מועמדים
          </span>
        </div>

        {years.length > 1 ? (
          <div className="flex items-center gap-0.5 rounded-lg bg-surface-2 p-0.5" role="tablist" aria-label="שנתון">
            {years.map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={key === year}
                onClick={() => {
                  const nextCycles = sortYearbookCycles(cycles.filter((cycle) => yearOf(cycle) === key));
                  setYearPick(key);
                  setCyclePick(pickDefaultCycle(nextCycles, today));
                  setQuery("");
                }}
                className={`rounded-md px-2.5 py-1 text-[11px] font-bold tabular-nums transition ${
                  key === year ? "bg-surface-1 text-text-primary shadow-sm" : "text-text-muted hover:text-text-primary"
                }`}
              >
                {key === NO_YEAR ? "ללא" : key}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Cycle tabs — fixed yearbook months + any extras */}
      <div className="mt-4 flex gap-1 overflow-x-auto px-3 ui-divider" role="tablist" aria-label="מחזורים">
        {yearCycles.length === 0 ? (
          <p className="px-2 pb-3 text-sm text-text-muted">
            {canCreate ? "פותחים את מחזורים של השנתון…" : "אין מחזורים בשנתון זה."}
          </p>
        ) : (
          yearCycles.map((cycle) => {
            const active = cycle.id === cycleId;
            const label = yearbookTabLabel(cycle.name, cycle.cycle_date);
            return (
              <button
                key={cycle.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setCyclePick(cycle.id);
                  setQuery("");
                }}
                className={`relative shrink-0 px-3 pb-3 pt-1 text-sm transition ${
                  active ? "font-extrabold text-text-primary" : "font-semibold text-text-muted hover:text-text-primary"
                }`}
              >
                {label}
                {active ? (
                  <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-text-primary" aria-hidden />
                ) : null}
              </button>
            );
          })
        )}
        {canCreate ? (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="mb-2 ms-1 inline-flex shrink-0 items-center gap-1 self-center rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-bold text-text-secondary transition hover:bg-text-primary hover:text-white dark:hover:bg-white dark:hover:text-black"
            aria-label="הוספת מחזור"
          >
            <Plus size={13} strokeWidth={2.5} />
            מחזור
          </button>
        ) : null}
      </div>

      {/* Roster */}
      {activeCycle ? (
        <div className="px-5 pb-5 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-text-muted">
              <span dir="ltr">{activeDay ? formatAgamDate(activeDay) : "ללא תאריך"}</span>
              <span className="mx-1.5 opacity-40">·</span>
              <span
                className={
                  activeWhen.tone === "today"
                    ? "font-extrabold text-[color:var(--agam-orange)]"
                    : activeWhen.tone === "soon"
                      ? "text-blue-700 dark:text-blue-300"
                      : ""
                }
              >
                {activeWhen.label}
              </span>
              {cycleCandidates.length > 0 ? (
                <>
                  <span className="mx-1.5 opacity-40">·</span>
                  {counts.pending} ממתינים · {counts.passed} עברו · {counts.notPassed} לא עברו
                </>
              ) : null}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {!activeCycle.archived && activeCycle.invite_slug ? (
                <button
                  type="button"
                  onClick={() => {
                    void (async () => {
                      try {
                        await navigator.clipboard.writeText(
                          cycleInviteAbsoluteUrl(activeCycle.invite_slug),
                        );
                        setInviteCopied(true);
                        toast.success("קישור השאלון הועתק");
                        window.setTimeout(() => setInviteCopied(false), 1800);
                      } catch {
                        toast.error("העתקה נכשלה");
                      }
                    })();
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-bold text-text-primary transition hover:bg-accent-primary/12"
                  title="העתקת קישור השאלון למועמדים"
                >
                  {inviteCopied ? <Check size={13} /> : <Link2 size={13} />}
                  {inviteCopied ? "הועתק" : "קישור לשאלון"}
                </button>
              ) : null}
              <Link
                href={`/agam/cycles/${activeCycle.id}/ranking`}
                className="inline-flex items-center gap-1 rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-bold text-text-primary transition hover:bg-accent-primary/12"
              >
                <Trophy size={13} />
                דירוג
              </Link>
              <Link
                href={`/agam/cycles/${activeCycle.id}`}
                className="inline-flex items-center gap-0.5 text-xs font-bold text-text-primary transition hover:opacity-70"
              >
                ניהול המחזור
                <ChevronLeft size={14} />
              </Link>
            </div>
          </div>

          <div
            className="mt-3 flex gap-0.5 overflow-x-auto rounded-2xl bg-surface-2/70 p-1"
            role="tablist"
            aria-label="שלבי המחזור"
          >
            <button
              type="button"
              role="tab"
              aria-selected={stageView === "overview"}
              onClick={() => setStageView("overview")}
              className={`shrink-0 rounded-xl px-3 py-2 text-[12px] font-extrabold transition ${
                stageView === "overview"
                  ? "bg-surface-1 text-text-primary shadow-sm"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              סקירה
            </button>
            {STAGE_VIEWS.map((stage) => (
              <button
                key={stage.key}
                type="button"
                role="tab"
                aria-selected={stageView === stage.key}
                onClick={() => {
                  setStageView(stage.key);
                  void loadBoard(activeCycle.id);
                }}
                className={`shrink-0 rounded-xl px-3 py-2 text-[12px] font-extrabold transition ${
                  stageView === stage.key
                    ? "bg-surface-1 text-text-primary shadow-sm"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                {stage.label}
              </button>
            ))}
          </div>

          {cycleCandidates.length > 8 || stageView !== "overview" ? (
            <label className="relative mt-3 block">
              <Search size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="חיפוש מועמד"
                className="ui-field w-full rounded-xl bg-surface-1 py-2 pe-3 ps-9 text-sm font-semibold text-text-primary outline-none placeholder:text-text-muted"
              />
            </label>
          ) : null}

          {roster.length === 0 ? (
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-surface-2/70 px-4 py-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-1 text-text-muted">
                <UserRound size={16} />
              </span>
              <div>
                <p className="text-sm font-bold text-text-primary">
                  {cycleCandidates.length === 0 ? "עדיין אין מועמדים במחזור" : "לא נמצאו מועמדים"}
                </p>
                {cycleCandidates.length === 0 ? (
                  <p className="text-xs text-text-muted">
                    {activeCycle.invite_slug
                      ? "שתפו את קישור השאלון עם המועמדים."
                      : "שתפו את קישור ההרשמה ממסך ניהול המחזור."}
                  </p>
                ) : null}
              </div>
            </div>
          ) : stageView === "overview" ? (
            <div className="mt-3">
              <CandidateRosterTable candidates={roster} fromCycleId={activeCycle.id} />
            </div>
          ) : activeStage ? (
            <div className="mt-3 space-y-2">
              <div className="flex items-baseline justify-between gap-2 px-0.5">
                <p className="text-sm font-extrabold text-text-primary">{activeStage.label}</p>
                {loadingBoard && !stageBoard ? (
                  <span className="text-[11px] font-semibold text-text-muted">טוען…</span>
                ) : (
                  <span className="text-[11px] font-semibold text-text-muted">
                    {roster.length} מועמדים
                  </span>
                )}
              </div>
              <CycleStagePanel
                stage={activeStage.key}
                candidates={roster}
                cycleId={activeCycle.id}
                board={stageBoard}
                loading={loadingBoard}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
