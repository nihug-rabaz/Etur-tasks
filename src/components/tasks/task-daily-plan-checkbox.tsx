"use client";

import { Check, Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import {
  DAILY_PLAN_CHANGED_EVENT,
  DailyPlannerClient,
} from "@/lib/daily-planner/daily-planner-client";

interface TaskDailyPlanCheckboxProps {
  taskId: string;
  className?: string;
}

export function TaskDailyPlanCheckbox({ taskId, className = "" }: TaskDailyPlanCheckboxProps) {
  const [planDate] = useState(() => DailyPlannerClient.dateKey(new Date()));
  const [checked, setChecked] = useState(false);
  const [ready, setReady] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      void DailyPlannerClient.getPlacement(planDate, taskId).then((placement) => {
        if (cancelled) return;
        setChecked(placement === "mine");
        setReady(true);
      });
    };

    refresh();

    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ planDate?: string; taskId?: string }>).detail;
      if (detail?.planDate && detail.planDate !== planDate) return;
      if (detail?.taskId && detail.taskId !== taskId) return;
      refresh();
    };

    window.addEventListener(DAILY_PLAN_CHANGED_EVENT, onChanged);
    return () => {
      cancelled = true;
      window.removeEventListener(DAILY_PLAN_CHANGED_EVENT, onChanged);
    };
  }, [planDate, taskId]);

  const toggle = () => {
    if (!ready || isPending) return;
    const next = !checked;
    setChecked(next);
    startTransition(async () => {
      try {
        if (next) {
          await DailyPlannerClient.addToDayList(planDate, taskId);
        } else {
          await DailyPlannerClient.removeFromDayList(planDate, taskId);
        }
      } catch {
        setChecked(!next);
      }
    });
  };

  return (
    <button
      type="button"
      data-no-row-click
      role="checkbox"
      aria-checked={checked}
      aria-label={checked ? "הסר מהלו״ז היומי" : "שייך ללו״ז היומי"}
      title={checked ? "הסר מהלו״ז היומי" : "שייך ללו״ז היומי"}
      disabled={!ready || isPending}
      onClick={(event) => {
        event.stopPropagation();
        toggle();
      }}
      className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition disabled:opacity-50 ${
        checked
          ? "border-emerald-500/50 bg-emerald-500 text-white"
          : "border-border-weak bg-surface-1/90 text-transparent hover:border-emerald-500/40 hover:bg-emerald-500/10"
      } ${className}`}
    >
      {isPending || !ready ? (
        <Loader2 size={14} className="animate-spin text-text-muted" />
      ) : (
        <Check size={14} strokeWidth={3} className={checked ? "opacity-100" : "opacity-0"} />
      )}
    </button>
  );
}
