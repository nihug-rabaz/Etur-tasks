"use client";

import { useMemo, useState } from "react";
import { TaskCard } from "@/components/task-card";
import { DomainTopicTabs } from "@/components/domain-topic-tabs";
import { CreateTaskDrawer } from "@/components/create-task-drawer";
import { TaskDetailsModal } from "@/components/task-details-modal";
import {
  domainKeys,
  groupTasksByDomain,
  type DomainKey,
} from "@/lib/ui/domains";
import { TaskWithRelations } from "@/types/models";

interface ActiveTasksShellProps {
  tasks: TaskWithRelations[];
}

export function ActiveTasksShell({ tasks }: ActiveTasksShellProps) {
  const [activeDomain, setActiveDomain] = useState<DomainKey | "all">("all");
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

  return (
    <section className="space-y-5">
      <div className="dashboard-glass rounded-3xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">משימות פתוחות</h1>
            <p className="mt-1 text-sm font-medium text-text-secondary">
              {tasks.length} משימות פעילות (לא הושלמו)
            </p>
          </div>
          <CreateTaskDrawer triggerLabel="משימה חדשה" />
        </div>
        <div className="mt-4">
          <DomainTopicTabs active={activeDomain} counts={counts} onChange={setActiveDomain} />
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-border-strong bg-surface-2/60 p-10 text-center text-sm font-medium text-text-secondary">
          אין משימות פעילות להצגה כרגע.
        </div>
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
                    onClick={() => setSelectedTask({ id: task.id, title: task.title })}
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
