"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, Rows3 } from "lucide-react";
import { TaskCard } from "@/components/task-card";
import { DomainTopicTabs } from "@/components/domain-topic-tabs";
import { CreateTaskDrawer } from "@/components/create-task-drawer";
import { TaskDetailsModal } from "@/components/task-details-modal";
import { TasksTable } from "@/components/tasks/tasks-table";
import {
  domainKeys,
  groupTasksByDomain,
  type DomainKey,
} from "@/lib/ui/domains";
import { TaskWithRelations } from "@/types/models";

type ViewMode = "cards" | "table";

interface ActiveTasksShellProps {
  tasks: TaskWithRelations[];
}

export function ActiveTasksShell({ tasks }: ActiveTasksShellProps) {
  const [activeDomain, setActiveDomain] = useState<DomainKey | "all">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [selectedTask, setSelectedTask] = useState<{ id: string; title: string } | null>(null);

  const grouped = useMemo(() => groupTasksByDomain(tasks), [tasks]);
  const counts = useMemo(
    () => ({
      recruitment: grouped.recruitment.length,
      positioning: grouped.positioning.length,
      general: grouped.general.length,
    }),
    [grouped],
  );

  const visibleDomains = activeDomain === "all" ? domainKeys : [activeDomain];

  const tableTasks = useMemo(
    () => visibleDomains.flatMap((key) => grouped[key]),
    [visibleDomains, grouped],
  );

  const openTaskDetails = (task: TaskWithRelations) =>
    setSelectedTask({ id: task.id, title: task.title });

  return (
    <section className="space-y-5">
      <div className="dashboard-glass rounded-3xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">משימות פעילות</h1>
            <p className="mt-1 text-sm font-medium text-text-secondary">
              {tasks.length} משימות פעילות (לא הושלמו)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
            <CreateTaskDrawer triggerLabel="משימה חדשה" />
          </div>
        </div>
        <div className="mt-4">
          <DomainTopicTabs active={activeDomain} counts={counts} onChange={setActiveDomain} />
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-border-strong bg-surface-2/60 p-10 text-center text-sm font-medium text-text-secondary">
          אין משימות פעילות להצגה כרגע.
        </div>
      ) : viewMode === "table" ? (
        <TasksTable tasks={tableTasks} onSelect={openTaskDetails} />
      ) : (
        <div className="space-y-6">
          {visibleDomains.map((key) => {
            const domainTasks = grouped[key];
            if (activeDomain !== "all" && domainTasks.length === 0) {
              return (
                <div
                  key={key}
                  className="rounded-2xl border-2 border-dashed border-border-weak px-4 py-8 text-center text-sm text-text-secondary"
                >
                  אין משימות בתחום זה.
                </div>
              );
            }
            if (domainTasks.length === 0) return null;
            return (
              <div key={key} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {domainTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => openTaskDetails(task)}
                    className="cursor-pointer text-start"
                  >
                    <TaskCard task={task} />
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}

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

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  const baseClass =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition";
  const activeClass = "bg-text-primary text-surface-1 shadow-sm";
  const idleClass = "text-text-secondary hover:text-text-primary";

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border-weak bg-surface-2/70 p-1">
      <button
        type="button"
        onClick={() => onChange("cards")}
        aria-pressed={value === "cards"}
        title="תצוגת כרטיסיות"
        className={`${baseClass} ${value === "cards" ? activeClass : idleClass}`}
      >
        <LayoutGrid size={14} />
        כרטיסיות
      </button>
      <button
        type="button"
        onClick={() => onChange("table")}
        aria-pressed={value === "table"}
        title="תצוגת טבלה"
        className={`${baseClass} ${value === "table" ? activeClass : idleClass}`}
      >
        <Rows3 size={14} />
        טבלה
      </button>
    </div>
  );
}
