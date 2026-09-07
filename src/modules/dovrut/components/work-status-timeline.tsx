"use client";

import { Check, Clock } from "lucide-react";
import { WORK_STATUS_LABELS, WORK_STATUS_ORDER } from "@/modules/dovrut/lib/approval-flows";
import type { DovrutWorkStatus } from "@/modules/dovrut/types";

type TimelineSize = "default" | "compact";

export function WorkStatusTimeline({
  currentStatus,
  onStatusChange,
  disabled = false,
  size = "default",
  readOnly = false,
}: {
  currentStatus: DovrutWorkStatus | null | undefined;
  onStatusChange?: (status: DovrutWorkStatus) => void;
  disabled?: boolean;
  size?: TimelineSize;
  readOnly?: boolean;
}) {
  const statuses = WORK_STATUS_ORDER;
  const active = currentStatus && statuses.includes(currentStatus) ? currentStatus : "planning";
  const currentIndex = Math.max(0, statuses.indexOf(active));
  const progress = statuses.length <= 1 ? 100 : (currentIndex / (statuses.length - 1)) * 100;

  const circleSize =
    size === "compact" ? "h-7 w-7 sm:h-8 sm:w-8" : "h-10 w-10 sm:h-11 sm:w-11";
  const iconSize = size === "compact" ? 14 : 18;
  const labelClass =
    size === "compact"
      ? "max-w-[4.5rem] text-[10px] leading-tight sm:max-w-[5.5rem] sm:text-[11px]"
      : "max-w-[5.5rem] text-[11px] leading-snug sm:max-w-[6.5rem] sm:text-xs";
  const trackTop = size === "compact" ? "top-[0.875rem] sm:top-4" : "top-5 sm:top-[1.375rem]";
  const trackHeight = size === "compact" ? "h-0.5" : "h-1";
  const interactive = Boolean(onStatusChange) && !readOnly && !disabled;

  return (
    <div className={`w-full ${size === "compact" ? "px-0.5 py-1" : "px-2 py-2 sm:px-4 sm:py-3"}`}>
      <div className="relative">
        <div
          className={`pointer-events-none absolute inset-x-[1.25rem] ${trackTop} ${trackHeight} rounded-full bg-surface-2`}
          aria-hidden
        />
        <div
          className={`pointer-events-none absolute ${trackTop} ${trackHeight} rounded-full bg-gradient-to-l from-accent-primary to-accent-cyan transition-all duration-300`}
          style={{
            right: "1.25rem",
            width: `calc((100% - 2.5rem) * ${progress / 100})`,
          }}
          aria-hidden
        />

        <ol className="relative z-[1] flex justify-between gap-1">
          {statuses.map((status, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isFuture = index > currentIndex;

            const circleClass = `inline-flex ${circleSize} items-center justify-center rounded-full border-2 shadow-sm transition ${
              isCompleted
                ? "border-emerald-500/80 bg-emerald-500 text-white"
                : isCurrent
                  ? "border-accent-primary bg-accent-primary text-white ring-4 ring-accent-primary/20"
                  : "border-black/10 bg-surface-1 text-text-muted dark:border-white/15"
            }`;

            const labelTone = isCompleted
              ? "text-emerald-700 dark:text-emerald-300"
              : isCurrent
                ? "text-accent-primary"
                : "text-text-muted";

            const content = (
              <>
                <span className={circleClass}>
                  {isCompleted ? <Check size={iconSize} strokeWidth={2.6} /> : null}
                  {isCurrent ? <Clock size={iconSize} strokeWidth={2.4} /> : null}
                  {isFuture ? (
                    <span className="h-2 w-2 rounded-full bg-text-muted/40" aria-hidden />
                  ) : null}
                </span>
                <span className={`${labelClass} text-center font-bold ${labelTone}`}>
                  {WORK_STATUS_LABELS[status]}
                </span>
              </>
            );

            return (
              <li key={status} className="flex min-w-0 flex-1 flex-col items-center">
                {interactive ? (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onStatusChange?.(status)}
                    aria-current={isCurrent ? "step" : undefined}
                    aria-label={`סטטוס עבודה: ${WORK_STATUS_LABELS[status]}`}
                    className="group flex flex-col items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="flex flex-col items-center gap-2 transition group-hover:scale-[1.04]">
                      {content}
                    </span>
                  </button>
                ) : (
                  <div
                    className="flex flex-col items-center gap-2"
                    aria-current={isCurrent ? "step" : undefined}
                  >
                    {content}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

export function resolveConceptWorkStatus(concept: {
  type: string;
  work_status_article?: DovrutWorkStatus | null;
  work_status_social?: DovrutWorkStatus | null;
}): DovrutWorkStatus {
  if (concept.type === "article_interview") {
    return concept.work_status_article ?? "planning";
  }
  return concept.work_status_social ?? "planning";
}
