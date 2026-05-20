import {
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

const weekOptions = { weekStartsOn: 0 as const };

export function defaultCurrentMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  return {
    start: startOfMonth(now),
    end: endOfMonth(now),
  };
}

export function toDateQueryValue(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function toMonthQueryValue(date: Date): string {
  return format(date, "yyyy-MM");
}

export function isFullMonthRange(start: Date, end: Date): boolean {
  const monthStart = startOfMonth(start);
  const monthEnd = endOfMonth(start);
  return (
    isSameMonth(start, end) &&
    isSameDay(startOfDay(start), startOfDay(monthStart)) &&
    isSameDay(endOfDay(end), endOfDay(monthEnd))
  );
}

export function resolveTaskDateRange(
  fromParam?: string | null,
  toParam?: string | null,
  weekParam?: string | null,
  monthParam?: string | null,
): { start: Date; end: Date } {
  if (fromParam || toParam) {
    const fallback = defaultCurrentMonthRange();
    const startParsed = fromParam ? parseISO(fromParam) : null;
    const endParsed = toParam ? parseISO(toParam) : null;
    let start =
      startParsed && isValid(startParsed) ? startOfDay(startParsed) : fallback.start;
    let end = endParsed && isValid(endParsed) ? endOfDay(endParsed) : fallback.end;
    if (start > end) {
      const swap = start;
      start = startOfDay(end);
      end = endOfDay(swap);
    }
    return { start, end };
  }

  if (monthParam) {
    const parsed = parseISO(`${monthParam}-01`);
    const base = isValid(parsed) ? parsed : new Date();
    return {
      start: startOfMonth(base),
      end: endOfMonth(base),
    };
  }

  if (weekParam) {
    const parsed = parseISO(weekParam);
    const base = isValid(parsed) ? parsed : new Date();
    return {
      start: startOfWeek(base, weekOptions),
      end: endOfWeek(base, weekOptions),
    };
  }

  return defaultCurrentMonthRange();
}

export type CalendarCell =
  | { type: "empty" }
  | { type: "day"; date: Date; key: string; inRange: boolean };

export function buildCalendarCells(rangeStart: Date, rangeEnd: Date): CalendarCell[] {
  if (isFullMonthRange(rangeStart, rangeEnd)) {
    const monthStart = startOfMonth(rangeStart);
    const monthEnd = endOfMonth(rangeStart);
    const gridStart = startOfWeek(monthStart, weekOptions);
    const gridEnd = endOfWeek(monthEnd, weekOptions);
    const rangeStartDay = startOfDay(rangeStart);
    const rangeEndDay = endOfDay(rangeEnd);

    return eachDayOfInterval({ start: gridStart, end: gridEnd }).map((date) => ({
      type: "day" as const,
      date,
      key: toDateQueryValue(date),
      inRange: date >= rangeStartDay && date <= rangeEndDay,
    }));
  }

  const cells: CalendarCell[] = [];
  for (let index = 0; index < getDay(rangeStart); index += 1) {
    cells.push({ type: "empty" });
  }
  for (const date of eachDayOfInterval({ start: rangeStart, end: rangeEnd })) {
    cells.push({
      type: "day",
      date,
      key: toDateQueryValue(date),
      inRange: true,
    });
  }
  return cells;
}

export function coerceToDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  if (typeof value === "number") {
    const date = new Date(value);
    return isValid(date) ? date : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const iso = parseISO(trimmed);
    if (isValid(iso)) return iso;
    const fallback = new Date(trimmed);
    return isValid(fallback) ? fallback : null;
  }
  return null;
}

export function dueDateToDayKey(value: unknown): string | null {
  const date = coerceToDate(value);
  if (!date) return null;
  return toDateQueryValue(date);
}

export function dayBoundsForQuery(rangeStart: Date, rangeEnd: Date): { start: Date; end: Date } {
  return {
    start: startOfDay(rangeStart),
    end: endOfDay(rangeEnd),
  };
}
