"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { TaskCloseRequestWithRelations } from "@/types/models";

interface CloseRequestsContextValue {
  ready: boolean;
  canClose: boolean;
  requests: TaskCloseRequestWithRelations[];
  getPendingForTask: (taskId: string) => TaskCloseRequestWithRelations | null;
  refresh: () => Promise<void>;
  requestClose: (taskId: string, note?: string) => Promise<{ ok: boolean; error?: string }>;
  cancelRequest: (requestId: string) => Promise<boolean>;
  approveRequest: (requestId: string) => Promise<boolean>;
  rejectRequest: (requestId: string, reviewNote?: string) => Promise<boolean>;
}

const CloseRequestsContext = createContext<CloseRequestsContextValue | null>(null);

export function CloseRequestsProvider({
  children,
  enabled = true,
}: {
  children: ReactNode;
  enabled?: boolean;
}) {
  const [ready, setReady] = useState(!enabled);
  const [canClose, setCanClose] = useState(false);
  const [requests, setRequests] = useState<TaskCloseRequestWithRelations[]>([]);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setReady(true);
      return;
    }
    const response = await fetch("/api/tasks/close-requests");
    if (!response.ok) {
      setReady(true);
      return;
    }
    const data = (await response.json()) as {
      canClose?: boolean;
      requests?: TaskCloseRequestWithRelations[];
    };
    setCanClose(Boolean(data.canClose));
    setRequests(data.requests ?? []);
    setReady(true);
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const getPendingForTask = useCallback(
    (taskId: string) => requests.find((item) => item.task_id === taskId) ?? null,
    [requests],
  );

  const requestClose = useCallback(
    async (taskId: string, note?: string) => {
      const response = await fetch("/api/tasks/close-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, note: note?.trim() || null }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data.error === "Request already pending") {
          await refresh();
          return { ok: true };
        }
        return { ok: false, error: "שליחת הבקשה נכשלה" };
      }
      await refresh();
      return { ok: true };
    },
    [refresh],
  );

  const cancelRequest = useCallback(
    async (requestId: string) => {
      const response = await fetch(`/api/tasks/close-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (!response.ok) return false;
      await refresh();
      return true;
    },
    [refresh],
  );

  const approveRequest = useCallback(
    async (requestId: string) => {
      const response = await fetch(`/api/tasks/close-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      if (!response.ok) return false;
      await refresh();
      return true;
    },
    [refresh],
  );

  const rejectRequest = useCallback(
    async (requestId: string, reviewNote?: string) => {
      const response = await fetch(`/api/tasks/close-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reviewNote: reviewNote?.trim() || null }),
      });
      if (!response.ok) return false;
      await refresh();
      return true;
    },
    [refresh],
  );

  const value = useMemo(
    () => ({
      ready,
      canClose,
      requests,
      getPendingForTask,
      refresh,
      requestClose,
      cancelRequest,
      approveRequest,
      rejectRequest,
    }),
    [
      ready,
      canClose,
      requests,
      getPendingForTask,
      refresh,
      requestClose,
      cancelRequest,
      approveRequest,
      rejectRequest,
    ],
  );

  return <CloseRequestsContext.Provider value={value}>{children}</CloseRequestsContext.Provider>;
}

export function useCloseRequests(): CloseRequestsContextValue {
  const value = useContext(CloseRequestsContext);
  if (!value) {
    return {
      ready: false,
      canClose: false,
      requests: [],
      getPendingForTask: () => null,
      refresh: async () => undefined,
      requestClose: async () => ({ ok: false, error: "Unavailable" }),
      cancelRequest: async () => false,
      approveRequest: async () => false,
      rejectRequest: async () => false,
    };
  }
  return value;
}
