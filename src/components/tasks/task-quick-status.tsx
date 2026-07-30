"use client";

import { Check, HandHelping, Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useCloseRequests } from "@/components/tasks/close-requests-context";
import { CloseRequestPendingBadge } from "@/components/tasks/admin-close-requests-inbox";

type TaskStatus = "in_progress" | "completed";

interface TaskQuickStatusProps {
  taskId: string;
  status: TaskStatus;
  size?: "sm" | "md";
  onUpdated?: () => void;
  className?: string;
}

const options: Array<{
  value: TaskStatus;
  label: string;
  shortLabel: string;
  active: string;
  idle: string;
}> = [
  {
    value: "in_progress",
    label: "בתהליך",
    shortLabel: "פעיל",
    active: "bg-amber-500 text-white shadow-[0_4px_14px_-4px_rgba(245,158,11,0.75)]",
    idle: "text-amber-800/80 hover:bg-amber-500/15 dark:text-amber-100/80",
  },
  {
    value: "completed",
    label: "הושלמה",
    shortLabel: "הושלם",
    active: "bg-emerald-500 text-white shadow-[0_4px_14px_-4px_rgba(16,185,129,0.75)]",
    idle: "text-emerald-800/80 hover:bg-emerald-500/15 dark:text-emerald-100/80",
  },
];

const CONFIRM_WIDTH = 228;
const REQUEST_WIDTH = 248;

