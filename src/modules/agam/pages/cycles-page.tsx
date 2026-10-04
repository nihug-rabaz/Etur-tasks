"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Archive, ArrowRight, CalendarDays, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Drawer } from "@/components/ui/drawer";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { formatAgamDate } from "@/modules/agam/lib/date-format";
import { TimelineDatePicker } from "@/modules/agam/components/timeline-date-picker";
import { canEvaluate } from "@/modules/agam/lib/permissions";
import {
  fieldClass,
  pageShellClass,
  panelClass,
  panelPadClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/modules/agam/lib/ui";
import { CohortCarousel } from "@/modules/agam/components/cohort-carousel";
import type { AgamCycle } from "@/modules/agam/types";
import type { ModuleRole } from "@/shared/modules/types";

type CohortBucket = {
  key: string;
  year: number | null;
  label: string;
  cycles: AgamCycle[];
  candidateCount: number;
};

function formatCycleDate(value: string): string {
  return formatAgamDate(value);
}

function buildCohorts(cycles: AgamCycle[]): CohortBucket[] {
  const map = new Map<string, CohortBucket>();
  for (const cycle of cycles) {
    const year = cycle.cohort_year ?? null;
    const key = year == null ? "none" : String(year);
    const existing = map.get(key);
    if (existing) {
      existing.cycles.push(cycle);
      existing.candidateCount += cycle.candidate_count ?? 0;
    } else {
      map.set(key, {
        key,
        year,
        label: year == null ? "ללא שנתון" : `שנתון ${year}`,
        cycles: [cycle],
        candidateCount: cycle.candidate_count ?? 0,
      });
    }
  }

  return [...map.values()].sort((a, b) => {
    if (a.year == null && b.year == null) return 0;
    if (a.year == null) return 1;
    if (b.year == null) return -1;
    return b.year - a.year;
  });
}

export function AgamCyclesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const archived = searchParams.get("archived") === "1";
  const selectedYear = searchParams.get("year");
  const [cycles, setCycles] = useState<AgamCycle[]>([]);
  const [role, setRole] = useState<ModuleRole | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await agamFetch<{ cycles: AgamCycle[]; role: ModuleRole }>(
        `/api/agam/cycles${archived ? "?archived=1" : ""}`,
      );
      setCycles(data.cycles);
      setRole(data.role);
    } catch {
      toast.error("טעינת המחזורים נכשלה");
    } finally {
      setLoaded(true);
    }
  }, [archived]);

  useEffect(() => {
    void load();
  }, [load]);

  const canEdit = canEvaluate(role);
  const cohorts = useMemo(() => buildCohorts(cycles), [cycles]);
  const activeCohort = useMemo(
    () => (selectedYear ? cohorts.find((row) => row.key === selectedYear) ?? null : null),
    [cohorts, selectedYear],
  );

  const openCohort = (key: string) => {
    const params = new URLSearchParams();
    if (archived) params.set("archived", "1");
    params.set("year", key);
    router.push(`/agam/cycles?${params.toString()}`);
  };

  const backToCohorts = () => {
    router.push(archived ? "/agam/cycles?archived=1" : "/agam/cycles");
  };

  if (!loaded) return <p className="p-6 text-sm text-text-muted">טוען…</p>;

  return (
    <div className={pageShellClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {activeCohort ? (
            <>
              <button
                type="button"
                onClick={backToCohorts}
                className="mb-2 inline-flex items-center gap-1 text-xs font-bold text-accent-primary"
              >
                <ArrowRight size={14} />
                כל השנתונים
              </button>
              <h1 className="text-2xl font-extrabold text-text-primary sm:text-3xl">
                {activeCohort.label}
              </h1>
              <p className="mt-0.5 text-sm text-text-secondary">
                {activeCohort.cycles.length} מחזורים · {activeCohort.candidateCount} מועמדים
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold text-text-primary sm:text-3xl">
                {archived ? "ארכיון שנתונים" : "שנתונים"}
              </h1>
              <p className="mt-0.5 text-sm text-text-secondary">
                בחרו שנתון כדי לראות את המחזורים שבו
              </p>
            </>
          )}
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href={
                archived
                  ? selectedYear
                    ? `/agam/cycles?year=${selectedYear}`
                    : "/agam/cycles"
                  : selectedYear
                    ? `/agam/cycles?archived=1&year=${selectedYear}`
                    : "/agam/cycles?archived=1"
              }
              className={secondaryButtonClass}
            >
              <Archive size={16} />
              {archived ? "שנתונים פעילים" : "ארכיון"}
            </Link>
            {!archived ? (
              <button type="button" className={primaryButtonClass} onClick={() => setCreateOpen(true)}>
                <Plus size={16} />
                מחזור חדש
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {cycles.length === 0 ? (
        <div className={`${panelClass} ${panelPadClass} py-8 text-center`}>
          <CalendarDays className="mx-auto text-text-muted" size={28} />
          <p className="mt-3 text-base font-extrabold text-text-primary">עדיין אין מחזורים</p>
          <p className="mt-1 text-sm text-text-muted">
            צרו מחזור ראשון עם שנתון — והוא יופיע כאן כרטיס שנתון.
          </p>
          {canEdit ? (
            <button type="button" className={`${primaryButtonClass} mt-4`} onClick={() => setCreateOpen(true)}>
              יצירת מחזור
            </button>
          ) : null}
        </div>
      ) : activeCohort ? (
        <CohortCyclesGrid cycles={activeCohort.cycles} />
      ) : (
        <CohortCarousel
          items={cohorts.map((cohort) => ({
            key: cohort.key,
            year: cohort.year,
            cycleCount: cohort.cycles.length,
            candidateCount: cohort.candidateCount,
          }))}
          onSelect={openCohort}
        />
      )}

      <CreateCycleDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultCohortYear={
          activeCohort?.year != null ? String(activeCohort.year) : ""
        }
        onCreated={(cycle) => {
            void load().then(() => {
              openCohort(cycle.cohort_year != null ? String(cycle.cohort_year) : "none");
            });
        }}
      />
    </div>
  );
}

function CohortCyclesGrid({ cycles }: { cycles: AgamCycle[] }) {
  return (
    <div className="flex flex-wrap justify-start gap-3">
      {cycles.map((cycle) => {
        const dateLabel = formatCycleDate(cycle.cycle_date) || "—";
        const candidates = cycle.candidate_count ?? 0;
        const hasInvite = Boolean(cycle.invite_slug && !cycle.archived);

        return (
          <Link
            key={cycle.id}
            href={`/agam/cycles/${cycle.id}`}
            className="ui-card flex w-full max-w-[13.5rem] flex-col rounded-xl bg-surface-1 p-4 transition hover:bg-surface-2/70 sm:w-[13.5rem]"
          >
            <p className="text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
              מחזור
            </p>
            <h2 className="mt-2 line-clamp-2 min-h-[2.75rem] text-center text-base font-semibold leading-snug text-text-primary">
              {cycle.name}
            </h2>

            <div className="ui-divider-top mt-3 space-y-2.5 pt-3">
              <div className="rounded-lg bg-surface-2/80 px-2.5 py-2 text-center">
                <p className="text-[10px] font-semibold text-text-muted">תאריך מיון</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-text-primary" dir="ltr">
                  {dateLabel}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-surface-2/80 px-2 py-2 text-center">
                  <p className="text-[10px] font-semibold text-text-muted">מועמדים</p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums text-text-primary">
                    {candidates}
                  </p>
                </div>
                <div className="rounded-lg bg-surface-2/80 px-2 py-2 text-center">
                  <p className="text-[10px] font-semibold text-text-muted">הרשמה</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-text-primary">
                    {hasInvite ? "פעיל" : "כבוי"}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function CreateCycleDrawer({
  open,
  onOpenChange,
  onCreated,
  defaultCohortYear = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (cycle: AgamCycle) => void;
  defaultCohortYear?: string;
}) {
  const [name, setName] = useState("");
  const [cycleDate, setCycleDate] = useState("");
  const [cohortYear, setCohortYear] = useState(defaultCohortYear);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setCohortYear(defaultCohortYear);
  }, [open, defaultCohortYear]);

  const submit = async () => {
    setSaving(true);
    try {
      const data = await agamFetch<{ cycle: AgamCycle }>("/api/agam/cycles", {
        method: "POST",
        body: JSON.stringify({
          name,
          cycleDate,
          cohortYear: cohortYear ? Number(cohortYear) : null,
          notes: notes || null,
        }),
      });
      toast.success("המחזור נוצר");
      onOpenChange(false);
      setName("");
      setCycleDate("");
      setCohortYear(defaultCohortYear);
      setNotes("");
      onCreated?.(data.cycle);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "יצירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={() => onOpenChange(false)} title="מחזור חדש" subtitle="שם, תאריך ושנתון">
      <div className="space-y-4">
        <label className="block space-y-2 text-sm font-bold text-text-secondary">
          שם המחזור
          <input
            className={fieldClass}
            placeholder="לדוגמה: מחזור קיץ 2026"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <TimelineDatePicker value={cycleDate} onChange={setCycleDate} label="תאריך" />
        <label className="block space-y-2 text-sm font-bold text-text-secondary">
          שנתון
          <input
            type="number"
            dir="ltr"
            className={`${fieldClass} text-left`}
            placeholder="2026"
            value={cohortYear}
            onChange={(event) => setCohortYear(event.target.value)}
          />
        </label>
        <label className="block space-y-2 text-sm font-bold text-text-secondary">
          הערות
          <textarea
            className={fieldClass}
            rows={3}
            placeholder="אופציונלי"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
        <div className="ui-divider-top flex gap-2 pt-4">
          <button
            type="button"
            className={`${primaryButtonClass} flex-1`}
            disabled={saving || name.trim().length < 2 || !cycleDate}
            onClick={() => void submit()}
          >
            {saving ? "יוצר…" : "יצירת מחזור"}
          </button>
          <button type="button" className={secondaryButtonClass} onClick={() => onOpenChange(false)}>
            ביטול
          </button>
        </div>
      </div>
    </Drawer>
  );
}
