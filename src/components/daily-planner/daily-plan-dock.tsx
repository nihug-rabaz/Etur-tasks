"use client";

import { ListTodo } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { DailyPlanSidebar } from "@/components/daily-planner/daily-plan-sidebar";
import { Drawer } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-is-mobile";

interface DailyPlanDockProps {
  accentHex?: string;
  allowDrop?: boolean;
  emptyHint?: string;
  className?: string;
  triggerClassName?: string;
  fillHeight?: boolean;
}

const WIDTH_STORAGE_KEY = "daily-plan-sidebar-width";
const DEFAULT_WIDTH = 216;
const MIN_WIDTH = 168;
const MAX_WIDTH = 420;

function clampWidth(width: number) {
  if (typeof window === "undefined") {
    return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));
  }
  const viewportCap = Math.min(MAX_WIDTH, Math.round(window.innerWidth * 0.42));
  return Math.min(viewportCap, Math.max(MIN_WIDTH, Math.round(width)));
}

function readStoredWidth(): number {
  if (typeof window === "undefined") return DEFAULT_WIDTH;
  try {
    const raw = window.localStorage.getItem(WIDTH_STORAGE_KEY);
    if (!raw) return DEFAULT_WIDTH;
    const parsed = Number.parseFloat(raw);
    if (!Number.isFinite(parsed)) return DEFAULT_WIDTH;
    return clampWidth(parsed);
  } catch {
    return DEFAULT_WIDTH;
  }
}

function persistWidth(width: number) {
  try {
    window.localStorage.setItem(WIDTH_STORAGE_KEY, String(width));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

function isDocumentRtl() {
  return getComputedStyle(document.documentElement).direction === "rtl";
}

export function DailyPlanDesktopColumn({
  accentHex = "#8b5cf6",
  allowDrop = true,
  emptyHint,
  className = "",
  fillHeight = false,
}: DailyPlanDockProps) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const widthRef = useRef(width);
  const gestureRef = useRef<{
    pointerId: number;
    startX: number;
    startWidth: number;
  } | null>(null);

  useEffect(() => {
    setWidth(readStoredWidth());
  }, []);

  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  useEffect(() => {
    if (!isResizing) return;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [isResizing]);

  const beginResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: widthRef.current,
    };
    setIsResizing(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const updateResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    event.preventDefault();
    const deltaX = event.clientX - gesture.startX;
    // Handle sits on the content-facing (inline-start) edge: in RTL that is the
    // right edge of the left column, so dragging right widens; in LTR the reverse.
    const signedDelta = isDocumentRtl() ? deltaX : -deltaX;
    setWidth(clampWidth(gesture.startWidth + signedDelta));
  }, []);

  const finishResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gestureRef.current = null;
    setIsResizing(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    persistWidth(widthRef.current);
  }, []);

  const cancelResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gestureRef.current = null;
    setIsResizing(false);
    setWidth(clampWidth(gesture.startWidth));
  }, []);

  const resetWidth = useCallback(() => {
    setWidth(DEFAULT_WIDTH);
    persistWidth(DEFAULT_WIDTH);
  }, []);

  const onHandleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 24 : 12;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      // Move the content-facing edge: in RTL right widens; in LTR left widens.
      const towardWider =
        (isDocumentRtl() && event.key === "ArrowRight") ||
        (!isDocumentRtl() && event.key === "ArrowLeft");
      setWidth((current) => {
        const next = clampWidth(current + (towardWider ? step : -step));
        persistWidth(next);
        return next;
      });
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      resetWidth();
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      const next = clampWidth(MAX_WIDTH);
      setWidth(next);
      persistWidth(next);
    }
  }, [resetWidth]);

  const asideStyle = {
    "--daily-plan-column-width": `${width}px`,
    "--daily-plan-resize-accent": accentHex,
    width: "var(--daily-plan-column-width)",
  } as CSSProperties;

  return (
    <aside
      className={`daily-plan-desktop-column relative hidden shrink-0 flex-col self-stretch md:flex ${
        isResizing ? "daily-plan-desktop-column--resizing" : ""
      } ${className}`}
      style={asideStyle}
      aria-label="לו״ז יומי"
    >
      <div
        role="separator"
        tabIndex={0}
        className="daily-plan-resize-handle"
        aria-label="שנה רוחב רשימת המשימות"
        aria-valuemin={MIN_WIDTH}
        aria-valuemax={MAX_WIDTH}
        aria-valuenow={width}
        aria-orientation="vertical"
        title="גררו לשינוי רוחב · לחיצה כפולה לאיפוס"
        onPointerDown={beginResize}
        onPointerMove={updateResize}
        onPointerUp={finishResize}
        onPointerCancel={cancelResize}
        onDoubleClick={resetWidth}
        onKeyDown={onHandleKeyDown}
      >
        <span className="daily-plan-resize-handle__rail" aria-hidden />
        <span className="daily-plan-resize-handle__grip" aria-hidden />
      </div>

      <div
        className={
          fillHeight
            ? "flex min-h-0 flex-1 flex-col"
            : "sticky top-3 flex max-h-[calc(100dvh-5.5rem)] min-h-[22rem] flex-1 flex-col"
        }
      >
        <DailyPlanSidebar
          accentHex={accentHex}
          allowDrop={allowDrop}
          emptyHint={emptyHint}
        />
      </div>
    </aside>
  );
}

export function DailyPlanMobileAccess({
  accentHex = "#8b5cf6",
  emptyHint = "סמנו ✓ ליד משימה כדי לשייך ללו״ז",
  triggerClassName = "",
}: DailyPlanDockProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border-weak bg-surface-1 px-3 py-2 text-xs font-bold text-text-primary shadow-sm transition hover:bg-surface-2 md:hidden ${triggerClassName}`}
        onClick={() => setOpen(true)}
        aria-label="פתח To-Do List"
      >
        <ListTodo size={15} />
        <span>To-Do List</span>
      </button>
      {isMobile ? (
        <Drawer
          open={open}
          onClose={() => setOpen(false)}
          title="To-Do List"
          subtitle="הלו״ז היומי שלך"
        >
          <div className="flex h-[min(78dvh,42rem)] min-h-[24rem] flex-col">
            <DailyPlanSidebar
              accentHex={accentHex}
              allowDrop={false}
              emptyHint={emptyHint}
            />
          </div>
        </Drawer>
      ) : null}
    </>
  );
}
