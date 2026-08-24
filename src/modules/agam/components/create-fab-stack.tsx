"use client";

import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  CreateCandidateDrawer,
  CreateDocumentDrawer,
  CreateEvaluationDrawer,
  CreateInterviewDrawer,
} from "@/modules/agam/components/create-drawers";

type AgamCreateAction = "candidate" | "interview" | "evaluation" | "document";

const RADIUS = 120;
const START_DEG = 100;
const END_DEG = 200;
const HUB = 56;

const ACTIONS: Array<{ id: AgamCreateAction; label: string; className: string }> = [
  {
    id: "candidate",
    label: "מועמד",
    className: "bg-sky-600 shadow-[0_12px_30px_-8px_rgba(2,132,199,0.55)]",
  },
  {
    id: "interview",
    label: "ראיון",
    className: "bg-indigo-600 shadow-[0_12px_30px_-8px_rgba(79,70,229,0.55)]",
  },
  {
    id: "evaluation",
    label: "הערכה",
    className: "bg-violet-600 shadow-[0_12px_30px_-8px_rgba(124,58,237,0.55)]",
  },
  {
    id: "document",
    label: "מסמך",
    className: "bg-emerald-600 shadow-[0_12px_30px_-8px_rgba(5,150,105,0.55)]",
  },
];

function arcPoint(index: number, total: number): { x: number; y: number; tilt: number } {
  const t = total === 1 ? 0.5 : index / (total - 1);
  const deg = START_DEG + t * (END_DEG - START_DEG);
  const rad = (deg * Math.PI) / 180;
  return {
    x: Math.cos(rad) * RADIUS,
    y: -Math.sin(rad) * RADIUS,
    tilt: 180 - deg,
  };
}

export function AgamCreateFabStack() {
  const [expanded, setExpanded] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState<AgamCreateAction | null>(null);
  const [drawer, setDrawer] = useState<AgamCreateAction | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clusterRef = useRef<HTMLDivElement | null>(null);

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

  return (
    <>
      <div
        ref={clusterRef}
        className="pointer-events-none fixed bottom-24 right-5 z-[60] h-[280px] w-[280px]"
      >
        <div className="absolute" style={{ right: HUB / 2, bottom: HUB / 2, width: 0, height: 0 }}>
          {ACTIONS.map((action, index) => {
            const point = arcPoint(index, ACTIONS.length);
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
                  transform: expanded
                    ? `translate(-50%, -50%) translate(${point.x}px, ${point.y}px) rotate(${point.tilt}deg) scale(${active ? 1.1 : 1})`
                    : "translate(-50%, -50%) scale(0.35)",
                  opacity: expanded ? 1 : 0,
                  pointerEvents: expanded ? "auto" : "none",
                  zIndex: active ? 30 : 10 + index,
                }}
                className={`absolute left-0 top-0 inline-flex w-fit origin-center items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-bold text-white transition-[transform,opacity,filter,box-shadow] duration-300 ease-out hover:brightness-110 ${action.className}`}
              >
                {action.label}
                <Plus size={15} />
              </button>
            );
          })}
        </div>
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
          className="pointer-events-auto absolute bottom-0 right-0 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent-orange text-white shadow-[0_12px_30px_-8px_rgba(251,146,60,0.7)] transition duration-300 hover:scale-110 hover:brightness-105"
        >
          <Plus size={26} strokeWidth={2.4} />
        </button>
      </div>
      <CreateCandidateDrawer
        hideTrigger
        open={drawer === "candidate"}
        onOpenChange={(next) => setDrawer(next ? "candidate" : null)}
      />
      <CreateInterviewDrawer open={drawer === "interview"} onOpenChange={(next) => setDrawer(next ? "interview" : null)} />
      <CreateEvaluationDrawer
        open={drawer === "evaluation"}
        onOpenChange={(next) => setDrawer(next ? "evaluation" : null)}
      />
      <CreateDocumentDrawer open={drawer === "document"} onOpenChange={(next) => setDrawer(next ? "document" : null)} />
    </>
  );
}
