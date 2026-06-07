"use client";

import { Calendar, Flag, UserRound, FolderKanban } from "lucide-react";
import { TaskWithRelations } from "@/types/models";
import { domainCardStyle } from "@/lib/ui/domains";
import { toHebrewSubtopicLabel } from "@/lib/ui/labels";

interface TasksTableProps {
  tasks: TaskWithRelations[];
  onSelect: (task: TaskWithRelations) => void;
}

const statusBadge: Record<string, string> = {
  in_progress: "border-amber-400 bg-amber-100 text-amber-900 dark:border-amber-400/60 dark:bg-amber-500/25 dark:text-amber-100",
  completed: "border-emerald-400 bg-emerald-100 text-emerald-900 dark:border-emerald-400/60 dark:bg-emerald-500/25 dark:text-emerald-100",
};

const statusLabel: Record<string, string> = {
  in_progress: "בתהליך",
  completed: "הושלמה",
};

const priorityBadge: Record<string, string> = {
  low: "border-emerald-400 bg-emerald-100 text-emerald-800 dark:bg-emerald-500/25 dark:text-emerald-100",
  medium: "border-amber-400 bg-amber-100 text-amber-900 dark:bg-amber-500/25 dark:text-amber-100",
  high: "border-rose-400 bg-rose-100 text-rose-800 dark:bg-rose-500/25 dark:text-rose-100",
};

const priorityLabel: Record<string, string> = {
  low: "נמוכה",
  medium: "בינונית",
  high: "גבוהה",
};

function formatDueDate(value: string | null): string {
  if (!value) return "ללא תאריך";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "ללא תאריך";
  return date.toLocaleDateString("he-IL");
}

export function TasksTable({ tasks, onSelect }: TasksTableProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border-weak px-4 py-8 text-center text-sm text-text-secondary">
        אין משימות להצגה כרגע.
      </div>
    );
  }

  return (
    <div className="dashboard-glass overflow-hidden rounded-3xl">
      <div className="overflow-x-auto">
        <table className="min-w-full text-right text-sm" dir="rtl">
          <thead>
            <tr className="border-b border-border-weak bg-surface-2/70 text-xs font-bold uppercase tracking-wider text-text-secondary">
              <th className="px-4 py-3 font-bold">משימה</th>
              <th className="px-4 py-3 font-bold">תחום</th>
              <th className="px-4 py-3 font-bold">
                <span className="inline-flex items-center gap-1.5">
                  <FolderKanban size={13} />
                  תת-נושא
                </span>
              </th>
              <th className="px-4 py-3 font-bold">
                <span className="inline-flex items-center gap-1.5">
                  <UserRound size={13} />
                  משויך
                </span>
              </th>
              <th className="px-4 py-3 font-bold">
                <span className="inline-flex items-center gap-1.5">
                  <Flag size={13} />
                  עדיפות
                </span>
              </th>
              <th className="px-4 py-3 font-bold">סטטוס</th>
              <th className="px-4 py-3 font-bold">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={13} />
                  יעד
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const domain = domainCardStyle(task.domain_name);
              return (
                <tr
                  key={task.id}
                  onClick={() => onSelect(task)}
                  className="group cursor-pointer border-b border-border-weak/60 transition hover:bg-surface-2/80"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block h-6 w-1 rounded-full ${domain.accent}`} aria-hidden />
                      <span className="font-semibold text-text-primary group-hover:underline">
                        {task.title}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${domain.pillClass}`}>
                      {domain.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {task.subtopic_name ? toHebrewSubtopicLabel(task.subtopic_name) : "—"}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {task.assignee_name ?? "לא משויך"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${priorityBadge[task.priority]}`}>
                      {priorityLabel[task.priority]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${statusBadge[task.status]}`}>
                      {statusLabel[task.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {formatDueDate(task.due_date)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
