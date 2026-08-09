"use client";

import { Calendar, Flag, UserRound, FolderKanban } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { TaskWithRelations, type TaskPriority } from "@/types/models";
import { domainCardStyle, domainKeyFromName } from "@/lib/ui/domains";
import { toHebrewSubtopicLabel } from "@/lib/ui/labels";
import { TaskQuickPriority } from "@/components/tasks/task-quick-priority";
import { TaskStatusControls } from "@/components/tasks/task-status-controls";
import { TaskPlanDragHandle } from "@/components/tasks/task-plan-drag-handle";

interface TasksTableProps {
  tasks: TaskWithRelations[];
  onSelect: (task: TaskWithRelations) => void;
  embedded?: boolean;
  enablePlanDrag?: boolean;
}

function formatDueDate(value: string | null): string {
  if (!value) return "ללא תאריך";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "ללא תאריך";
  return date.toLocaleDateString("he-IL");
}

function hasTaskQuickOverlay(): boolean {
  return Boolean(document.querySelector("[data-task-quick-overlay]"));
}

export function TasksTable({
  tasks,
  onSelect,
  embedded = false,
  enablePlanDrag = false,
}: TasksTableProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border-weak px-4 py-8 text-center text-sm text-text-secondary">
        אין משימות להצגה כרגע.
      </div>
    );
  }

  return (
    <div className={embedded ? "overflow-hidden rounded-2xl bg-surface-1/70" : "dashboard-glass overflow-hidden rounded-3xl"}>
      <div className="overflow-x-auto">
        <table className="min-w-[920px] w-full table-fixed text-right text-sm" dir="rtl">
          <colgroup>
            {enablePlanDrag ? <col className="w-[4%]" /> : null}
            <col className={enablePlanDrag ? "w-[24%]" : "w-[28%]"} />
            <col className="w-[10%]" />
            <col className="w-[12%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[8%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border-weak bg-surface-2/70 text-xs font-bold uppercase tracking-wider text-text-secondary">
              {enablePlanDrag ? <th className="px-2 py-3 font-bold" aria-label="גרירה ללו״ז" /> : null}
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
            {tasks.map((task) => (
              <TaskTableRow
                key={task.id}
                task={task}
                onSelect={onSelect}
                enablePlanDrag={enablePlanDrag}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TaskTableRow({
  task,
  onSelect,
  enablePlanDrag,
}: {
  task: TaskWithRelations;
  onSelect: (task: TaskWithRelations) => void;
  enablePlanDrag: boolean;
}) {
  const domain = domainCardStyle(task.domain_name);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const dismissOnlyRef = useRef(false);

  useEffect(() => {
    setPriority(task.priority);
  }, [task.priority]);

  const markDismissOnlyIfOverlayOpen = (event: PointerEvent<HTMLTableRowElement> | MouseEvent<HTMLTableRowElement>) => {
    const target = event.target;
    if (target instanceof Element && target.closest("button, [data-no-row-click]")) {
      dismissOnlyRef.current = false;
      return;
    }
    if (hasTaskQuickOverlay()) {
      dismissOnlyRef.current = true;
    }
  };

  const handleRowClick = (event: MouseEvent<HTMLTableRowElement>) => {
    const target = event.target;
    if (target instanceof Element && target.closest("button, [data-no-row-click]")) return;
    if (dismissOnlyRef.current) {
      dismissOnlyRef.current = false;
      return;
    }
    if (hasTaskQuickOverlay()) return;
    onSelect(task);
  };

  return (
    <tr
      onPointerDownCapture={markDismissOnlyIfOverlayOpen}
      onMouseDownCapture={markDismissOnlyIfOverlayOpen}
      onClick={handleRowClick}
      className="group h-14 cursor-pointer border-b border-border-weak/60 transition hover:bg-surface-2/80"
    >
      {enablePlanDrag ? (
        <td className="px-1 py-2 align-middle" data-no-row-click onClick={(event) => event.stopPropagation()}>
          <TaskPlanDragHandle
            task={{
              id: task.id,
              title: task.title,
              priority: task.priority,
              status: task.status === "completed" ? "completed" : "in_progress",
            }}
          />
        </td>
      ) : null}
      <td className="px-4 py-2 align-middle">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`inline-block h-6 w-1 shrink-0 rounded-full ${domain.accent}`} aria-hidden />
          <span className="truncate font-semibold text-text-primary group-hover:underline" title={task.title}>
            {task.title}
          </span>
        </div>
      </td>
      <td className="px-4 py-2 align-middle whitespace-nowrap">
        <span className={`inline-flex max-w-full truncate rounded-full px-2.5 py-1 text-xs font-bold ${domain.pillClass}`}>
          {domain.label}
        </span>
      </td>
      <td
        className="truncate px-4 py-2 align-middle text-text-secondary"
        title={task.subtopic_name ? toHebrewSubtopicLabel(task.subtopic_name) : undefined}
      >
        {task.subtopic_name ? toHebrewSubtopicLabel(task.subtopic_name) : "—"}
      </td>
      <td
        className="truncate px-4 py-2 align-middle text-text-secondary"
        title={task.assignee_name ?? undefined}
      >
        {task.assignee_name ?? "לא משויך"}
      </td>
      <td className="px-4 py-2 align-middle whitespace-nowrap" data-no-row-click onClick={(event) => event.stopPropagation()}>
        <TaskQuickPriority taskId={task.id} priority={priority} onUpdated={setPriority} />
      </td>
      <td className="px-4 py-2 align-middle whitespace-nowrap" data-no-row-click onClick={(event) => event.stopPropagation()}>
        <TaskStatusControls
          taskId={task.id}
          status={task.status}
          size="sm"
          domainSlug={domainKeyFromName(task.domain_name) ?? undefined}
        />
      </td>
      <td className="px-4 py-2 align-middle whitespace-nowrap text-text-secondary">{formatDueDate(task.due_date)}</td>
    </tr>
  );
}
