"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { CreateCandidateDrawer } from "@/modules/agam/components/create-drawers";
import { CreateAgamTaskDrawer } from "@/modules/agam/components/create-task-drawer";
import { CohortSpotlight } from "@/modules/agam/components/cohort-spotlight";
import { AgamTimelineStrip } from "@/modules/agam/components/timeline-strip";
import { AgamTaskRow } from "@/modules/agam/components/task-row";
import { canEvaluate, canRamad } from "@/modules/agam/lib/permissions";
import { panelClass, pageShellClass } from "@/modules/agam/lib/ui";
import type { AgamCandidate, AgamCycle, AgamLinkedTask, AgamOrgSettings, AgamTimelineEventItem } from "@/modules/agam/types";
import type { ModuleRole } from "@/shared/modules/types";

export function AgamDashboardPage({
  initialCandidates = [],
  initialSettings = null,
  initialRole = null,
  initialTimelineEvents = [],
  initialTimelineCycle = null,
  initialGeneralTasks = [],
  initialCycles = [],
  initialCurrentUserId = "",
}: {
  initialCandidates?: AgamCandidate[];
  initialSettings?: AgamOrgSettings | null;
  initialRole?: ModuleRole | null;
  initialTimelineEvents?: AgamTimelineEventItem[];
  initialTimelineCycle?: AgamCycle | null;
  initialGeneralTasks?: AgamLinkedTask[];
  initialCycles?: AgamCycle[];
  initialCurrentUserId?: string;
}) {
  const hasSSR = Boolean(initialRole);
  const [candidates, setCandidates] = useState<AgamCandidate[]>(initialCandidates);
  const [settings, setSettings] = useState<AgamOrgSettings | null>(initialSettings);
  const [role, setRole] = useState<ModuleRole | null>(initialRole);
  const [timelineEvents, setTimelineEvents] = useState<AgamTimelineEventItem[]>(initialTimelineEvents);
  const [timelineCycle, setTimelineCycle] = useState<AgamCycle | null>(initialTimelineCycle);
  const [generalTasks, setGeneralTasks] = useState<AgamLinkedTask[]>(initialGeneralTasks);
  const [cycles, setCycles] = useState<AgamCycle[]>(initialCycles);
  const [currentUserId, setCurrentUserId] = useState(initialCurrentUserId);
  const [loaded, setLoaded] = useState(hasSSR);

  const refreshTasks = () => {
    void agamFetch<{ tasks: AgamLinkedTask[] }>("/api/agam/tasks?general=1")
      .then((data) => setGeneralTasks(data.tasks ?? []))
      .catch(() => toast.error("טעינת המשימות נכשלה"));
  };

  const loadTimeline = useCallback(async (cycleId?: string | null) => {
    const query = cycleId ? `?cycleId=${encodeURIComponent(cycleId)}` : "";
    const timelineData = await agamFetch<{
      events: AgamTimelineEventItem[];
      cycle: AgamCycle | null;
      cycles?: AgamCycle[];
    }>(`/api/agam/timeline${query}`);
    setTimelineEvents(timelineData.events ?? []);
    setTimelineCycle(timelineData.cycle ?? null);
    if (timelineData.cycles) setCycles(timelineData.cycles);
  }, []);

  useEffect(() => {
    if (hasSSR) return;
    void Promise.all([
      agamFetch<{ candidates: AgamCandidate[]; role: ModuleRole; currentUserId: string }>("/api/agam/candidates"),
      agamFetch<{ settings: AgamOrgSettings | null }>("/api/agam/settings"),
      agamFetch<{
        events: AgamTimelineEventItem[];
        cycle: AgamCycle | null;
        cycles: AgamCycle[];
      }>("/api/agam/timeline"),
      agamFetch<{ tasks: AgamLinkedTask[] }>("/api/agam/tasks?general=1"),
      agamFetch<{ cycles: AgamCycle[] }>("/api/agam/cycles"),
    ])
      .then(([candidatesData, settingsData, timelineData, tasksData, cyclesData]) => {
        setCandidates(candidatesData.candidates);
        setRole(candidatesData.role);
        setSettings(settingsData.settings);
        setTimelineEvents(timelineData.events ?? []);
        setTimelineCycle(timelineData.cycle ?? null);
        setGeneralTasks(tasksData.tasks ?? []);
        setCycles(cyclesData.cycles?.length ? cyclesData.cycles : timelineData.cycles ?? []);
        setCurrentUserId(candidatesData.currentUserId ?? "");
      })
      .catch(() => toast.error("טעינת המועמדים נכשלה"))
      .finally(() => setLoaded(true));
  }, [hasSSR]);

  if (!loaded) {
    return <p className="p-6 text-sm text-text-muted">טוען…</p>;
  }

  return (
    <div className={`${pageShellClass} gap-5`}>
      <header className="flex flex-wrap items-center justify-between gap-4 px-1 pt-1">
        <div className="flex min-w-0 items-center gap-3.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={settings?.logo_url || "/logo-mador-omtz.png"}
            alt=""
            className="h-12 w-12 shrink-0 rounded-2xl bg-surface-1 object-contain p-1.5 shadow-sm ring-1 ring-black/[0.05] dark:ring-white/10"
          />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black tracking-tight text-text-primary">
              {settings?.unit_name ?? "קצינים"}
            </h1>
            <p className="truncate text-xs font-semibold text-text-muted">
              הרבנות הצבאית · מיון לקורס קציני דת
            </p>
          </div>
        </div>
        {canEvaluate(role) ? <CreateCandidateDrawer /> : null}
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_19rem] xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <CohortSpotlight
            cycles={cycles}
            candidates={candidates}
            canCreate={canEvaluate(role)}
            onCycleCreated={(cycle) => {
              setCycles((current) => [cycle, ...current]);
              void loadTimeline(cycle.id).catch(() => undefined);
            }}
            onCyclesEnsured={(created) => {
              setCycles((current) => {
                const byId = new Map(current.map((cycle) => [cycle.id, cycle]));
                for (const cycle of created) byId.set(cycle.id, cycle);
                return [...byId.values()];
              });
            }}
            onActiveCycleChange={(cycle) => {
              if (!cycle) return;
              if (timelineCycle?.id === cycle.id) return;
              void loadTimeline(cycle.id).catch(() => toast.error("טעינת לוח הזמנים נכשלה"));
            }}
          />
          <GeneralTasksCard
            tasks={generalTasks}
            currentUserId={currentUserId}
            canEdit={canEvaluate(role)}
            canAdmin={canRamad(role)}
            onChanged={refreshTasks}
          />
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-20">
          <AgamTimelineStrip
            events={timelineEvents}
            cycle={timelineCycle}
            cycles={cycles}
            canManage={canEvaluate(role)}
            onEventsChange={setTimelineEvents}
            onCycleChange={(cycleId) => {
              void loadTimeline(cycleId).catch(() => toast.error("טעינת לוח הזמנים נכשלה"));
            }}
          />
        </aside>
      </div>
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
  const [open, setOpen] = useState(true);
  const openTasks = tasks.filter((task) => task.status !== "completed");
  const done = tasks.filter((task) => task.status === "completed");
  const visible = [...openTasks, ...done].slice(0, 6);
  return (
    <article className={`${panelClass} px-5 pb-4 pt-4`}>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 text-start"
        >
          <h2 className="text-base font-extrabold text-text-primary">משימות</h2>
          <span className="text-xs font-semibold text-text-muted">{openTasks.length} פתוחות</span>
          <ChevronDown
            size={16}
            className={`ms-auto shrink-0 text-text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
        {canEdit ? (
          <CreateAgamTaskDrawer
            requireCycle
            onCreated={onChanged}
            triggerLabel="משימה"
            triggerClassName="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-text-primary transition hover:bg-surface-2"
          />
        ) : null}
      </div>
      {open ? (
        <ul className="mt-3 space-y-1.5">
          {visible.length === 0 ? (
            <li className="text-sm text-text-muted">אין משימות עדיין.</li>
          ) : (
            visible.map((task) => (
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
      ) : null}
    </article>
  );
}
