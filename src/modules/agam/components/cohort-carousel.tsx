"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { animate, motion, useMotionValue } from "framer-motion";
import { useEffect, useRef, useState, type MouseEvent } from "react";

export type CohortCardData = {
  key: string;
  year: number | null;
  cycleCount: number;
  candidateCount: number;
};

const CARD_WIDTH = 200;
const GAP = 12;
const STEP = CARD_WIDTH + GAP;

export function CohortCarousel({
  items,
  getHref,
  onSelect,
}: {
  items: CohortCardData[];
  getHref?: (key: string) => string;
  onSelect?: (key: string) => void;
}) {
  // LTR track: oldest → newest, so the newest sits on the right.
  const displayItems = [...items].reverse();
  const [index, setIndex] = useState(0);
  const [maxIndex, setMaxIndex] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const draggedRef = useRef(false);
  const x = useMotionValue(0);
  const didInitRef = useRef(false);

  useEffect(() => {
    const measure = () => {
      const width = viewportRef.current?.clientWidth ?? CARD_WIDTH;
      const visible = Math.max(1, Math.floor((width + GAP) / STEP));
      const nextMax = Math.max(0, displayItems.length - visible);
      setMaxIndex(nextMax);
      if (!didInitRef.current) {
        didInitRef.current = true;
        setIndex(nextMax);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [displayItems.length]);

  useEffect(() => {
    setIndex((current) => Math.min(current, maxIndex));
  }, [maxIndex]);

  useEffect(() => {
    const controls = animate(x, -index * STEP, {
      type: "spring",
      stiffness: 320,
      damping: 34,
      mass: 0.85,
    });
    return () => controls.stop();
  }, [index, x]);

  if (displayItems.length === 0) return null;

  const canPrev = index > 0;
  const canNext = index < maxIndex;
  const showNav = displayItems.length > 1 && maxIndex > 0;

  const go = (next: number) => {
    setIndex(Math.max(0, Math.min(maxIndex, next)));
  };

  return (
    <div className="relative">
      {showNav ? (
        <>
          <button
            type="button"
            aria-label="הקודם"
            disabled={!canPrev}
            onClick={() => go(index - 1)}
            className="absolute -right-1 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-black/8 bg-surface-1 text-text-primary shadow-sm transition hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-30 dark:border-white/10"
          >
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            aria-label="הבא"
            disabled={!canNext}
            onClick={() => go(index + 1)}
            className="absolute -left-1 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-black/8 bg-surface-1 text-text-primary shadow-sm transition hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-30 dark:border-white/10"
          >
            <ChevronLeft size={18} />
          </button>
        </>
      ) : null}

      <div ref={viewportRef} className="overflow-hidden px-1" dir="ltr">
        <motion.div
          className="flex cursor-grab active:cursor-grabbing"
          style={{ x, gap: GAP, touchAction: "pan-y" }}
          drag="x"
          dragConstraints={{
            left: -maxIndex * STEP,
            right: 0,
          }}
          dragElastic={0.12}
          onDragStart={() => {
            draggedRef.current = false;
          }}
          onDrag={(_, info) => {
            if (Math.abs(info.offset.x) > 8) draggedRef.current = true;
          }}
          onDragEnd={(_, info) => {
            const offset = info.offset.x + info.velocity.x * 0.2;
            const delta = Math.round(-offset / STEP);
            go(index + delta);
            window.setTimeout(() => {
              draggedRef.current = false;
            }, 0);
          }}
        >
          {displayItems.map((item) => {
            const body = (
              <div className="flex h-full flex-col items-center justify-center gap-2.5 px-4 py-5 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                  שנתון
                </p>
                <p className="text-[2.35rem] font-semibold leading-none tracking-tight text-text-primary">
                  {item.year == null ? "—" : item.year}
                </p>
                {item.year == null ? (
                  <p className="max-w-[10rem] text-[11px] leading-snug text-text-secondary">
                    מחזורים ללא שיוך
                  </p>
                ) : null}
                <p className="text-[11px] font-medium tabular-nums text-text-muted">
                  {item.cycleCount} מחזורים · {item.candidateCount} מועמדים
                </p>
              </div>
            );

            const className =
              "ui-card block shrink-0 rounded-xl bg-surface-1 transition hover:bg-surface-2/70";
            const style = { width: CARD_WIDTH };

            const guardClick = (event: MouseEvent) => {
              if (draggedRef.current) {
                event.preventDefault();
                event.stopPropagation();
              }
            };

            if (getHref) {
              return (
                <Link
                  key={item.key}
                  href={getHref(item.key)}
                  className={className}
                  style={style}
                  draggable={false}
                  onClick={guardClick}
                >
                  {body}
                </Link>
              );
            }

            return (
              <button
                key={item.key}
                type="button"
                className={`${className} text-start`}
                style={style}
                onClick={(event) => {
                  guardClick(event);
                  if (!draggedRef.current) onSelect?.(item.key);
                }}
              >
                {body}
              </button>
            );
          })}
        </motion.div>
      </div>

      {showNav ? (
        <div className="mt-3 flex items-center justify-center gap-1.5" dir="ltr">
          {Array.from({ length: maxIndex + 1 }).map((_, dot) => (
            <button
              key={dot}
              type="button"
              aria-label={`מעבר למיקום ${dot + 1}`}
              onClick={() => go(dot)}
              className={`h-1.5 rounded-full transition-all ${
                dot === index ? "w-4 bg-text-primary" : "w-1.5 bg-text-muted/35 hover:bg-text-muted/55"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
