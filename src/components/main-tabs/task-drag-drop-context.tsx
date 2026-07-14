"use client";

import { createContext, useCallback, useContext, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

interface DragTask {
  id: string;
  sourceProjectId: string;
  title: string;
}

interface TaskDragDropContextValue {
  dragTask: DragTask | null;
  dropTargetProjectId: string | null;
  isPending: boolean;
  startDrag: (task: DragTask) => void;
  endDrag: () => void;
  setDropTarget: (projectId: string | null) => void;
  moveTaskToProject: (taskId: string, targetProjectId: string) => void;
}

const TaskDragDropContext = createContext<TaskDragDropContextValue | null>(null);

export function TaskDragDropProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [dragTask, setDragTask] = useState<DragTask | null>(null);
  const [dropTargetProjectId, setDropTargetProjectId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const startDrag = useCallback((task: DragTask) => {
    setDropTargetProjectId(null);
    setDragTask(task);
  }, []);

  const endDrag = useCallback(() => {
    setDragTask(null);
    setDropTargetProjectId(null);
  }, []);

  // Avoid redundant state writes during high-frequency dragOver events.
  const setDropTarget = useCallback((projectId: string | null) => {
    setDropTargetProjectId((current) => (current === projectId ? current : projectId));
  }, []);

  const moveTaskToProject = useCallback(
    (taskId: string, targetProjectId: string) => {
      startTransition(async () => {
        await fetch("/api/tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: taskId, projectId: targetProjectId }),
        });
        setDragTask(null);
        setDropTargetProjectId(null);
        router.refresh();
      });
    },
    [router],
  );

  const value = useMemo(
    () => ({
      dragTask,
      dropTargetProjectId,
      isPending,
      startDrag,
      endDrag,
      setDropTarget,
      moveTaskToProject,
    }),
    [dragTask, dropTargetProjectId, isPending, startDrag, endDrag, setDropTarget, moveTaskToProject],
  );

  return <TaskDragDropContext.Provider value={value}>{children}</TaskDragDropContext.Provider>;
}

export function useTaskDragDrop() {
  const context = useContext(TaskDragDropContext);
  if (!context) {
    throw new Error("useTaskDragDrop must be used within TaskDragDropProvider");
  }
  return context;
}
