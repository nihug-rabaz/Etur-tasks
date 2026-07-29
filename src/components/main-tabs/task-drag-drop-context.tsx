"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { DomainKey } from "@/lib/ui/domains";

export interface DomainDropTarget {
  subtopicId: string;
  label: string;
}

interface DragTask {
  id: string;
  sourceProjectId: string;
  sourceDomainSlug: DomainKey;
  title: string;
}

interface DragActiveState {
  active: boolean;
  sourceDomainSlug?: DomainKey;
}

interface TaskDragDropContextValue {
  dragTask: DragTask | null;
  dropTargetProjectId: string | null;
  dropTargetDomainSlug: DomainKey | null;
  isPending: boolean;
  startDrag: (task: DragTask) => void;
  endDrag: () => void;
  setDropTarget: (projectId: string | null) => void;
  setDropTargetDomain: (domainSlug: DomainKey | null) => void;
  scheduleTabSwitch: (domainSlug: DomainKey, activeTab: DomainKey | "all") => void;
  cancelTabSwitch: () => void;
  moveTaskToProject: (taskId: string, targetProjectId: string) => void;
  moveTaskToDomain: (taskId: string, domainSlug: DomainKey) => void;
}

const TaskDragDropContext = createContext<TaskDragDropContextValue | null>(null);

interface TaskDragDropProviderProps {
  children: ReactNode;
  domainDropTargets: Partial<Record<DomainKey, DomainDropTarget>>;
  onMovedToDomain?: (domainSlug: DomainKey) => void;
  onSwitchTabWhileDragging?: (domainSlug: DomainKey) => void;
  onDragActiveChange?: (state: DragActiveState) => void;
}

export function TaskDragDropProvider({
  children,
  domainDropTargets,
  onMovedToDomain,
  onSwitchTabWhileDragging,
  onDragActiveChange,
}: TaskDragDropProviderProps) {
  const router = useRouter();
  const [dragTask, setDragTask] = useState<DragTask | null>(null);
  const [dropTargetProjectId, setDropTargetProjectId] = useState<string | null>(null);
  const [dropTargetDomainSlug, setDropTargetDomainSlug] = useState<DomainKey | null>(null);
  const [isPending, startTransition] = useTransition();
  const tabSwitchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabSwitchTargetRef = useRef<DomainKey | null>(null);

  const clearTabSwitchTimer = useCallback(() => {
    if (tabSwitchTimerRef.current) clearTimeout(tabSwitchTimerRef.current);
    tabSwitchTimerRef.current = null;
    tabSwitchTargetRef.current = null;
  }, []);

  const startDrag = useCallback(
    (task: DragTask) => {
      setDropTargetProjectId(null);
      setDropTargetDomainSlug(null);
      clearTabSwitchTimer();
      setDragTask(task);
      onDragActiveChange?.({ active: true, sourceDomainSlug: task.sourceDomainSlug });
    },
    [clearTabSwitchTimer, onDragActiveChange],
  );

  const endDrag = useCallback(() => {
    clearTabSwitchTimer();
    setDragTask(null);
    setDropTargetProjectId(null);
    setDropTargetDomainSlug(null);
    onDragActiveChange?.({ active: false });
  }, [clearTabSwitchTimer, onDragActiveChange]);

  const setDropTarget = useCallback((projectId: string | null) => {
    setDropTargetProjectId((current) => (current === projectId ? current : projectId));
    if (projectId) setDropTargetDomainSlug(null);
  }, []);

  const setDropTargetDomain = useCallback((domainSlug: DomainKey | null) => {
    setDropTargetDomainSlug((current) => (current === domainSlug ? current : domainSlug));
    if (domainSlug) setDropTargetProjectId(null);
  }, []);

  const cancelTabSwitch = useCallback(() => {
    clearTabSwitchTimer();
  }, [clearTabSwitchTimer]);

  const scheduleTabSwitch = useCallback(
    (domainSlug: DomainKey, activeTab: DomainKey | "all") => {
      if (!dragTask || activeTab === domainSlug) {
        clearTabSwitchTimer();
        return;
      }
      if (tabSwitchTargetRef.current === domainSlug) return;
      clearTabSwitchTimer();
      tabSwitchTargetRef.current = domainSlug;
      tabSwitchTimerRef.current = setTimeout(() => {
        tabSwitchTargetRef.current = null;
        tabSwitchTimerRef.current = null;
        onSwitchTabWhileDragging?.(domainSlug);
      }, 420);
    },
    [clearTabSwitchTimer, dragTask, onSwitchTabWhileDragging],
  );

  useEffect(() => () => clearTabSwitchTimer(), [clearTabSwitchTimer]);

  const moveTaskToProject = useCallback(
    (taskId: string, targetProjectId: string) => {
      startTransition(async () => {
        await fetch("/api/tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: taskId, projectId: targetProjectId }),
        });
        endDrag();
        router.refresh();
      });
    },
    [endDrag, router],
  );

  const moveTaskToDomain = useCallback(
    (taskId: string, domainSlug: DomainKey) => {
      const target = domainDropTargets[domainSlug];
      if (!target) return;
      startTransition(async () => {
        await fetch("/api/tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: taskId,
            subtopicIds: [target.subtopicId],
            projectId: null,
          }),
        });
        endDrag();
        onMovedToDomain?.(domainSlug);
        router.refresh();
      });
    },
    [domainDropTargets, endDrag, onMovedToDomain, router],
  );

  const value = useMemo(
    () => ({
      dragTask,
      dropTargetProjectId,
      dropTargetDomainSlug,
      isPending,
      startDrag,
      endDrag,
      setDropTarget,
      setDropTargetDomain,
      scheduleTabSwitch,
      cancelTabSwitch,
      moveTaskToProject,
      moveTaskToDomain,
    }),
    [
      dragTask,
      dropTargetProjectId,
      dropTargetDomainSlug,
      isPending,
      startDrag,
      endDrag,
      setDropTarget,
      setDropTargetDomain,
      scheduleTabSwitch,
      cancelTabSwitch,
      moveTaskToProject,
      moveTaskToDomain,
    ],
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

export function useOptionalTaskDragDrop() {
  return useContext(TaskDragDropContext);
}
