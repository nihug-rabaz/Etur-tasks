"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { CheckCircle2, Hourglass, ListTodo, Users, XCircle } from "lucide-react";
import { toast } from "sonner";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { CreateCandidateDrawer } from "@/modules/agam/components/create-drawers";
import { CreateAgamTaskDrawer } from "@/modules/agam/components/create-task-drawer";
import { CohortCarousel } from "@/modules/agam/components/cohort-carousel";
import { AgamTimelineStrip } from "@/modules/agam/components/timeline-strip";
import { AgamTaskRow } from "@/modules/agam/components/task-row";
import { canEvaluate, canRamad } from "@/modules/agam/lib/permissions";
import { STATUS_LABELS, STATUS_TONES } from "@/modules/agam/lib/stages";
import {
  panelClass,
  pageShellClass,
  panelPadClass,
  secondaryButtonClass,
  dividerClass,
} from "@/modules/agam/lib/ui";
import type { AgamCandidate, AgamCycle, AgamLinkedTask, AgamOrgSettings, AgamTimelineEventItem } from "@/modules/agam/types";
import type { ModuleRole } from "@/shared/modules/types";

function buildCohortCards(cycles: AgamCycle[]) {
  const map = new Map<
    string,
    { key: string; year: number | null; cycleCount: number; candidateCount: number }
  >();
  for (const cycle of cycles) {
    const year = cycle.cohort_year ?? null;
    const key = year == null ? "none" : String(year);
    const existing = map.get(key);
    if (existing) {
      existing.cycleCount += 1;
      existing.candidateCount += cycle.candidate_count ?? 0;
    } else {
      map.set(key, {
        key,
        year,
        cycleCount: 1,
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

export function AgamDashboardPage({
  initialCandidates = [],
  initialSettings = null,
  initialRole = null,
  initialTimelineEvents = [],
  initialGeneralTasks = [],
  initialCycles = [],
  initialCurrentUserId = "",
}: {
  initialCandidates?: AgamCandidate[];
  initialSettings?: AgamOrgSettings | null;
  initialRole?: ModuleRole | null;
  initialTimelineEvents?: AgamTimelineEventItem[];
  initialGeneralTasks?: AgamLinkedTask[];
  initialCycles?: AgamCycle[];
  initialCurrentUserId?: string;
}) {
  const hasSSR = Boolean(initialRole);
  const [candidates, setCandidates] = useState<AgamCandidate[]>(initialCandidates);
  const [settings, setSettings] = useState<AgamOrgSettings | null>(initialSettings);
  const [role, setRole] = useState<ModuleRole | null>(initialRole);
  const [timelineEvents, setTimelineEvents] = useState<AgamTimelineEventItem[]>(initialTimelineEvents);
  const [generalTasks, setGeneralTasks] = useState<AgamLinkedTask[]>(initialGeneralTasks);
  const [cycles, setCycles] = useState<AgamCycle[]>(initialCycles);
  const [currentUserId, setCurrentUserId] = useState(initialCurrentUserId);
  const [loaded, setLoaded] = useState(hasSSR);

  const refreshTasks = () => {
    void agamFetch<{ tasks: AgamLinkedTask[] }>("/api/agam/tasks?general=1")
      .then((data) => setGeneralTasks(data.tasks ?? []))
      .catch(() => toast.error("טעינת המשימות נכשלה"));
  };

  useEffect(() => {
    if (hasSSR) return;
    void Promise.all([
      agamFetch<{ candidates: AgamCandidate[]; role: ModuleRole; currentUserId: string }>("/api/agam/candidates"),
      agamFetch<{ settings: AgamOrgSettings | null }>("/api/agam/settings"),
      agamFetch<{ events: AgamTimelineEventItem[] }>("/api/agam/timeline"),
      agamFetch<{ tasks: AgamLinkedTask[] }>("/api/agam/tasks?general=1"),
      agamFetch<{ cycles: AgamCycle[] }>("/api/agam/cycles"),
    ])
      .then(([candidatesData, settingsData, timelineData, tasksData, cyclesData]) => {
        setCandidates(candidatesData.candidates);
        setRole(candidatesData.role);
        setSettings(settingsData.settings);
        setTimelineEvents(timelineData.events ?? []);
        setGeneralTasks(tasksData.tasks ?? []);
        setCycles(cyclesData.cycles ?? []);
        setCurrentUserId(candidatesData.currentUserId ?? "");
      })
      .catch(() => toast.error("טעינת המועמדים נכשלה"))
      .finally(() => setLoaded(true));
  }, [hasSSR]);

  const isRamad = canRamad(role);
  const cohortCards = useMemo(() => buildCohortCards(cycles), [cycles]);
  const stats = {
    total: candidates.length,
    pending: candidates.filter((row) => row.status === "pending").length,
    passed: candidates.filter((row) => row.status === "passed").length,
    notPassed: candidates.filter((row) => row.status === "not_passed").length,
  };
  const recent = candidates.slice(0, 8);

  if (!loaded) {
    return <p className="p-6 text-sm text-text-muted">טוען…</p>;
  }

  return (
    <div className={pageShellClass}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <article className={`${panelClass} ${panelPadClass} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                הרבנות הצבאית
              </p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-text-primary sm:text-[1.85rem]">
                {settings?.unit_name ?? "קצינים"}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-text-secondary">
                ניהול תהליך המיון לקורס קציני דת — מפרטי המועמד ועד החלטה סופית.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {canEvaluate(role) ? <CreateCandidateDrawer /> : null}
                {canEvaluate(role) ? (
                  <CreateAgamTaskDrawer requireCycle triggerClassName={secondaryButtonClass} />
                ) : null}
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={settings?.logo_url || "/logo-mador-omtz.png"}
              alt={settings?.unit_name ?? "קצינים"}
              className="h-16 w-auto object-contain sm:h-20"
            />
          </article>

          <article>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-text-primary">שנתונים</h2>
                <p className="text-xs text-text-muted">בחרו שנתון כדי להיכנס למחזורים</p>
              </div>
              <Link href="/agam/cycles" className="text-xs font-bold text-accent-primary">
                הכל
              </Link>
            </div>
            {cohortCards.length === 0 ? (
              <div className={`${panelClass} ${panelPadClass} text-center text-sm text-text-muted`}>
                אין שנתונים עדיין — צרו מחזור עם שנתון במסך השנתונים.
              </div>
            ) : (
              <CohortCarousel
                items={cohortCards}
                getHref={(key) => `/agam/cycles?year=${key}`}
              />
            )}
          </article>

          {isRamad ? (
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={Users} label="סה״כ מועמדים" value={stats.total} />
              <StatCard icon={Hourglass} label="ממתינים" value={stats.pending} />
              <StatCard icon={CheckCircle2} label="עברו" value={stats.passed} />
              <StatCard icon={XCircle} label="לא עברו" value={stats.notPassed} />
            </section>
          ) : null}

          <GeneralTasksCard
            tasks={generalTasks}
            currentUserId={currentUserId}
            canEdit={canEvaluate(role)}
            canAdmin={canRamad(role)}
            onChanged={refreshTasks}
          />

          <article className={`${panelClass} ${panelPadClass}`}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-text-primary">מועמדים אחרונים</h2>
              <Link href="/agam/candidates" className="text-xs font-bold text-text-primary">
                הכל
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="text-sm text-text-muted">אין מועמדים עדיין.</p>
            ) : (
              <ul>
                {recent.map((candidate) => (
                  <li key={candidate.id} className={dividerClass}>
                    <Link
                      href={`/agam/candidates/${candidate.id}`}
                      className="flex flex-wrap items-center gap-2 py-2 transition hover:opacity-80"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-text-primary">{candidate.full_name}</p>
                        <p className="text-xs text-text-muted" dir="ltr">
                          {candidate.personal_number}
                        </p>
                      </div>
                      {candidate.status !== "pending" ? (
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_TONES[candidate.status]}`}>
                          {STATUS_LABELS[candidate.status]}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>

        <aside className="w-full shrink-0 overflow-visible pt-3 lg:sticky lg:top-20 lg:w-[16.5rem] lg:self-start xl:w-[18rem]">
          <AgamTimelineStrip
            events={timelineEvents}
            canManage={canEvaluate(role)}
            onEventsChange={setTimelineEvents}
          />
        </aside>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className={`${panelClass} p-3.5`}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">{label}</p>
        <Icon size={16} className="text-text-primary" />
      </div>
      <p className="mt-2 text-2xl font-extrabold text-text-primary">{value}</p>
    </div>
  );
}

function GeneralTasksCard({
  tasks,
  currentUserId,
  canEdit,
  canAdmin,
  onChanged,
}: {
  tasks: AgamLinkedTask[];
  currentUserId: string;
  canEdit: boolean;
  canAdmin: boolean;
  onChanged: () => void;
}) {
  return (
    <article className={`${panelClass} ${panelPadClass}`}>
      <div className="flex flex-wrap items-center gap-2">
        <ListTodo size={18} className="text-text-primary" />
        <h2 className="text-lg font-bold text-text-primary">משימות</h2>
        {canEdit ? <CreateAgamTaskDrawer requireCycle onCreated={onChanged} /> : null}
      </div>
      <ul className="mt-3 space-y-1.5">
        {tasks.length === 0 ? (
          <li className="text-sm text-text-muted">אין משימות עדיין.</li>
        ) : (
          tasks.slice(0, 8).map((task) => (
            <AgamTaskRow
              key={task.id}
              task={task}
              currentUserId={currentUserId}
              canAdmin={canAdmin}
              onSaved={onChanged}
            />
          ))
        )}
      </ul>
    </article>
  );
}
