"use client";

import { useEffect, useState } from "react";
import {
  DAILY_PLAN_CHANGED_EVENT,
  DailyPlannerClient,
} from "@/lib/daily-planner/daily-planner-client";
import type { DomainKey } from "@/lib/ui/domains";

const DEFAULT_TONE =
  "border-emerald-500/35 bg-emerald-500/15 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-500/20 dark:text-emerald-50";

const assignedBadgeTone: Record<DomainKey, string> = {
  recruitment: DEFAULT_TONE,
  positioning: DEFAULT_TONE,
  general: DEFAULT_TONE,
};

interface TaskPlanAssignedBadgeProps {
  taskId: string;
  domainSlug?: DomainKey;
  className?: string;
}

export function TaskPlanAssignedBadge({
  taskId,
  domainSlug,
  className = "",
}: TaskPlanAssignedBadgeProps) {
  const [planDate] = useState(() => DailyPlannerClient.dateKey(new Date()));
  const [assigned, setAssigned] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      void DailyPlannerClient.getPlacement(planDate, taskId).then((placement) => {
        if (!cancelled) {
          setAssigned(placement === "mine" || placement === "other");
        }
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

  if (!assigned) return null;

  const tone = domainSlug ? assignedBadgeTone[domainSlug] : DEFAULT_TONE;

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[0.625rem] font-bold leading-tight ${tone} ${className}`}
      title="מישהו עובד על זה בלו״ז היומי"
    >
      מישהו עובד על זה ; )
    </span>
  );
}
