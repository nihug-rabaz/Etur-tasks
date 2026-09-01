"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatAgamDate } from "@/modules/agam/lib/date-format";
import { fieldClass } from "@/modules/agam/lib/ui";

const WEEKDAYS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"] as const;
const MONTHS = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
] as const;

const PICKER_Z = 300;
type PickerView = "days" | "months" | "years";

function decadeStart(year: number): number {
  return Math.floor(year / 10) * 10;
}

type CalendarCell = {
  day: number;
  month: number;
  year: number;
  outside: boolean;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function parseIsoDate(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function localTodayIso(): string {
  const now = new Date();
  return toIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function monthMatrix(year: number, month: number): CalendarCell[] {
  const firstDay = new Date(year, month - 1, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonthDays = new Date(prevYear, prevMonth, 0).getDate();
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const cells: CalendarCell[] = [];

  for (let i = startOffset - 1; i >= 0; i -= 1) {
    cells.push({
      day: prevMonthDays - i,
      month: prevMonth,
      year: prevYear,
      outside: true,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, month, year, outside: false });
  }

  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ day: nextDay, month: nextMonth, year: nextYear, outside: true });
    nextDay += 1;
  }

  return cells;
}

type PanelLayout =
  | { mode: "sheet"; left: number; width: number }
  | { mode: "popover"; top: number; left: number; width: number }
  | { mode: "center"; width: number };

function computeLayout(trigger: HTMLButtonElement): PanelLayout {
  const rect = trigger.getBoundingClientRect();
  const sheet = window.innerWidth < 640;
  const width = sheet ? Math.min(window.innerWidth - 24, 380) : 360;
  const margin = 12;
  const panelHeight = 420;

  if (sheet) {
    return {
      mode: "sheet",
      left: (window.innerWidth - width) / 2,
      width,
    };
  }

  let left = rect.left + rect.width / 2 - width / 2;
  left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));

  let top = rect.bottom + 10;
  const fitsBelow = top + panelHeight <= window.innerHeight - margin;
  const fitsAbove = rect.top - panelHeight - 10 >= margin;

  if (!fitsBelow && fitsAbove) {
    top = rect.top - panelHeight - 10;
  }

  if (!fitsBelow && !fitsAbove) {
    return { mode: "center", width };
  }

  return { mode: "popover", top, left, width };
}

