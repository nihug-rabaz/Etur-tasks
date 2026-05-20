"use client";

import { useMemo, useState } from "react";
import { TaskDateRangePicker } from "@/components/upcoming/task-date-range-picker";
import { UpcomingTasksCalendar } from "@/components/upcoming/upcoming-tasks-calendar";
import { TaskDetailsModal } from "@/components/task-details-modal";
import { domainKeys, domainMeta, DomainKey } from "@/lib/ui/domains";
import { TaskWithRelations } from "@/types/models";

interface UpcomingTasksShellProps {
  rangeStartIso: string;
  rangeEndIso: string;
  fromQueryValue: string;
  toQueryValue: string;
  tasks: TaskWithRelations[];
}

export function UpcomingTasksShell({
  rangeStartIso,
  rangeEndIso,
  fromQueryValue,
  toQueryValue,
  tasks,
}: UpcomingTasksShellProps) {
  const [activeDomains, setActiveDomains] = useState<Set<DomainKey | "all">>(new Set(["all"]));
  const [selectedTask, setSelectedTask] = useState<{ id: string; title: string } | null>(null);

  const toggleDomain = (key: DomainKey | "all") => {
    setActiveDomains((current) => {
      if (key === "all") return new Set(["all"]);
      const next = new Set(current);
      next.delete("all");
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      if (next.size === 0) return new Set(["all"]);
      return next;
    });
  };

  const visibleCount = useMemo(() => {
    if (activeDomains.has("all")) return tasks.length;
    return tasks.filter((task) => {
      const name = task.domain_name;
      if (name === "Recruitment") return activeDomains.has("recruitment");
      if (name === "Positioning") return activeDomains.has("positioning");
      if (name === "General") return activeDomains.has("general");
      return false;
    }).length;
  }, [tasks, activeDomains]);

  return (
    <section className="space-y-5">
      <div className="glow-ring rounded-3xl border border-border-weak bg-gradient-to-l from-surface-1 via-surface-1 to-surface-2/80 p-5 shadow-[0_16px_40px_rgba(2,6,23,0.15)]">
        <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">משימות קרובות</h1>
        <p className="mt-1 text-sm text-text-secondary">
          לוח שנה חי לפי תאריך יעד · {visibleCount} משימות מוצגות כרגע
        </p>
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
          className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
            activeDomains.has("all")
              ? "border-accent-primary/60 bg-accent-primary/15 text-accent-primary"
              : "border-border-weak bg-surface-1/80 text-text-secondary hover:text-text-primary"
          }`}
        >
          הכל
        </button>
        {domainKeys.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => toggleDomain(key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
              activeDomains.has(key)
                ? `border-accent-primary/50 ${domainMeta[key].pillClass}`
                : "border-border-weak bg-surface-1/80 text-text-secondary hover:text-text-primary"
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
        activeDomains={activeDomains}
        onTaskClick={setSelectedTask}
      />

      {selectedTask ? (
        <TaskDetailsModal
          open={Boolean(selectedTask)}
          onClose={() => setSelectedTask(null)}
          taskId={selectedTask.id}
          taskTitle={selectedTask.title}
        />
      ) : null}
    </section>
  );
}
