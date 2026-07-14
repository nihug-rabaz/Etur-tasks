"use client";

import { CalendarClock, GripVertical } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent, type KeyboardEvent, type PointerEvent } from "react";
import { TabTaskItem } from "@/services/dashboard.service";
import { TaskAssigneeStack } from "@/components/main-tabs/task-assignee-stack";
import { useTaskDragDrop } from "@/components/main-tabs/task-drag-drop-context";
import { TaskQuickPriority } from "@/components/tasks/task-quick-priority";
import { TaskQuickStatus } from "@/components/tasks/task-quick-status";
import type { TaskPriority } from "@/types/models";

const priorityRowClass: Record<TaskPriority, string> = {
  low: "border-emerald-500/30 bg-emerald-500/10 hover:border-emerald-500/45 hover:bg-emerald-500/15 dark:border-emerald-400/35 dark:bg-emerald-500/20 dark:hover:border-emerald-400/50 dark:hover:bg-emerald-500/25",
  medium:
    "border-amber-500/30 bg-amber-500/10 hover:border-amber-500/45 hover:bg-amber-500/15 dark:border-amber-400/35 dark:bg-amber-500/20 dark:hover:border-amber-400/50 dark:hover:bg-amber-500/25",
  high: "border-rose-500/35 bg-rose-500/10 hover:border-rose-500/50 hover:bg-rose-500/20 dark:border-rose-400/40 dark:bg-rose-500/20 dark:hover:border-rose-400/55 dark:hover:bg-rose-500/30",
};

interface TaskRowItemProps {
  task: TabTaskItem;
  projectId: string;
  onClick: () => void;
}

function isRowChromeTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return true;
  return Boolean(
    target.closest("button, a, input, select, textarea, [data-no-row-click]"),
  );
}

function hasTaskQuickOverlay(): boolean {
  return Boolean(document.querySelector("[data-task-quick-overlay]"));
}

export function TaskRowItem({ task, projectId, onClick }: TaskRowItemProps) {
  const { dragTask, startDrag, endDrag } = useTaskDragDrop();
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const dismissOnlyRef = useRef(false);
  const dragFromHandleRef = useRef(false);
  const rowTone = priorityRowClass[priority] ?? priorityRowClass.medium;
  const isDragging = dragTask?.id === task.id;

  useEffect(() => {
    setPriority(task.priority);
  }, [task.priority]);

  // Capture runs before document mousedown closes the overlay — mark this gesture as dismiss-only.
  const markDismissOnlyIfOverlayOpen = (event: PointerEvent<HTMLDivElement> | MouseEvent<HTMLDivElement>) => {
    if (isRowChromeTarget(event.target)) {
      dismissOnlyRef.current = false;
      return;
    }
    if (hasTaskQuickOverlay()) {
      dismissOnlyRef.current = true;
    }
  };

  const handleRowClick = (event: MouseEvent<HTMLDivElement>) => {
    if (isDragging || dragFromHandleRef.current) return;
    if (isRowChromeTarget(event.target)) return;
    if (dismissOnlyRef.current) {
      dismissOnlyRef.current = false;
      return;
    }
    if (hasTaskQuickOverlay()) return;
    onClick();
  };

  const handleRowKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (isRowChromeTarget(event.target)) return;
    if (hasTaskQuickOverlay()) return;
    event.preventDefault();
    onClick();
  };

  return (
    <div
      data-task-row
      className={`w-full cursor-pointer rounded-xl border transition-[opacity,border-color,background-color] ${rowTone} ${isDragging ? "opacity-40" : ""}`}
      draggable
      role="button"
      tabIndex={0}
      aria-label={`פתח פרטי משימה: ${task.title}`}
      onPointerDownCapture={markDismissOnlyIfOverlayOpen}
      onMouseDownCapture={markDismissOnlyIfOverlayOpen}
      onClick={handleRowClick}
      onKeyDown={handleRowKeyDown}
      onDragStart={(event) => {
        if (!dragFromHandleRef.current) {
          event.preventDefault();
          return;
        }
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", task.id);
        startDrag({ id: task.id, sourceProjectId: projectId, title: task.title });
      }}
      onDragEnd={() => {
        dragFromHandleRef.current = false;
        endDrag();
      }}
    >
      <div className="flex items-start gap-2 px-3 py-2">
        <div data-no-row-click className="mt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <TaskQuickStatus taskId={task.id} status={task.status} size="sm" />
        </div>
        <span
          data-no-row-click
          data-drag-handle
          className="mt-1 shrink-0 cursor-grab touch-none text-text-muted active:cursor-grabbing"
          aria-hidden
          title="גרור להעברה לפרויקט אחר"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            dragFromHandleRef.current = true;
          }}
          onPointerUp={() => {
            if (!isDragging) dragFromHandleRef.current = false;
          }}
          onPointerCancel={() => {
            dragFromHandleRef.current = false;
          }}
        >
          <GripVertical size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="min-w-0 text-sm font-medium text-text-primary">{task.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
            <div data-no-row-click onClick={(e) => e.stopPropagation()}>
              <TaskQuickPriority taskId={task.id} priority={priority} onUpdated={setPriority} />
            </div>
            <span className="inline-flex items-center gap-1">
              <CalendarClock size={12} />
              {task.dueDate ? new Date(task.dueDate).toLocaleDateString("he-IL") : "ללא יעד"}
            </span>
          </div>
        </div>
        <div data-no-row-click onClick={(e) => e.stopPropagation()}>
          <TaskAssigneeStack assignees={task.assignees} />
        </div>
      </div>
    </div>
  );
}
