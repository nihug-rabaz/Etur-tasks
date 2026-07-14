"use client";

import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import type { TaskPriority } from "@/types/models";

interface TaskQuickPriorityProps {
  taskId: string;
  priority: TaskPriority;
  onUpdated?: (priority: TaskPriority) => void;
  className?: string;
}

const options: Array<{
  value: TaskPriority;
  label: string;
  active: string;
  idle: string;
}> = [
  {
    value: "high",
    label: "גבוהה",
    active: "bg-rose-500/20 text-rose-900 dark:text-rose-50",
    idle: "text-rose-800/80 hover:bg-rose-500/12 dark:text-rose-100/85",
  },
  {
    value: "medium",
    label: "בינונית",
    active: "bg-amber-500/20 text-amber-950 dark:text-amber-50",
    idle: "text-amber-900/80 hover:bg-amber-500/12 dark:text-amber-100/85",
  },
  {
    value: "low",
    label: "נמוכה",
    active: "bg-emerald-500/20 text-emerald-900 dark:text-emerald-50",
    idle: "text-emerald-800/80 hover:bg-emerald-500/12 dark:text-emerald-100/85",
  },
];

const badgeClass: Record<TaskPriority, string> = {
  low: "border-emerald-500/40 bg-emerald-500/15 text-emerald-900 dark:border-emerald-400/45 dark:bg-emerald-500/25 dark:text-emerald-100",
  medium:
    "border-amber-500/40 bg-amber-500/15 text-amber-950 dark:border-amber-400/45 dark:bg-amber-500/25 dark:text-amber-50",
  high: "border-rose-500/45 bg-rose-500/15 text-rose-950 dark:border-rose-400/50 dark:bg-rose-500/25 dark:text-rose-50",
};

const MENU_WIDTH = 148;
const MENU_HEIGHT = 148;

export function TaskQuickPriority({ taskId, priority, onUpdated, className = "" }: TaskQuickPriorityProps) {
  const router = useRouter();
  const anchorRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const [current, setCurrent] = useState(priority);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setCurrent(priority);
  }, [priority]);

  const syncPosition = () => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let left = rect.left;
    if (left + MENU_WIDTH > window.innerWidth - 8) {
      left = window.innerWidth - MENU_WIDTH - 8;
    }
    if (left < 8) left = 8;
    let top = rect.bottom + 6;
    if (top + MENU_HEIGHT > window.innerHeight - 8) {
      top = rect.top - MENU_HEIGHT - 6;
    }
    setPos({ top, left });
  };

  useLayoutEffect(() => {
    if (!open) return;
    syncPosition();
    const onReflow = () => syncPosition();
    window.addEventListener("scroll", onReflow, true);
    window.addEventListener("resize", onReflow);
    return () => {
      window.removeEventListener("scroll", onReflow, true);
      window.removeEventListener("resize", onReflow);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (anchorRef.current?.contains(event.target as Node)) return;
      const menu = document.getElementById(menuId);
      if (menu?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, menuId]);

  const applyPriority = (next: TaskPriority) => {
    if (next === current || isPending) return;
    const previous = current;
    setCurrent(next);
    setOpen(false);
    startTransition(async () => {
      const response = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, priority: next }),
      });
      if (!response.ok) {
        setCurrent(previous);
        return;
      }
      onUpdated?.(next);
      router.refresh();
    });
  };

  const menu =
    open && mounted ? (
      <div
        id={menuId}
        data-task-quick-overlay
        role="listbox"
        aria-label="בחירת עדיפות"
        style={{
          position: "fixed",
          top: pos.top,
          left: pos.left,
          width: MENU_WIDTH,
          zIndex: 20000,
        }}
        className="rounded-2xl border border-border-weak bg-surface-1 p-1.5 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.35)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.5)]"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted">
          עדיפות
        </p>
        {options.map((option) => {
          const active = current === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={active}
              disabled={isPending}
              onClick={() => applyPriority(option.value)}
              className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-bold transition disabled:opacity-60 ${
                active ? option.active : option.idle
              }`}
            >
              <span>עדיפות {option.label}</span>
              {active ? <Check size={13} strokeWidth={2.8} /> : null}
            </button>
          );
        })}
      </div>
    ) : null;

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        disabled={isPending}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="שינוי עדיפות"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        onMouseDown={(event) => event.stopPropagation()}
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold transition hover:brightness-95 disabled:opacity-60 ${badgeClass[current]} ${className}`}
      >
        {isPending ? <Loader2 size={11} className="animate-spin" /> : null}
        <span>עדיפות {options.find((item) => item.value === current)?.label ?? priorityLabelFallback(current)}</span>
      </button>
      {menu ? createPortal(menu, document.body) : null}
    </>
  );
}

function priorityLabelFallback(priority: TaskPriority): string {
  if (priority === "high") return "גבוהה";
  if (priority === "low") return "נמוכה";
  return "בינונית";
}
