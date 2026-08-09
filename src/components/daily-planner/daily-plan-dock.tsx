"use client";

import { ListTodo } from "lucide-react";
import { useState } from "react";
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

export function DailyPlanDesktopColumn({
  accentHex = "#8b5cf6",
  allowDrop = true,
  emptyHint,
  className = "",
  fillHeight = false,
}: DailyPlanDockProps) {
  return (
    <aside
      className={`hidden w-[13.5rem] shrink-0 flex-col self-stretch xl:w-[15rem] md:flex ${className}`}
      aria-label="לו״ז יומי"
    >
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
