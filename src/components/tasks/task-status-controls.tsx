"use client";

import { TaskQuickStatus } from "@/components/tasks/task-quick-status";
import type { DomainKey } from "@/lib/ui/domains";

type TaskStatus = "in_progress" | "completed";

interface TaskStatusControlsProps {
  taskId: string;
  status: TaskStatus;
  size?: "sm" | "md";
  onUpdated?: () => void;
  className?: string;
  domainSlug?: DomainKey;
}

export function TaskStatusControls({
  taskId,
  status,
  size = "md",
  onUpdated,
  className = "",
}: TaskStatusControlsProps) {
  return (
    <TaskQuickStatus
      taskId={taskId}
      status={status}
      size={size}
      onUpdated={onUpdated}
      className={className}
    />
  );
}
