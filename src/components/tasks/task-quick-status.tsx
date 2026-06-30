"use client";

import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";

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

const CONFIRM_WIDTH = 208;
const CONFIRM_HEIGHT = 88;

export function TaskQuickStatus({
  taskId,
  status,
  size = "md",
  onUpdated,
  className = "",
}: TaskQuickStatusProps) {
  const router = useRouter();
  const anchorRef = useRef<HTMLDivElement>(null);
  const confirmId = useId();
  const [current, setCurrent] = useState(status);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setCurrent(status);
    setConfirmArchive(false);
  }, [status]);

  const syncConfirmPosition = () => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let left = rect.right - CONFIRM_WIDTH;
    if (left < 8) left = 8;
    if (left + CONFIRM_WIDTH > window.innerWidth - 8) {
      left = window.innerWidth - CONFIRM_WIDTH - 8;
    }
    let top = rect.bottom + 8;
    if (top + CONFIRM_HEIGHT > window.innerHeight - 8) {
      top = rect.top - CONFIRM_HEIGHT - 8;
    }
    setPos({ top, left });
  };

  useLayoutEffect(() => {
    if (!confirmArchive) return;
    syncConfirmPosition();
    const onReflow = () => syncConfirmPosition();
    window.addEventListener("scroll", onReflow, true);
    window.addEventListener("resize", onReflow);
    return () => {
      window.removeEventListener("scroll", onReflow, true);
      window.removeEventListener("resize", onReflow);
    };
  }, [confirmArchive]);

  useEffect(() => {
    if (!confirmArchive) return;
    const close = (event: MouseEvent) => {
      if (anchorRef.current?.contains(event.target as Node)) return;
      const popover = document.getElementById(confirmId);
      if (popover?.contains(event.target as Node)) return;
      setConfirmArchive(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConfirmArchive(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [confirmArchive, confirmId]);

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
    if (next === current || isPending) return;
    if (next === "completed") {
      setConfirmArchive(true);
      return;
    }
    setConfirmArchive(false);
    applyStatus(next);
  };

  const compact = size === "sm";

  const confirmPopover =
    confirmArchive && mounted ? (
      <div
        id={confirmId}
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
        <p className="text-xs font-semibold leading-relaxed text-text-primary">המשימה תועבר לארכיון</p>
        <div className="mt-2.5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmArchive(false)}
            className="rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-text-secondary transition hover:bg-surface-2"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmArchive(false);
              applyStatus("completed");
            }}
            className="rounded-lg bg-emerald-500 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-[0_4px_12px_-4px_rgba(16,185,129,0.65)] transition hover:bg-emerald-600"
          >
            אישור
          </button>
        </div>
      </div>
    ) : null;

  return (
    <>
      <div
        ref={anchorRef}
        className={`inline-block ${className}`}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <div
          role="group"
          aria-label="שינוי סטטוס משימה"
          className="inline-flex items-center rounded-full border border-border-weak/80 bg-surface-1/90 p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm"
        >
          {isPending ? (
            <span className={`inline-flex items-center justify-center text-text-muted ${compact ? "h-7 min-w-[4.5rem]" : "h-8 min-w-[5.5rem]"}`}>
              <Loader2 size={compact ? 13 : 14} className="animate-spin" />
            </span>
          ) : (
            options.map((option) => {
              const active = current === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleOptionClick(option.value)}
                  aria-pressed={active}
                  title={option.label}
                  className={`inline-flex items-center gap-1 rounded-full font-bold transition-all duration-200 disabled:opacity-60 ${
                    compact ? "px-2 py-1 text-[10px]" : "px-2.5 py-1.5 text-[11px]"
                  } ${active ? option.active : option.idle}`}
                >
                  {option.value === "completed" ? <Check size={compact ? 11 : 12} strokeWidth={2.8} /> : null}
                  <span>{compact ? option.shortLabel : option.label}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
      {confirmPopover ? createPortal(confirmPopover, document.body) : null}
    </>
  );
}
