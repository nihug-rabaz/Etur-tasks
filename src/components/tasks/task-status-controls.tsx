"use client";

import { TaskQuickStatus } from "@/components/tasks/task-quick-status";
import { TaskTzadikSwitch } from "@/components/tasks/task-tzadik-switch";

type TaskStatus = "in_progress" | "completed";

interface TaskStatusControlsProps {
  taskId: string;
  status: TaskStatus;
  size?: "sm" | "md";
  onUpdated?: () => void;
  className?: string;
}

/** Stacks tzadik plan placement above active/completed status. */
export function TaskStatusControls({
  taskId,
  status,
  size = "md",
  onUpdated,
  className = "",
}: TaskStatusControlsProps) {
  return (
    <div className={`inline-flex flex-col items-stretch gap-1 ${className}`}>
      <TaskTzadikSwitch taskId={taskId} size={size} onUpdated={onUpdated} />
      <TaskQuickStatus taskId={taskId} status={status} size={size} onUpdated={onUpdated} />
    </div>
  );
}
