"use client";

import { TaskQuickStatus } from "@/components/tasks/task-quick-status";
import type { DomainKey } from "@/lib/ui/domains";

type TaskStatus = "in_progress" | "completed";

interface TaskStatusControlsProps {
  taskId: string;
  status: TaskStatus;
  assigneeIds?: string[];
  size?: "sm" | "md";
  onUpdated?: () => void;
  className?: string;
  domainSlug?: DomainKey;
}

export function TaskStatusControls({
  taskId,
  status,
  assigneeIds,
  size = "md",
  onUpdated,
  className = "",
}: TaskStatusControlsProps) {
  return (
    <TaskQuickStatus
      taskId={taskId}
      status={status}
      assigneeIds={assigneeIds}
      size={size}
      onUpdated={onUpdated}
      className={className}
    />
  );
}
