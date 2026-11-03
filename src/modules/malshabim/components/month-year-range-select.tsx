"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarRange, Check, ChevronDown, X } from "lucide-react";
import {
  HEBREW_MONTHS,
  expandEnlistmentMonthRange,
  formatEnlistmentMonthLabel,
} from "@/modules/malshabim/lib/status";

type Props = {
  label: string;
  value: string[];
  onChange: (months: string[]) => void;
  fromYear?: number;
  toYear?: number;
};

function parseBound(months: string[], which: "min" | "max"): string {
  if (months.length === 0) return "";
  const sorted = [...months].sort();
  return which === "min" ? sorted[0] : sorted[sorted.length - 1];
}

function monthValue(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function MonthYearRangeSelect({
  label,
  value,
  onChange,
  fromYear = 2024,
  toYear = 2028,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [from, setFrom] = useState(() => parseBound(value, "min"));
  const [to, setTo] = useState(() => parseBound(value, "max"));
  const [menuRect, setMenuRect] = useState({ top: 0, left: 0, width: 0, maxH: 320 });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = fromYear; y <= toYear; y += 1) list.push(y);
    return list;
  }, [fromYear, toYear]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setFrom(parseBound(value, "min"));
    setTo(parseBound(value, "max"));
  }, [value]);

  const syncMenuPosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 8;
    const margin = 12;
    const width = Math.max(r.width, 300);
    const panelHeight = 280;
    const left = Math.min(Math.max(margin, r.left), window.innerWidth - width - margin);
    const spaceBelow = window.innerHeight - r.bottom - gap - margin;
    const openUp = spaceBelow < panelHeight && r.top > spaceBelow;
    const top = openUp
      ? Math.max(margin, r.top - gap - panelHeight)
      : Math.min(r.bottom + gap, window.innerHeight - panelHeight - margin);
    setMenuRect({ top, left, width, maxH: panelHeight });
  };

  useLayoutEffect(() => {
    if (!open) return;
    syncMenuPosition();
    const onScroll = (event: Event) => {
      if (menuRef.current && event.target instanceof Node && menuRef.current.contains(event.target)) {
        return;
      }
      syncMenuPosition();
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      const t = event.target as Node;
      if (containerRef.current?.contains(t)) return;
      if (document.getElementById(listboxId)?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open, listboxId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const applyRange = (nextFrom: string, nextTo: string) => {
    setFrom(nextFrom);
    setTo(nextTo);
    if (!nextFrom || !nextTo) {
      onChange([]);
      return;
    }
    onChange(expandEnlistmentMonthRange(nextFrom, nextTo));
  };

  const summary =
    from && to
      ? from === to
        ? formatEnlistmentMonthLabel(from)
        : `${formatEnlistmentMonthLabel(from)} – ${formatEnlistmentMonthLabel(to)}`
      : "מחודש / שנה עד חודש / שנה…";

  const fromParts = from ? from.split("-").map(Number) : [0, 0];
  const toParts = to ? to.split("-").map(Number) : [0, 0];

  const menu = open ? (
    <div
      ref={menuRef}
      id={listboxId}
      style={{
        position: "fixed",
        top: menuRect.top,
        left: menuRect.left,
        width: menuRect.width,
        zIndex: 20000,
      }}
      className="overflow-hidden rounded-2xl border border-border-weak bg-surface-1 p-3 shadow-[0_18px_50px_rgba(2,6,23,0.22)]"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <fieldset className="space-y-1.5">
          <legend className="text-xs font-bold text-text-muted">מ־</legend>
          <div className="flex gap-2">
            <select
              className="min-w-0 flex-1 rounded-xl border border-border-weak bg-surface-2 px-2 py-2 text-sm font-semibold text-text-primary outline-none focus:ring-2 focus:ring-accent-primary/30"
              value={fromParts[1] || ""}
              onChange={(e) => {
                const month = Number(e.target.value);
                const year = fromParts[0] || fromYear;
                if (!month) {
                  applyRange("", to);
                  return;
                }
                applyRange(monthValue(year, month), to || monthValue(year, month));
              }}
            >
              <option value="">חודש</option>
              {HEBREW_MONTHS.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
            <select
              className="w-[5.5rem] rounded-xl border border-border-weak bg-surface-2 px-2 py-2 text-sm font-semibold text-text-primary outline-none focus:ring-2 focus:ring-accent-primary/30"
              value={fromParts[0] || ""}
              onChange={(e) => {
                const year = Number(e.target.value);
                const month = fromParts[1] || 1;
                if (!year) {
                  applyRange("", to);
                  return;
                }
                applyRange(monthValue(year, month), to || monthValue(year, month));
              }}
            >
              <option value="">שנה</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {String(y).slice(-2)}
                </option>
              ))}
            </select>
          </div>
        </fieldset>
        <fieldset className="space-y-1.5">
          <legend className="text-xs font-bold text-text-muted">עד</legend>
          <div className="flex gap-2">
            <select
              className="min-w-0 flex-1 rounded-xl border border-border-weak bg-surface-2 px-2 py-2 text-sm font-semibold text-text-primary outline-none focus:ring-2 focus:ring-accent-primary/30"
              value={toParts[1] || ""}
              onChange={(e) => {
                const month = Number(e.target.value);
                const year = toParts[0] || fromYear;
                if (!month) {
                  applyRange(from, "");
                  return;
                }
                applyRange(from || monthValue(year, month), monthValue(year, month));
              }}
            >
              <option value="">חודש</option>
              {HEBREW_MONTHS.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
            <select
              className="w-[5.5rem] rounded-xl border border-border-weak bg-surface-2 px-2 py-2 text-sm font-semibold text-text-primary outline-none focus:ring-2 focus:ring-accent-primary/30"
              value={toParts[0] || ""}
              onChange={(e) => {
                const year = Number(e.target.value);
                const month = toParts[1] || 1;
                if (!year) {
                  applyRange(from, "");
                  return;
                }
                applyRange(from || monthValue(year, month), monthValue(year, month));
              }}
            >
              <option value="">שנה</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {String(y).slice(-2)}
                </option>
              ))}
            </select>
          </div>
        </fieldset>
      </div>
      {value.length > 0 ? (
        <p className="mt-3 text-center text-xs font-medium text-text-muted">
          נבחרו {value.length} חודשים · {summary}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent-primary/10 py-2.5 text-sm font-bold text-accent-primary transition hover:bg-accent-primary/15"
      >
        <Check size={15} />
        סיום
      </button>
    </div>
  ) : null;

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      <p className="text-xs font-bold text-text-muted">{label}</p>
      <div
        ref={triggerRef}
        className="flex min-h-[46px] w-full items-center gap-2 rounded-2xl border border-border-weak bg-surface-2/50 px-3 py-2 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-start outline-none"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <CalendarRange size={16} className="shrink-0 text-text-muted" />
          <span
            className={`min-w-0 flex-1 truncate font-medium ${
              from && to ? "text-text-primary" : "text-text-muted"
            }`}
          >
            {summary}
          </span>
          <ChevronDown
            size={16}
            className={`shrink-0 text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        {value.length > 0 ? (
          <button
            type="button"
            className="rounded-full p-1 text-text-muted transition hover:bg-surface-1 hover:text-text-primary"
            aria-label="נקה טווח"
            onClick={(e) => {
              e.stopPropagation();
              setFrom("");
              setTo("");
              onChange([]);
            }}
          >
            <X size={14} />
          </button>
        ) : null}
      </div>
      {mounted && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
