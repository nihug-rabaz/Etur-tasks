"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import type { TaskWithRelations } from "@/types/models";

export type TaskLivePatch = Partial<TaskWithRelations> & { id: string };

type Listener = (changes: TaskLivePatch[]) => void;

interface TasksLiveSyncValue {
  publishLocal: (patch: TaskLivePatch | TaskLivePatch[]) => void;
  subscribe: (listener: Listener) => () => void;
}

const TasksLiveSyncContext = createContext<TasksLiveSyncValue | null>(null);

const LIVE_PREFIXES = ["/dashboard", "/tasks", "/projects", "/subtopics", "/domains"];
const POLL_MS = 8_000;

function shouldPoll(pathname: string): boolean {
  return LIVE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function TasksLiveSyncProvider({
  children,
  enabled = true,
}: {
  children: ReactNode;
  enabled?: boolean;
}) {
  const pathname = usePathname();
  const listenersRef = useRef(new Set<Listener>());
  const cursorRef = useRef(new Date().toISOString());
  const inFlightRef = useRef(false);

  const emit = useCallback((changes: TaskLivePatch[]) => {
    if (changes.length === 0) return;
    for (const listener of listenersRef.current) {
      listener(changes);
    }
  }, []);

  const publishLocal = useCallback(
    (patch: TaskLivePatch | TaskLivePatch[]) => {
      const list = Array.isArray(patch) ? patch : [patch];
      emit(list);
    },
    [emit],
  );

  const subscribe = useCallback((listener: Listener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!enabled || !shouldPoll(pathname)) return;

    let cancelled = false;

    const poll = async () => {
      if (cancelled || inFlightRef.current) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      inFlightRef.current = true;
      try {
        const response = await fetch(
          `/api/tasks/changes?since=${encodeURIComponent(cursorRef.current)}`,
          { credentials: "include" },
        );
        if (!response.ok) return;
        const data = (await response.json()) as {
          changes?: TaskWithRelations[];
          cursor?: string;
        };
        const changes = Array.isArray(data.changes) ? data.changes : [];
        if (data.cursor) cursorRef.current = data.cursor;
        if (changes.length > 0) emit(changes);
      } catch {
        // keep last cursor; retry next interval
      } finally {
        inFlightRef.current = false;
      }
    };

    void poll();
    const timer = setInterval(() => {
      void poll();
    }, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") void poll();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, pathname, emit]);

  const value = useMemo(
    () => ({ publishLocal, subscribe }),
    [publishLocal, subscribe],
  );

  return (
    <TasksLiveSyncContext.Provider value={value}>{children}</TasksLiveSyncContext.Provider>
  );
}

export function useTasksLiveSync(): TasksLiveSyncValue {
  const value = useContext(TasksLiveSyncContext);
  if (!value) {
    return {
      publishLocal: () => undefined,
      subscribe: () => () => undefined,
    };
  }
  return value;
}

export function mergeTaskList(
  tasks: TaskWithRelations[],
  changes: TaskLivePatch[],
): TaskWithRelations[] {
  if (changes.length === 0) return tasks;
  const byId = new Map(tasks.map((task) => [task.id, task]));
  for (const change of changes) {
    const existing = byId.get(change.id);
    if (change.status === "completed") {
      byId.delete(change.id);
      continue;
    }
    if (!existing) continue;
    byId.set(change.id, { ...existing, ...change, id: change.id });
  }
  return Array.from(byId.values());
}
