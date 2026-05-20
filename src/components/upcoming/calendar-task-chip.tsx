"use client";

import { domainKeyFromName, domainMeta, DomainKey } from "@/lib/ui/domains";
import { TaskWithRelations } from "@/types/models";

const priorityDot: Record<string, string> = {
  low: "bg-emerald-400",
  medium: "bg-amber-400",
  high: "bg-rose-500",
};

interface CalendarTaskChipProps {
  task: TaskWithRelations;
  onClick: () => void;
}

export function CalendarTaskChip({ task, onClick }: CalendarTaskChipProps) {
  const domainKey = domainKeyFromName(task.domain_name) ?? "general";
  const style = domainMeta[domainKey as DomainKey].calendarChip;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`group flex w-full items-center gap-1.5 rounded-lg border px-2 py-1 text-start text-[11px] font-semibold transition hover:scale-[1.02] hover:brightness-110 ${style}`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${priorityDot[task.priority] ?? priorityDot.medium}`}
        aria-hidden
      />
      <span className="min-w-0 truncate">{task.title}</span>
    </button>
  );
}
