"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import {
  DAILY_PLAN_CHANGED_EVENT,
  DailyPlannerClient,
  type TaskPlanPlacement,
} from "@/lib/daily-planner/daily-planner-client";

interface TaskTzadikSwitchProps {
  taskId: string;
  size?: "sm" | "md";
  className?: string;
  onUpdated?: () => void;
}

const options: Array<{
  value: TaskPlanPlacement;
  label: string;
  shortLabel: string;
  active: string;
  idle: string;
}> = [
  {
    value: "bank",
    label: "צדיק תעשה מצווה",
    shortLabel: "תעשה מצווה",
    active: "bg-sky-500 text-white shadow-[0_4px_14px_-4px_rgba(14,165,233,0.75)]",
    idle: "text-sky-800/80 hover:bg-sky-500/15 dark:text-sky-100/80",
  },
  {
    value: "mine",
    label: "יצאת פראייר",
    shortLabel: "פראייר",
    active: "bg-violet-500 text-white shadow-[0_4px_14px_-4px_rgba(139,92,246,0.75)]",
    idle: "text-violet-800/80 hover:bg-violet-500/15 dark:text-violet-100/80",
  },
  {
    value: "other",
    label: "ניצלת צדיק",
    shortLabel: "ניצלת",
    active: "bg-teal-500 text-white shadow-[0_4px_14px_-4px_rgba(20,184,166,0.75)]",
    idle: "text-teal-800/80 hover:bg-teal-500/15 dark:text-teal-100/80",
  },
];

export function TaskTzadikSwitch({
  taskId,
  size = "md",
  className = "",
  onUpdated,
}: TaskTzadikSwitchProps) {
  const planDate = DailyPlannerClient.dateKey(new Date());
  const [current, setCurrent] = useState<TaskPlanPlacement | null>(null);
  const [isPending, startTransition] = useTransition();
  const compact = size === "sm";

  useEffect(() => {
    let cancelled = false;
    void DailyPlannerClient.getPlacement(planDate, taskId).then((placement) => {
      if (!cancelled) setCurrent(placement);
    });
    return () => {
      cancelled = true;
    };
  }, [planDate, taskId]);

  useEffect(() => {
    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ planDate?: string; taskId?: string }>).detail;
      if (detail?.planDate && detail.planDate !== planDate) return;
      if (detail?.taskId && detail.taskId !== taskId) {
        return;
      }
      DailyPlannerClient.invalidatePlacements(planDate, taskId);
      void DailyPlannerClient.getPlacement(planDate, taskId).then(setCurrent);
    };
    window.addEventListener(DAILY_PLAN_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(DAILY_PLAN_CHANGED_EVENT, onChanged);
  }, [planDate, taskId]);

  const applyPlacement = (next: TaskPlanPlacement) => {
    if (!current || next === current || isPending) return;
    if (next === "other") return;
    if (next === "bank" && current === "other") return;

    const previous = current;
    setCurrent(next);
    startTransition(async () => {
      try {
        if (next === "mine") {
          await DailyPlannerClient.addToDayList(planDate, taskId);
          setCurrent("mine");
        } else {
          await DailyPlannerClient.removeFromDayList(planDate, taskId);
          DailyPlannerClient.invalidatePlacements(planDate, taskId);
          const refreshed = await DailyPlannerClient.getPlacement(planDate, taskId);
          setCurrent(refreshed);
        }
        onUpdated?.();
      } catch {
        setCurrent(previous);
      }
    });
  };

  if (current === null) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border border-border-weak/80 bg-surface-1/90 font-bold text-text-secondary ${
          compact ? "px-2 py-1 text-[0.625rem]" : "px-2.5 py-1.5 text-[0.6875rem]"
        } ${className}`}
      >
        <Loader2 size={compact ? 11 : 12} className="animate-spin text-text-muted" />
        צדיק…
      </span>
    );
  }

  return (
    <div
      role="group"
      aria-label="מיקום משימה בלו״ז"
      className={`inline-flex max-w-full flex-wrap items-center rounded-full border border-border-weak/80 bg-surface-1/90 p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm ${className}`}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {isPending ? (
        <span
          className={`inline-flex items-center justify-center text-text-muted ${
            compact ? "h-7 min-w-[6rem]" : "h-8 min-w-[8rem]"
          }`}
        >
          <Loader2 size={compact ? 13 : 14} className="animate-spin" />
        </span>
      ) : (
        options.map((option) => {
          const active = current === option.value;
          const disabled =
            (option.value === "other" && current !== "other") ||
            (option.value === "bank" && current === "other");
          return (
            <button
              key={option.value}
              type="button"
              disabled={isPending || disabled}
              onClick={() => applyPlacement(option.value)}
              aria-pressed={active}
              title={option.label}
              className={`inline-flex items-center rounded-full font-bold transition-all duration-200 disabled:cursor-default disabled:opacity-45 ${
                compact ? "px-1.5 py-1 text-[0.5625rem] leading-tight" : "px-2 py-1.5 text-[0.6875rem]"
              } ${active ? option.active : option.idle}`}
            >
              <span>{compact ? option.shortLabel : option.label}</span>
            </button>
          );
        })
      )}
    </div>
  );
}
