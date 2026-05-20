"use client";

import { addMonths, format, isSameMonth, parseISO, subMonths } from "date-fns";
import { he } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { isFullMonthRange, toMonthQueryValue } from "@/lib/dates/task-date-range";

interface TaskDateRangePickerProps {
  rangeStartIso: string;
  rangeEndIso: string;
  fromQueryValue: string;
  toQueryValue: string;
}

export function TaskDateRangePicker({
  rangeStartIso,
  rangeEndIso,
  fromQueryValue,
  toQueryValue,
}: TaskDateRangePickerProps) {
  const router = useRouter();
  const rangeStart = parseISO(rangeStartIso);
  const rangeEnd = parseISO(rangeEndIso);
  const isMonthView = isFullMonthRange(rangeStart, rangeEnd);
  const isCurrentMonth = isSameMonth(rangeStart, new Date());

  const [fromValue, setFromValue] = useState(fromQueryValue);
  const [toValue, setToValue] = useState(toQueryValue);

  useEffect(() => {
    setFromValue(fromQueryValue);
    setToValue(toQueryValue);
  }, [fromQueryValue, toQueryValue]);

  const navigateToRange = (from: string, to: string) => {
    const params = new URLSearchParams();
    params.set("from", from);
    params.set("to", to);
    router.push(`/tasks/upcoming?${params.toString()}`);
  };

  const navigateToMonth = (date: Date) => {
    const params = new URLSearchParams();
    params.set("month", toMonthQueryValue(date));
    router.push(`/tasks/upcoming?${params.toString()}`);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!fromValue || !toValue) return;
    navigateToRange(fromValue, toValue);
  };

  const rangeLabel = isMonthView
    ? format(rangeStart, "MMMM yyyy", { locale: he })
    : `${format(rangeStart, "d בMMMM", { locale: he })} – ${format(rangeEnd, "d בMMMM yyyy", { locale: he })}`;

  return (
    <div className="space-y-3 rounded-2xl border border-border-weak bg-surface-1/70 p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
        <CalendarDays size={18} className="text-text-muted" aria-hidden />
        <span className="font-medium text-text-primary">טווח נבחר: {rangeLabel}</span>
        {isCurrentMonth && isMonthView ? (
          <span className="rounded-full bg-accent-primary/15 px-2 py-0.5 text-xs font-semibold text-accent-primary">
            חודש נוכחי
          </span>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">מתאריך</span>
            <input
              type="date"
              value={fromValue}
              onChange={(event) => setFromValue(event.target.value)}
              max={toValue || undefined}
              required
              className="rounded-xl border border-border-weak bg-surface-2/70 px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/25"
              aria-label="תאריך התחלה"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">עד תאריך</span>
            <input
              type="date"
              value={toValue}
              onChange={(event) => setToValue(event.target.value)}
              min={fromValue || undefined}
              required
              className="rounded-xl border border-border-weak bg-surface-2/70 px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/25"
              aria-label="תאריך סיום"
            />
          </label>

          <button
            type="submit"
            className="rounded-xl border border-accent-primary/50 bg-accent-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-primary/90"
          >
            הצג משימות
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigateToMonth(subMonths(rangeStart, 1))}
            className="rounded-xl border border-border-weak bg-surface-2/70 px-3 py-2 text-sm font-medium text-text-primary transition hover:bg-surface-2"
          >
            חודש קודם
          </button>
          <button
            type="button"
            onClick={() => router.push("/tasks/upcoming")}
            className="rounded-xl border border-border-weak bg-surface-2/70 px-3 py-2 text-sm font-medium text-text-primary transition hover:bg-surface-2"
          >
            חודש נוכחי
          </button>
          <button
            type="button"
            onClick={() => navigateToMonth(addMonths(rangeStart, 1))}
            className="rounded-xl border border-border-weak bg-surface-2/70 px-3 py-2 text-sm font-medium text-text-primary transition hover:bg-surface-2"
          >
            חודש הבא
          </button>
        </div>
      </form>
    </div>
  );
}