export function TaskQuickStatus({
  taskId,
  status,
  size = "md",
  onUpdated,
  className = "",
}: TaskQuickStatusProps) {
  const router = useRouter();
  const { ready, canClose, getPendingForTask, requestClose, approveRequest } = useCloseRequests();
  const anchorRef = useRef<HTMLDivElement>(null);
  const confirmId = useId();
  const [current, setCurrent] = useState(status);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestNote, setRequestNote] = useState("");
  const [requestError, setRequestError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [isPending, startTransition] = useTransition();
  const pendingRequest = getPendingForTask(taskId);
  const compact = size === "sm";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setCurrent(status);
    setConfirmArchive(false);
    setRequestOpen(false);
  }, [status]);

  const syncPopoverPosition = (width: number, height: number) => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let left = rect.right - width;
    if (left < 8) left = 8;
    if (left + width > window.innerWidth - 8) {
      left = window.innerWidth - width - 8;
    }
    let top = rect.bottom + 8;
    if (top + height > window.innerHeight - 8) {
      top = rect.top - height - 8;
    }
    setPos({ top, left });
  };

  useLayoutEffect(() => {
    if (!confirmArchive && !requestOpen) return;
    const width = requestOpen ? REQUEST_WIDTH : CONFIRM_WIDTH;
    const height = requestOpen ? 168 : 108;
    syncPopoverPosition(width, height);
    const onReflow = () => syncPopoverPosition(width, height);
    window.addEventListener("scroll", onReflow, true);
    window.addEventListener("resize", onReflow);
    return () => {
      window.removeEventListener("scroll", onReflow, true);
      window.removeEventListener("resize", onReflow);
    };
  }, [confirmArchive, requestOpen]);

  useEffect(() => {
    if (!confirmArchive && !requestOpen) return;
    const close = (event: MouseEvent) => {
      if (anchorRef.current?.contains(event.target as Node)) return;
      const popover = document.getElementById(confirmId);
      if (popover?.contains(event.target as Node)) return;
      setConfirmArchive(false);
      setRequestOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setConfirmArchive(false);
        setRequestOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [confirmArchive, requestOpen, confirmId]);

  const applyStatus = (next: TaskStatus) => {
    if (next === current || isPending) return;
    const previous = current;
    setCurrent(next);
    startTransition(async () => {
      const response = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, status: next }),
      });
      if (!response.ok) {
        setCurrent(previous);
        return;
      }
      onUpdated?.();
      router.refresh();
    });
  };

  const handleOptionClick = (next: TaskStatus) => {
    if (next === current || isPending || !canClose) return;
    if (next === "completed") {
      setConfirmArchive(true);
      setRequestOpen(false);
      return;
    }
    setConfirmArchive(false);
    applyStatus(next);
  };

  const submitCloseRequest = () => {
    if (isPending) return;
    setRequestError("");
    startTransition(async () => {
      const result = await requestClose(taskId, requestNote);
      if (!result.ok) {
        setRequestError(result.error ?? "שליחת הבקשה נכשלה");
        return;
      }
      setRequestOpen(false);
      setRequestNote("");
      onUpdated?.();
    });
  };

  const confirmPopover =
    confirmArchive && mounted ? (
      <div
        id={confirmId}
        data-task-quick-overlay
        role="dialog"
        aria-label="אישור העברה לארכיון"
        style={{
          position: "fixed",
          top: pos.top,
          left: pos.left,
          width: CONFIRM_WIDTH,
          zIndex: 20000,
        }}
        className="rounded-2xl border border-border-weak bg-surface-1 p-3 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.35)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.5)]"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <p className="text-xs font-semibold leading-relaxed text-text-primary">
          {pendingRequest
            ? `לאשר את בקשת הסגירה של ${pendingRequest.requester_name}?`
            : "המשימה תועבר לארכיון"}
        </p>
        {pendingRequest?.note ? (
          <p className="mt-1.5 rounded-lg bg-surface-2/80 px-2 py-1.5 text-[0.6875rem] text-text-secondary">
            {pendingRequest.note}
          </p>
        ) : null}
        <div className="mt-2.5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmArchive(false)}
            className="rounded-lg px-2.5 py-1.5 text-[0.6875rem] font-bold text-text-secondary transition hover:bg-surface-2"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmArchive(false);
              if (pendingRequest) {
                startTransition(async () => {
                  const ok = await approveRequest(pendingRequest.id);
                  if (ok) {
                    setCurrent("completed");
                    onUpdated?.();
                    router.refresh();
                  }
                });
                return;
              }
              applyStatus("completed");
            }}
            className="rounded-lg bg-emerald-500 px-2.5 py-1.5 text-[0.6875rem] font-bold text-white shadow-[0_4px_12px_-4px_rgba(16,185,129,0.65)] transition hover:bg-emerald-600"
          >
            {pendingRequest ? "אשר סגירה" : "אישור"}
          </button>
        </div>
      </div>
    ) : null;

  const requestPopover =
    requestOpen && mounted ? (
      <div
        id={confirmId}
        data-task-quick-overlay
        role="dialog"
        aria-label="בקשה לסגירת משימה"
        style={{
          position: "fixed",
          top: pos.top,
          left: pos.left,
          width: REQUEST_WIDTH,
          zIndex: 20000,
        }}
        className="rounded-2xl border border-border-weak bg-surface-1 p-3 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.35)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.5)]"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-2">
          <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-700 dark:text-sky-300">
            <HandHelping size={14} />
          </span>
          <div>
            <p className="text-xs font-bold text-text-primary">בקשה ממנהל לסגור</p>
            <p className="mt-0.5 text-[0.6875rem] leading-relaxed text-text-secondary">
              רק מנהלים יכולים להעביר משימה לארכיון.
            </p>
          </div>
        </div>
        <textarea
          value={requestNote}
          onChange={(event) => setRequestNote(event.target.value)}
          rows={2}
          maxLength={500}
          placeholder="הערה למנהל (אופציונלי)"
          className="mt-2.5 w-full resize-none rounded-xl border border-border-weak bg-surface-2/60 px-2.5 py-2 text-[0.6875rem] text-text-primary outline-none transition focus:border-sky-400"
        />
        {requestError ? <p className="mt-1 text-[0.6875rem] font-semibold text-rose-600">{requestError}</p> : null}
        <div className="mt-2.5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setRequestOpen(false)}
            className="rounded-lg px-2.5 py-1.5 text-[0.6875rem] font-bold text-text-secondary transition hover:bg-surface-2"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={submitCloseRequest}
            disabled={isPending}
            className="inline-flex items-center gap-1 rounded-lg bg-sky-500 px-2.5 py-1.5 text-[0.6875rem] font-bold text-white shadow-[0_4px_12px_-4px_rgba(14,165,233,0.65)] transition hover:bg-sky-600 disabled:opacity-60"
          >
            <Send size={11} />
            שלח בקשה
          </button>
        </div>
      </div>
    ) : null;

  if (!ready) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border border-border-weak/80 bg-surface-1/90 font-bold text-text-secondary ${
          compact ? "px-2 py-1 text-[0.625rem]" : "px-2.5 py-1.5 text-[0.6875rem]"
        } ${className}`}
      >
        <Loader2 size={compact ? 11 : 12} className="animate-spin text-text-muted" />
        {current === "completed" ? "הושלמה" : "בתהליך"}
      </span>
    );
  }

  if (!canClose && current === "in_progress") {
    return (
      <>
        <div
          ref={anchorRef}
          className={`inline-flex items-center gap-1.5 ${className}`}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <span
            className={`inline-flex items-center rounded-full border border-amber-500/35 bg-amber-500/10 font-bold text-amber-800 dark:text-amber-100 ${
              compact ? "px-2 py-1 text-[0.625rem]" : "px-2.5 py-1.5 text-[0.6875rem]"
            }`}
          >
            בתהליך
          </span>
          {pendingRequest ? (
            <CloseRequestPendingBadge taskId={taskId} compact={compact} />
          ) : (
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setRequestOpen(true);
                setConfirmArchive(false);
                setRequestError("");
              }}
              className={`inline-flex items-center gap-1 rounded-full border border-sky-500/35 bg-sky-500/10 font-bold text-sky-800 transition hover:bg-sky-500/20 dark:text-sky-100 disabled:opacity-60 ${
                compact ? "px-2 py-1 text-[0.625rem]" : "px-2.5 py-1.5 text-[0.6875rem]"
              }`}
            >
              {isPending ? <Loader2 size={compact ? 11 : 12} className="animate-spin" /> : <HandHelping size={compact ? 11 : 12} />}
              בקש סגירה
            </button>
          )}
        </div>
        {requestPopover ? createPortal(requestPopover, document.body) : null}
      </>
    );
  }

  if (!canClose && current === "completed") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/10 font-bold text-emerald-800 dark:text-emerald-100 ${
          compact ? "px-2 py-1 text-[0.625rem]" : "px-2.5 py-1.5 text-[0.6875rem]"
        } ${className}`}
      >
        <Check size={compact ? 11 : 12} strokeWidth={2.8} />
        הושלמה
      </span>
    );
  }

  return (
    <>
      <div
        ref={anchorRef}
        className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <div
          role="group"
          aria-label="שינוי סטטוס משימה"
          className="inline-flex items-center rounded-full border border-border-weak/80 bg-surface-1/90 p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm"
        >
          {isPending ? (
            <span
              className={`inline-flex items-center justify-center text-text-muted ${
                compact ? "h-7 min-w-[4.5rem]" : "h-8 min-w-[5.5rem]"
              }`}
            >
              <Loader2 size={compact ? 13 : 14} className="animate-spin" />
            </span>
          ) : (
            options.map((option) => {
              const active = current === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={isPending || !ready}
                  onClick={() => handleOptionClick(option.value)}
                  aria-pressed={active}
                  title={option.label}
                  className={`inline-flex items-center gap-1 rounded-full font-bold transition-all duration-200 disabled:opacity-60 ${
                    compact ? "px-2 py-1 text-[0.625rem]" : "px-2.5 py-1.5 text-[0.6875rem]"
                  } ${active ? option.active : option.idle}`}
                >
                  {option.value === "completed" ? <Check size={compact ? 11 : 12} strokeWidth={2.8} /> : null}
                  <span>{compact ? option.shortLabel : option.label}</span>
                </button>
              );
            })
          )}
        </div>
        {pendingRequest && current === "in_progress" ? (
          <CloseRequestPendingBadge taskId={taskId} compact={compact} />
        ) : null}
      </div>
      {confirmPopover ? createPortal(confirmPopover, document.body) : null}
    </>
  );
}