function CalendarPanel({
  value,
  viewYear,
  viewMonth,
  todayIso,
  onPick,
  onShiftMonth,
  onShiftYear,
  onSelectMonth,
  onSelectYear,
  onToday,
  onClear,
  onClose,
}: {
  value: string;
  viewYear: number;
  viewMonth: number;
  todayIso: string;
  onPick: (cell: CalendarCell) => void;
  onShiftMonth: (delta: number) => void;
  onShiftYear: (delta: number) => void;
  onSelectMonth: (month: number) => void;
  onSelectYear: (year: number) => void;
  onToday: () => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [view, setView] = useState<PickerView>("days");
  const [yearPageStart, setYearPageStart] = useState(() => decadeStart(viewYear));
  const cells = useMemo(() => monthMatrix(viewYear, viewMonth), [viewYear, viewMonth]);
  const headerDate = value ? formatAgamDate(value) : "לא נבחר תאריך";
  const todayParts = parseIsoDate(todayIso)!;
  const yearOptions = useMemo(
    () => Array.from({ length: 12 }, (_, index) => yearPageStart + index),
    [yearPageStart],
  );

  useEffect(() => {
    setYearPageStart(decadeStart(viewYear));
  }, [viewYear]);

  const navButtonClass =
    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10 transition hover:bg-white/20";

  return (
    <div className="agam-date-picker overflow-hidden rounded-2xl border-2 border-accent-primary/20 bg-white dark:bg-[#171923]">
      <div className="bg-gradient-to-l from-[#6d28d9] via-accent-primary to-[#8b5cf6] px-3 pb-4 pt-3.5 text-white sm:px-4">
        <div className="mb-3 flex items-center justify-between gap-1">
          {view === "years" ? (
            <>
              <button
                type="button"
                onClick={() => setYearPageStart((current) => current - 12)}
                className={navButtonClass}
                aria-label="12 שנים אחורה"
              >
                <ChevronsRight size={18} />
              </button>
              <button
                type="button"
                onClick={() => setView("days")}
                className="min-w-0 flex-1 rounded-lg bg-white/12 px-2 py-1.5 text-center text-sm font-extrabold transition hover:bg-white/20"
              >
                {yearPageStart} – {yearPageStart + 11}
              </button>
              <button
                type="button"
                onClick={() => setYearPageStart((current) => current + 12)}
                className={navButtonClass}
                aria-label="12 שנים קדימה"
              >
                <ChevronsLeft size={18} />
              </button>
            </>
          ) : view === "months" ? (
            <>
              <button
                type="button"
                onClick={() => onShiftYear(-1)}
                className={navButtonClass}
                aria-label="שנה קודמת"
              >
                <ChevronsRight size={18} />
              </button>
              <button
                type="button"
                onClick={() => setView("years")}
                className="min-w-0 flex-1 rounded-lg bg-white/12 px-2 py-1.5 text-center text-lg font-extrabold transition hover:bg-white/20"
                dir="ltr"
              >
                {viewYear}
              </button>
              <button
                type="button"
                onClick={() => onShiftYear(1)}
                className={navButtonClass}
                aria-label="שנה הבאה"
              >
                <ChevronsLeft size={18} />
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-0.5">
                <button type="button" onClick={() => onShiftYear(-1)} className={navButtonClass} aria-label="שנה קודמת">
                  <ChevronsRight size={18} />
                </button>
                <button type="button" onClick={() => onShiftMonth(-1)} className={navButtonClass} aria-label="חודש קודם">
                  <ChevronRight size={18} />
                </button>
              </div>
              <div className="min-w-0 flex-1 text-center">
                <button
                  type="button"
                  onClick={() => setView("months")}
                  className="block w-full truncate text-base font-extrabold leading-tight transition hover:text-white/85 sm:text-lg"
                >
                  {MONTHS[viewMonth - 1]}
                </button>
                <button
                  type="button"
                  onClick={() => setView("years")}
                  className="mt-0.5 text-sm font-semibold text-white/85 transition hover:text-white"
                  dir="ltr"
                >
                  {viewYear}
                </button>
              </div>
              <div className="flex items-center gap-0.5">
                <button type="button" onClick={() => onShiftMonth(1)} className={navButtonClass} aria-label="חודש הבא">
                  <ChevronLeft size={18} />
                </button>
                <button type="button" onClick={() => onShiftYear(1)} className={navButtonClass} aria-label="שנה הבאה">
                  <ChevronsLeft size={18} />
                </button>
              </div>
            </>
          )}
        </div>
        <p className="rounded-xl bg-black/15 px-3 py-2 text-center text-xs font-bold text-white/90" dir="ltr">
          {headerDate}
        </p>
      </div>

      {view === "years" ? (
        <div className="grid grid-cols-3 gap-2 p-3">
          {yearOptions.map((year) => {
            const selected = viewYear === year;
            const isCurrentYear = todayParts.year === year;
            return (
              <button
                key={year}
                type="button"
                onClick={() => {
                  onSelectYear(year);
                  setView("months");
                }}
                className={`rounded-xl py-3 text-sm font-extrabold transition ${
                  selected
                    ? "bg-accent-primary text-white shadow-[0_8px_18px_-10px_rgba(139,92,246,1)]"
                    : isCurrentYear
                      ? "bg-accent-primary/15 text-accent-primary ring-2 ring-inset ring-accent-primary/35"
                      : "bg-surface-2/80 text-text-primary hover:bg-accent-primary/12 hover:text-accent-primary"
                }`}
                dir="ltr"
              >
                {year}
              </button>
            );
          })}
        </div>
      ) : view === "months" ? (
        <div className="grid grid-cols-3 gap-2 p-3">
          {MONTHS.map((monthLabel, index) => {
            const month = index + 1;
            const selected = viewMonth === month;
            const isCurrentMonth = todayParts.year === viewYear && todayParts.month === month;
            return (
              <button
                key={monthLabel}
                type="button"
                onClick={() => {
                  onSelectMonth(month);
                  setView("days");
                }}
                className={`rounded-xl px-1 py-3 text-xs font-extrabold transition sm:text-sm ${
                  selected
                    ? "bg-accent-primary text-white shadow-[0_8px_18px_-10px_rgba(139,92,246,1)]"
                    : isCurrentMonth
                      ? "bg-accent-primary/15 text-accent-primary ring-2 ring-inset ring-accent-primary/35"
                      : "bg-surface-2/80 text-text-primary hover:bg-accent-primary/12 hover:text-accent-primary"
                }`}
              >
                {monthLabel}
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 border-b border-black/8 bg-[#f4f2fb] dark:border-white/10 dark:bg-[#1f2230]">
            {WEEKDAYS.map((day, index) => (
              <div
                key={day}
                className={`py-2.5 text-center text-[11px] font-extrabold ${
                  index === 6 ? "text-accent-primary" : "text-text-muted"
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5 p-3">
            {cells.map((cell) => {
              const iso = toIsoDate(cell.year, cell.month, cell.day);
              const selected = value === iso;
              const isToday = todayIso === iso;
              const key = `${cell.year}-${cell.month}-${cell.day}-${cell.outside ? "o" : "i"}`;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onPick(cell)}
                  className={`flex h-10 items-center justify-center rounded-lg text-sm font-bold transition ${
                    selected
                      ? "bg-accent-primary text-white shadow-[0_8px_18px_-10px_rgba(139,92,246,1)]"
                      : isToday
                        ? "bg-accent-primary/18 text-accent-primary ring-2 ring-inset ring-accent-primary/45"
                        : cell.outside
                          ? "text-text-muted/45 hover:bg-surface-2/80 hover:text-text-muted"
                          : "text-text-primary hover:bg-accent-primary/12 hover:text-accent-primary"
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-black/8 bg-surface-2/50 px-3 py-2.5 dark:border-white/10 dark:bg-[#141722]">
        <button
          type="button"
          onClick={onToday}
          className="rounded-lg border border-accent-primary/25 bg-accent-primary/10 px-3 py-2 text-xs font-extrabold text-accent-primary transition hover:bg-accent-primary/18"
        >
          היום
        </button>
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg px-3 py-2 text-xs font-bold text-text-muted transition hover:bg-white/70 hover:text-text-primary dark:hover:bg-white/8"
        >
          נקה
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-bold text-text-secondary transition hover:text-text-primary dark:border-white/12 dark:bg-[#1c1f2b]"
        >
          <X size={14} />
          סגור
        </button>
      </div>
    </div>
  );
}

export function TimelineDatePicker({
  value,
  onChange,
  label = "תאריך",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const ignoreOutsideRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [layout, setLayout] = useState<PanelLayout | null>(null);

  const parsed = value ? parseIsoDate(value) : null;
  const todayIso = useMemo(() => localTodayIso(), []);
  const todayParts = parseIsoDate(todayIso)!;

  const [viewYear, setViewYear] = useState(parsed?.year ?? todayParts.year);
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? todayParts.month);
  const [pickerSession, setPickerSession] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const refreshLayout = useCallback(() => {
    if (!triggerRef.current) return;
    setLayout(computeLayout(triggerRef.current));
  }, []);

  const openPicker = () => {
    const parsedValue = value ? parseIsoDate(value) : null;
    if (parsedValue) {
      setViewYear(parsedValue.year);
      setViewMonth(parsedValue.month);
    } else {
      setViewYear(todayParts.year);
      setViewMonth(todayParts.month);
    }
    if (triggerRef.current) {
      setLayout(computeLayout(triggerRef.current));
    }
    ignoreOutsideRef.current = true;
    window.setTimeout(() => {
      ignoreOutsideRef.current = false;
    }, 0);
    setPickerSession((current) => current + 1);
    setOpen(true);
  };

  useLayoutEffect(() => {
    if (!open) return;
    refreshLayout();
    const onReflow = () => refreshLayout();
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [open, refreshLayout]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (ignoreOutsideRef.current) return;
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  const shiftMonth = (delta: number) => {
    const date = new Date(viewYear, viewMonth - 1 + delta, 1);
    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth() + 1);
  };

  const shiftYear = (delta: number) => {
    setViewYear((current) => current + delta);
  };

  const pickCell = (cell: CalendarCell) => {
    onChange(toIsoDate(cell.year, cell.month, cell.day));
    if (!cell.outside) {
      setViewYear(cell.year);
      setViewMonth(cell.month);
    }
    setOpen(false);
  };

  const display = value ? formatAgamDate(value) : "בחר תאריך";

  const panelStyle =
    layout?.mode === "sheet"
      ? {
          position: "fixed" as const,
          zIndex: PICKER_Z,
          bottom: "max(1rem, env(safe-area-inset-bottom))",
          left: layout.left,
          width: layout.width,
        }
      : layout?.mode === "popover"
        ? {
            position: "fixed" as const,
            zIndex: PICKER_Z,
            top: layout.top,
            left: layout.left,
            width: layout.width,
          }
        : layout?.mode === "center"
          ? {
              position: "fixed" as const,
              zIndex: PICKER_Z,
              top: "50%",
              left: "50%",
              width: layout.width,
              transform: "translate(-50%, -50%)",
            }
          : null;

  return (
    <>
      <div className="relative">
        <span className="mb-2 block text-xs font-bold text-text-secondary">{label}</span>
        <button
          ref={triggerRef}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (open) setOpen(false);
            else openPicker();
          }}
          aria-expanded={open}
          aria-haspopup="dialog"
          className={`${fieldClass} flex min-h-[3rem] w-full items-center justify-between gap-3 border border-black/8 text-start transition dark:border-white/10 ${
            open ? "ring-2 ring-accent-primary/40" : "hover:border-accent-primary/30"
          }`}
        >
          <span className={value ? "font-bold text-text-primary" : "text-text-muted"} dir="ltr">
            {display}
          </span>
          <CalendarDays size={18} className="shrink-0 text-accent-primary" />
        </button>
      </div>

      {mounted
        ? createPortal(
            <AnimatePresence>
              {open && layout && panelStyle ? (
                <>
                  <motion.button
                    type="button"
                    aria-label="סגירה"
                    className="fixed inset-0 bg-black/55 backdrop-blur-[2px]"
                    style={{ zIndex: PICKER_Z - 1 }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      setOpen(false);
                    }}
                  />
                  <motion.div
                    ref={panelRef}
                    key="agam-date-picker"
                    role="dialog"
                    aria-modal="true"
                    aria-label="בחירת תאריך"
                    initial={{
                      opacity: 0,
                      y: layout.mode === "sheet" ? 28 : layout.mode === "center" ? 0 : 10,
                      scale: layout.mode === "center" ? 0.94 : 0.97,
                    }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{
                      opacity: 0,
                      y: layout.mode === "sheet" ? 20 : layout.mode === "center" ? 0 : 6,
                      scale: layout.mode === "center" ? 0.96 : 0.98,
                    }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    style={panelStyle}
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <CalendarPanel
                      key={pickerSession}
                      value={value}
                      viewYear={viewYear}
                      viewMonth={viewMonth}
                      todayIso={todayIso}
                      onPick={pickCell}
                      onShiftMonth={shiftMonth}
                      onShiftYear={shiftYear}
                      onSelectMonth={setViewMonth}
                      onSelectYear={setViewYear}
                      onToday={() => {
                        onChange(todayIso);
                        setOpen(false);
                      }}
                      onClear={() => {
                        onChange("");
                        setOpen(false);
                      }}
                      onClose={() => setOpen(false)}
                    />
                  </motion.div>
                </>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
