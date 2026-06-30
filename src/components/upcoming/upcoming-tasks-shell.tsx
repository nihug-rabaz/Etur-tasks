"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TaskDateRangePicker } from "@/components/upcoming/task-date-range-picker";
import { UpcomingTasksCalendar } from "@/components/upcoming/upcoming-tasks-calendar";
import { CreateScheduleDrawer } from "@/components/upcoming/create-schedule-drawer";
import { ScheduleDetailsModal } from "@/components/upcoming/schedule-details-modal";
import { TaskDetailsModal } from "@/components/task-details-modal";
import { domainKeys, domainMeta, DomainKey } from "@/lib/ui/domains";
import { CalendarEventWithRelations, TaskWithRelations } from "@/types/models";

interface UpcomingTasksShellProps {
  rangeStartIso: string;
  rangeEndIso: string;
  fromQueryValue: string;
  toQueryValue: string;
  tasks: TaskWithRelations[];
  events: CalendarEventWithRelations[];
}

export function UpcomingTasksShell({
  rangeStartIso,
  rangeEndIso,
  fromQueryValue,
  toQueryValue,
  tasks,
  events,
}: UpcomingTasksShellProps) {
  const searchParams = useSearchParams();
  const [activeDomains, setActiveDomains] = useState<Set<DomainKey | "all">>(new Set(["all"]));
  const [selectedTask, setSelectedTask] = useState<{ id: string; title: string } | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<{ id: string; title: string } | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<string | undefined>(undefined);

  useEffect(() => {
    const scheduleId = searchParams.get("schedule");
    if (!scheduleId) return;
    const match = events.find((event) => event.id === scheduleId);
    setSelectedSchedule({ id: scheduleId, title: match?.title ?? "לו״ז" });
  }, [searchParams, events]);

  const toggleDomain = (key: DomainKey | "all") => {
    setActiveDomains((current) => {
      if (key === "all") return new Set(["all"]);
      const next = new Set(current);
      next.delete("all");
      if (next.has(key)) next.delete(key);
      else next.add(key);
      if (next.size === 0) return new Set(["all"]);
      return next;
    });
  };

  const visibleCount = useMemo(() => {
    const filterDomain = (domainName?: string) => {
      if (activeDomains.has("all")) return true;
      const name = domainName;
      if (name === "Recruitment") return activeDomains.has("recruitment");
      if (name === "Positioning") return activeDomains.has("positioning");
      if (name === "General") return activeDomains.has("general");
      return false;
    };
    return tasks.filter((t) => filterDomain(t.domain_name)).length +
      events.filter((e) => filterDomain(e.domain_name)).length;
  }, [tasks, events, activeDomains]);

  return (
    <section className="space-y-5">
      <div className="surface-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">לוח זמנים</h1>
            <p className="mt-1 text-sm text-text-secondary">
              משימות ולו״זים · {visibleCount} פריטים מוצגים · התראות בטלגרם + סיכום בוקר
            </p>
          </div>
          <CreateScheduleDrawer defaultDayKey={selectedDayKey} />
        </div>
      </div>

      <TaskDateRangePicker
        rangeStartIso={rangeStartIso}
        rangeEndIso={rangeEndIso}
        fromQueryValue={fromQueryValue}
        toQueryValue={toQueryValue}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => toggleDomain("all")}
          className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
            activeDomains.has("all")
              ? "bg-accent-primary/15 text-accent-primary"
              : "bg-surface-2 text-text-secondary hover:text-text-primary"
          }`}
        >
          הכל
        </button>
        {domainKeys.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => toggleDomain(key)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
              activeDomains.has(key)
                ? domainMeta[key].pillClass
                : "bg-surface-2 text-text-secondary hover:text-text-primary"
            }`}
          >
            {domainMeta[key].label}
          </button>
        ))}
      </div>

      <UpcomingTasksCalendar
        rangeStartIso={rangeStartIso}
        rangeEndIso={rangeEndIso}
        tasks={tasks}
        events={events}
        activeDomains={activeDomains}
        onTaskClick={setSelectedTask}
        onScheduleClick={setSelectedSchedule}
        onSelectedDayChange={(dayKey) => setSelectedDayKey(dayKey ?? undefined)}
      />

      {selectedTask ? (
        <TaskDetailsModal
          open={Boolean(selectedTask)}
          onClose={() => setSelectedTask(null)}
          taskId={selectedTask.id}
          taskTitle={selectedTask.title}
        />
      ) : null}

      {selectedSchedule ? (
        <ScheduleDetailsModal
          open={Boolean(selectedSchedule)}
          onClose={() => setSelectedSchedule(null)}
          eventId={selectedSchedule.id}
          eventTitle={selectedSchedule.title}
        />
      ) : null}
    </section>
  );
}
