"use client";

import { CalendarClock } from "lucide-react";
import { TabTaskItem } from "@/services/dashboard.service";
import { TaskAssigneeStack } from "@/components/main-tabs/task-assignee-stack";

const statusLabel: Record<TabTaskItem["status"], string> = {
  in_progress: "בתהליך",
  completed: "הושלמה",
};

const priorityLabel: Record<TabTaskItem["priority"], string> = {
  low: "נמוכה",
  medium: "בינונית",
  high: "גבוהה",
};

const priorityRowClass: Record<TabTaskItem["priority"], string> = {
  low: "border-emerald-500/30 bg-emerald-500/10 hover:border-emerald-500/45 hover:bg-emerald-500/15 dark:border-emerald-400/35 dark:bg-emerald-500/20 dark:hover:border-emerald-400/50 dark:hover:bg-emerald-500/25",
  medium:
    "border-amber-500/30 bg-amber-500/10 hover:border-amber-500/45 hover:bg-amber-500/15 dark:border-amber-400/35 dark:bg-amber-500/20 dark:hover:border-amber-400/50 dark:hover:bg-amber-500/25",
  high: "border-rose-500/35 bg-rose-500/10 hover:border-rose-500/50 hover:bg-rose-500/20 dark:border-rose-400/40 dark:bg-rose-500/20 dark:hover:border-rose-400/55 dark:hover:bg-rose-500/30",
};

const priorityBadgeClass: Record<TabTaskItem["priority"], string> = {
  low: "border-emerald-500/40 bg-emerald-500/15 text-emerald-900 dark:border-emerald-400/45 dark:bg-emerald-500/25 dark:text-emerald-100",
  medium:
    "border-amber-500/40 bg-amber-500/15 text-amber-950 dark:border-amber-400/45 dark:bg-amber-500/25 dark:text-amber-50",
  high: "border-rose-500/45 bg-rose-500/15 text-rose-950 dark:border-rose-400/50 dark:bg-rose-500/25 dark:text-rose-50",
};

interface TaskRowItemProps {
  task: TabTaskItem;
  onClick: () => void;
}

export function TaskRowItem({ task, onClick }: TaskRowItemProps) {
  const rowTone = priorityRowClass[task.priority] ?? priorityRowClass.medium;
  const badgeTone = priorityBadgeClass[task.priority] ?? priorityBadgeClass.medium;
  return (
    <div className={`w-full rounded-xl border transition ${rowTone}`}>
      <div className="flex items-start gap-2 px-3 py-2">
        <button
          type="button"
          onClick={onClick}
          className="min-w-0 flex-1 rounded-lg text-start text-sm transition focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 flex-1 font-medium text-text-primary">{task.title}</p>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
            <span className="rounded-full border border-border-weak bg-surface-1/70 px-2 py-0.5">
              {statusLabel[task.status]}
            </span>
            <span className={`rounded-full border px-2 py-0.5 ${badgeTone}`}>
              עדיפות {priorityLabel[task.priority] ?? priorityLabel.medium}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarClock size={12} />
              {task.dueDate ? new Date(task.dueDate).toLocaleDateString("he-IL") : "ללא יעד"}
            </span>
          </div>
        </button>
        <TaskAssigneeStack assignees={task.assignees} />
      </div>
    </div>
  );
}
