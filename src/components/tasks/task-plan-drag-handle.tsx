"use client";

import { GripVertical } from "lucide-react";
import type { DragEvent } from "react";

export interface TaskPlanDragPayload {
  id: string;
  title: string;
  priority: "low" | "medium" | "high";
  status: "in_progress" | "completed";
}

export class TaskPlanDragSource {
  public static readonly MIME = "application/x-etur-task";

  public static write(event: DragEvent, task: TaskPlanDragPayload): void {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("text/plain", task.id);
    event.dataTransfer.setData(this.MIME, JSON.stringify(task));
  }

  public static read(event: DragEvent): TaskPlanDragPayload | null {
    const raw = event.dataTransfer.getData(this.MIME);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<TaskPlanDragPayload>;
      if (typeof parsed.id !== "string" || !parsed.id) return null;
      return {
        id: parsed.id,
        title: typeof parsed.title === "string" ? parsed.title : "משימה",
        priority:
          parsed.priority === "low" || parsed.priority === "high" || parsed.priority === "medium"
            ? parsed.priority
            : "medium",
        status: parsed.status === "completed" ? "completed" : "in_progress",
      };
    } catch {
      return null;
    }
  }
}

interface TaskPlanDragHandleProps {
  task: TaskPlanDragPayload;
  className?: string;
}

export function TaskPlanDragHandle({ task, className = "" }: TaskPlanDragHandleProps) {
  return (
    <button
      type="button"
      data-no-row-click
      draggable
      aria-label={`גרור ללו״ז: ${task.title}`}
      title="גרור ל-To-Do List"
      className={`inline-flex h-8 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-text-muted transition hover:bg-black/5 hover:text-text-primary active:cursor-grabbing dark:hover:bg-white/10 ${className}`}
      onClick={(event) => event.stopPropagation()}
      onDragStart={(event) => TaskPlanDragSource.write(event, task)}
    >
      <GripVertical size={16} aria-hidden />
    </button>
  );
}
