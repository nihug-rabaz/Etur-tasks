"use client";

interface CalendarScheduleChipProps {
  title: string;
  onClick: () => void;
}

export function CalendarScheduleChip({ title, onClick }: CalendarScheduleChipProps) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="group flex w-full items-center gap-1.5 rounded-lg border border-violet-400/50 bg-violet-500/15 px-2 py-1 text-start text-[11px] font-semibold text-violet-900 transition hover:scale-[1.02] hover:bg-violet-500/25 dark:text-violet-100"
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.65)]" aria-hidden />
      <span className="min-w-0 truncate">{title}</span>
    </button>
  );
}
