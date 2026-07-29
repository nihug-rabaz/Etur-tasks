"use client";

import { CalendarClock } from "lucide-react";
import { useState } from "react";
import { DailyPlannerPanel } from "@/components/daily-planner/daily-planner-panel";

export function DailyPlannerLauncher() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="לו״ז יומי"
        title="לו״ז יומי"
        className="daily-planner-launcher focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50"
      >
        <span className="daily-planner-launcher__inner">
          <CalendarClock size={20} strokeWidth={2.2} />
        </span>
        <span className="hidden text-xs font-bold text-text-secondary lg:inline">לו״ז</span>
      </button>
      <DailyPlannerPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
