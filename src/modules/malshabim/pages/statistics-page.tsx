"use client";

import { useMemo } from "react";
import {
  CANDIDATE_STATUSES,
  enlistmentYearGroup,
  normalizeCandidateStatus,
} from "@/modules/malshabim/lib/status";
import { pageShellClass, panelClass } from "@/modules/malshabim/lib/ui";
import type { MalshabimCandidate } from "@/modules/malshabim/types";

function BarRow({ label, count, max }: { label: string; count: number; max: number }) {
  const width = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="text-text-primary">{label}</span>
        <span className="text-text-muted">{count}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-accent-primary"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export function MalshabimStatisticsPage({
  initialCandidates,
}: {
  initialCandidates: MalshabimCandidate[];
}) {
  const active = useMemo(
    () => initialCandidates.filter((c) => !c.is_draft),
    [initialCandidates],
  );

  const byStatus = useMemo(() => {
    return CANDIDATE_STATUSES.map((status) => ({
      label: status,
      count: active.filter(
        (c) => normalizeCandidateStatus(c.candidate_status) === status,
      ).length,
    }));
  }, [active]);

  const byYearGroup = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of active) {
      const key = enlistmentYearGroup(c.enlistment_date);
      map.set(key, (map.get(key) || 0) + 1);
    }
    return [...map.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => {
        if (a.label === "ללא שנתון") return 1;
        if (b.label === "ללא שנתון") return -1;
        return Number(b.label) - Number(a.label);
      });
  }, [active]);

  const byTrack = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of active) {
      const key = c.recruitment_track || "ללא מסלול";
      map.set(key, (map.get(key) || 0) + 1);
    }
    return [...map.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }, [active]);

  const quizPassed = active.filter((c) => c.quiz_passed).length;
  const maxStatus = Math.max(1, ...byStatus.map((x) => x.count));
  const maxYear = Math.max(1, ...byYearGroup.map((x) => x.count), 1);
  const maxTrack = Math.max(1, ...byTrack.map((x) => x.count), 1);

  return (
    <div className={pageShellClass} dir="rtl">
      <div className={`${panelClass} p-5`}>
        <h1 className="text-xl font-bold text-text-primary">סטטיסטיקה</h1>
        <p className="mt-1 text-sm text-text-secondary">
          סיכום מועמדים פעילים (ללא ראיונות פתוחים)
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className={`${panelClass} p-5`}>
          <p className="text-xs font-semibold text-text-muted">סה״כ</p>
          <p className="mt-1 text-3xl font-black text-text-primary">{active.length}</p>
        </div>
        <div className={`${panelClass} p-5`}>
          <p className="text-xs font-semibold text-text-muted">עברו מבחן</p>
          <p className="mt-1 text-3xl font-black text-text-primary">{quizPassed}</p>
        </div>
        <div className={`${panelClass} p-5`}>
          <p className="text-xs font-semibold text-text-muted">ראיון</p>
          <p className="mt-1 text-3xl font-black text-text-primary">
            {initialCandidates.length - active.length}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className={`${panelClass} space-y-3 p-5`}>
          <h2 className="text-sm font-bold text-text-primary">לפי סטטוס</h2>
          {byStatus.map((row) => (
            <BarRow key={row.label} {...row} max={maxStatus} />
          ))}
        </section>
        <section className={`${panelClass} space-y-3 p-5`}>
          <h2 className="text-sm font-bold text-text-primary">שנתונים</h2>
          {byYearGroup.length === 0 ? (
            <p className="text-sm text-text-muted">אין נתונים</p>
          ) : (
            byYearGroup.map((row) => <BarRow key={row.label} {...row} max={maxYear} />)
          )}
        </section>
        <section className={`${panelClass} space-y-3 p-5`}>
          <h2 className="text-sm font-bold text-text-primary">מסלול גיוס</h2>
          {byTrack.length === 0 ? (
            <p className="text-sm text-text-muted">אין נתונים</p>
          ) : (
            byTrack.map((row) => <BarRow key={row.label} {...row} max={maxTrack} />)
          )}
        </section>
      </div>
    </div>
  );
}
