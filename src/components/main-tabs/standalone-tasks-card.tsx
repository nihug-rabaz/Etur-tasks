"use client";

import { ListTodo } from "lucide-react";
import { TabTaskItem } from "@/services/dashboard.service";
import { CreateTaskDrawer } from "@/components/create-task-drawer";
import { TaskRowItem } from "@/components/main-tabs/task-row-item";

interface StandaloneTasksListProps {
  sectionId: string;
  tasks: TabTaskItem[];
  onTaskClick: (task: { id: string; title: string }) => void;
}

export function StandaloneTasksList({ sectionId, tasks, onTaskClick }: StandaloneTasksListProps) {
  const dragProjectId = `standalone-${sectionId}`;

  if (tasks.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-text-muted">
          <ListTodo size={13} />
          משימות ללא פרויקט
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold text-text-secondary">
            {tasks.length}
          </span>
        </span>
        <CreateTaskDrawer defaultSubtopicId={sectionId} iconOnly />
      </div>
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskRowItem
            key={task.id}
            task={task}
            projectId={dragProjectId}
            onClick={() => onTaskClick({ id: task.id, title: task.title })}
          />
        ))}
      </div>
    </div>
  );
}
