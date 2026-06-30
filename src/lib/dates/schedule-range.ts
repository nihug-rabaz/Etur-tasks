import { eachDayOfInterval, parseISO } from "date-fns";

const ISRAEL_TZ = "Asia/Jerusalem";

export type ScheduleDateInput = string | Date | number | null | undefined;

export function coerceScheduleDate(value: ScheduleDateInput): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string") {
    const date = parseISO(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function zonedParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ISRAEL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value])) as Record<string, string>;
  return `${map.year}-${map.month}-${map.day}`;
}

export function scheduleDayKey(date: Date): string {
  return zonedParts(date);
}

export function scheduleEventDayKeys(event: {
  starts_at: ScheduleDateInput;
  ends_at: ScheduleDateInput;
}): string[] {
  const start = coerceScheduleDate(event.starts_at);
  if (!start) return [];
  const end = coerceScheduleDate(event.ends_at) ?? start;
  if (end < start) return [zonedParts(start)];
  return eachDayOfInterval({ start, end }).map((day) => zonedParts(day));
}

export function scheduleEventOverlapsRange(
  event: { starts_at: ScheduleDateInput; ends_at: ScheduleDateInput },
  rangeStart: Date,
  rangeEnd: Date,
): boolean {
  const start = coerceScheduleDate(event.starts_at);
  if (!start) return false;
  const end = coerceScheduleDate(event.ends_at) ?? start;
  return start <= rangeEnd && end >= rangeStart;
}

export function formatScheduleTime(event: {
  starts_at: ScheduleDateInput;
  ends_at: ScheduleDateInput;
  all_day: boolean;
}): string {
  if (event.all_day) return "כל היום";
  const start = coerceScheduleDate(event.starts_at);
  if (!start) return "ללא מועד";
  const startLabel = start.toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short", timeZone: ISRAEL_TZ });
  if (!event.ends_at) return startLabel;
  const end = coerceScheduleDate(event.ends_at);
  if (!end) return startLabel;
  const endLabel = end.toLocaleString("he-IL", { timeStyle: "short", timeZone: ISRAEL_TZ });
  return `${startLabel} – ${endLabel}`;
}

export function serializeCalendarEventDates<T extends { starts_at: ScheduleDateInput; ends_at: ScheduleDateInput }>(
  event: T,
): T & { starts_at: string; ends_at: string | null } {
  const starts = coerceScheduleDate(event.starts_at);
  const ends = coerceScheduleDate(event.ends_at);
  return {
    ...event,
    starts_at: starts?.toISOString() ?? "",
    ends_at: ends?.toISOString() ?? null,
  };
}
