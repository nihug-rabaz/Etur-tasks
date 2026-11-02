"use client";

import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CreateTaskDrawer } from "@/components/create-task-drawer";
import { CreateCampaignDrawer } from "@/modules/dovrut/components/create-campaign-drawer";
import { CreateItemDrawer } from "@/modules/dovrut/components/create-item-drawer";
import { CreateProjectDrawer } from "@/modules/dovrut/components/create-project-drawer";

type StackAction = "campaign" | "project" | "item" | "task";

const ACTIONS: Array<{
  id: StackAction;
  label: string;
  className: string;
}> = [
  {
    id: "campaign",
    label: "קמפיין",
    className:
      "bg-accent-primary shadow-[0_10px_28px_-6px_rgba(139,92,246,0.55)] hover:shadow-[0_14px_32px_-6px_rgba(139,92,246,0.65)]",
  },
  {
    id: "project",
    label: "פרויקט",
    className:
      "bg-accent-cyan shadow-[0_10px_28px_-6px_rgba(34,184,207,0.55)] hover:shadow-[0_14px_32px_-6px_rgba(34,184,207,0.65)]",
  },
  {
    id: "item",
    label: "אייטם",
    className:
      "bg-gradient-to-l from-accent-primary to-accent-cyan shadow-[0_10px_28px_-6px_rgba(139,92,246,0.45)] hover:shadow-[0_14px_32px_-6px_rgba(139,92,246,0.55)]",
  },
  {
    id: "task",
    label: "משימה",
    className:
      "bg-accent-orange shadow-[0_10px_28px_-6px_rgba(251,146,60,0.55)] hover:shadow-[0_14px_32px_-6px_rgba(251,146,60,0.7)]",
  },
];

/** Vertical stack: actions expand upward, labels open left of the right-side hub. */
const STEP_Y = 58;
const OFFSET_X = 8;

export function DovrutCreateFabStack({
  showEntityCreates = true,
}: {
  showEntityCreates?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState<StackAction | null>(null);
  const [drawer, setDrawer] = useState<StackAction | null>(null);
  const [compact, setCompact] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clusterRef = useRef<HTMLDivElement | null>(null);
  const stepY = compact ? 50 : STEP_Y;

  const openFan = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setExpanded(true);
  };

  const collapseFan = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setPinned(false);
    setExpanded(false);
    setHovered(null);
  };

  const scheduleCloseFan = () => {
    if (pinned || drawer) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      if (!pinned && !drawer) {
        setExpanded(false);
        setHovered(null);
      }
    }, 180);
  };

  useEffect(() => {
    const media = window.matchMedia("(max-width: 640px)");
    const sync = () => setCompact(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!pinned) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && clusterRef.current?.contains(target)) return;
      collapseFan();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [pinned]);

  if (!showEntityCreates) {
    return <CreateTaskDrawer floating floatingSide="end" variant="dovrut" triggerLabel="משימה חדשה" />;
  }

  const stackHeight = stepY * ACTIONS.length + 72;

  return (
    <>
      <div
        ref={clusterRef}
        className="pointer-events-none fixed bottom-[max(5.25rem,calc(env(safe-area-inset-bottom)+3.75rem))] right-3 z-[60] sm:bottom-24 sm:right-5"
        style={{ height: stackHeight, width: compact ? 168 : 200 }}
      >
        <div className="absolute bottom-0 right-0 flex flex-col items-end">
          {ACTIONS.map((action, index) => {
            const fromBottom = (ACTIONS.length - index) * stepY;
            const active = hovered === action.id;
            return (
              <button
                key={action.id}
                type="button"
                dir="rtl"
                aria-label={action.label}
                onMouseEnter={() => {
                  openFan();
                  setHovered(action.id);
                }}
                onMouseLeave={() => {
                  setHovered(null);
                  scheduleCloseFan();
                }}
                onClick={() => {
                  setDrawer(action.id);
                  collapseFan();
                }}
                style={{
                  bottom: fromBottom,
                  right: OFFSET_X,
                  transform: expanded
                    ? `translateY(0) scale(${active ? 1.06 : 1})`
                    : "translateY(12px) scale(0.4)",
                  opacity: expanded ? 1 : 0,
                  pointerEvents: expanded ? "auto" : "none",
                  transitionDelay: expanded ? `${index * 35}ms` : "0ms",
                  zIndex: active ? 30 : 10 + index,
                }}
                className={`pointer-events-auto absolute inline-flex w-fit origin-bottom-right items-center gap-2 whitespace-nowrap rounded-2xl px-4 py-2.5 text-sm font-extrabold text-white transition-[transform,opacity,filter,box-shadow] duration-300 ease-out hover:brightness-110 ${action.className}`}
              >
                <span className="drop-shadow-sm">{action.label}</span>
                <Plus size={16} strokeWidth={2.6} className="shrink-0 opacity-95" />
              </button>
            );
          })}
          <button
            type="button"
            aria-label="פתיחת יצירה"
            aria-expanded={expanded}
            onClick={() => {
              if (closeTimer.current) clearTimeout(closeTimer.current);
              setPinned(true);
              setExpanded(true);
            }}
            onMouseEnter={openFan}
            onMouseLeave={scheduleCloseFan}
            className="pointer-events-auto relative z-40 flex h-12 w-12 items-center justify-center rounded-full bg-accent-orange text-white shadow-[0_12px_30px_-8px_rgba(251,146,60,0.7)] transition duration-300 hover:scale-110 hover:brightness-105 sm:h-14 sm:w-14"
          >
            <Plus
              size={26}
              strokeWidth={2.4}
              className={`transition-transform duration-300 ${expanded ? "rotate-45" : ""}`}
            />
          </button>
        </div>
      </div>
      <CreateCampaignDrawer
        hideTrigger
        open={drawer === "campaign"}
        onOpenChange={(next) => setDrawer(next ? "campaign" : null)}
      />
      <CreateProjectDrawer
        hideTrigger
        open={drawer === "project"}
        onOpenChange={(next) => setDrawer(next ? "project" : null)}
      />
      <CreateItemDrawer
        hideTrigger
        open={drawer === "item"}
        onOpenChange={(next) => setDrawer(next ? "item" : null)}
      />
      <CreateTaskDrawer
        hideTrigger
        variant="dovrut"
        triggerLabel="משימה חדשה"
        open={drawer === "task"}
        onOpenChange={(next) => setDrawer(next ? "task" : null)}
      />
    </>
  );
}
