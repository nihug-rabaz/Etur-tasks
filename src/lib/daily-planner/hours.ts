export const DEFAULT_DAILY_PLAN_HOUR_START = 6;
export const DEFAULT_DAILY_PLAN_HOUR_END = 22;
export const DEFAULT_DAILY_PLAN_SLOT_MINUTES = 60;
export const DEFAULT_DAILY_PLAN_TASK_DURATION = 30;
export const MIN_DAILY_PLAN_HOUR_SPAN = 4;
export const MIN_DAILY_PLAN_TASK_DURATION = 1;
export const MAX_DAILY_PLAN_TASK_DURATION = 24 * 60;
export const DAILY_PLAN_TIME_STEP = 1;

export const DAILY_PLAN_SLOT_MINUTE_OPTIONS = [15, 30, 60] as const;
export type DailyPlanSlotMinutes = (typeof DAILY_PLAN_SLOT_MINUTE_OPTIONS)[number];

export const DAILY_PLAN_TASK_DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 180] as const;
export type DailyPlanTaskDuration = number;

export interface DailyPlanSettings {
  hourStart: number;
  hourEnd: number;
  slotMinutes: DailyPlanSlotMinutes;
}

export type DailyPlanHours = DailyPlanSettings;

export interface DailyPlanOccupancy {
  start_minute: number;
  duration_minutes: number;
}

export function normalizeSlotMinutes(value: number | null | undefined): DailyPlanSlotMinutes {
  const rounded = Number.isFinite(value) ? Math.round(value as number) : DEFAULT_DAILY_PLAN_SLOT_MINUTES;
  if (rounded === 15 || rounded === 30 || rounded === 60) return rounded;
  return DEFAULT_DAILY_PLAN_SLOT_MINUTES;
}

export function normalizeTaskDuration(value: number | null | undefined): DailyPlanTaskDuration {
  const rounded = Number.isFinite(value) ? Math.round(value as number) : DEFAULT_DAILY_PLAN_TASK_DURATION;
  return Math.min(MAX_DAILY_PLAN_TASK_DURATION, Math.max(MIN_DAILY_PLAN_TASK_DURATION, rounded));
}

export function normalizeDailyPlanHours(
  hourStart: number | null | undefined,
  hourEnd: number | null | undefined,
  slotMinutes?: number | null | undefined,
): DailyPlanSettings {
  let start = Number.isFinite(hourStart) ? Math.round(hourStart as number) : DEFAULT_DAILY_PLAN_HOUR_START;
  let end = Number.isFinite(hourEnd) ? Math.round(hourEnd as number) : DEFAULT_DAILY_PLAN_HOUR_END;
  start = Math.min(23, Math.max(0, start));
  end = Math.min(23, Math.max(0, end));
  if (end <= start) {
    end = Math.min(23, start + MIN_DAILY_PLAN_HOUR_SPAN);
  }
  if (end - start < MIN_DAILY_PLAN_HOUR_SPAN) {
    end = Math.min(23, start + MIN_DAILY_PLAN_HOUR_SPAN);
  }
  if (end <= start) {
    start = Math.max(0, end - MIN_DAILY_PLAN_HOUR_SPAN);
  }
  return {
    hourStart: start,
    hourEnd: end,
    slotMinutes: normalizeSlotMinutes(slotMinutes),
  };
}

export function buildDailyPlanHourRange(settings: Pick<DailyPlanSettings, "hourStart" | "hourEnd">): number[] {
  const list: number[] = [];
  for (let hour = settings.hourStart; hour <= settings.hourEnd; hour += 1) {
    list.push(hour);
  }
  return list;
}

export function buildDailyPlanSlotStarts(settings: DailyPlanSettings): number[] {
  const slotMinutes = settings.slotMinutes;
  const rangeStart = settings.hourStart * 60;
  const rangeEnd = settings.hourEnd * 60;
  const list: number[] = [];
  for (let minute = rangeStart; minute <= rangeEnd; minute += slotMinutes) {
    if (minute > 23 * 60 + 59) break;
    list.push(minute);
  }
  return list;
}

export function formatSlotTimeLabel(startMinute: number): string {
  const hours = Math.floor(startMinute / 60);
  const minutes = startMinute % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

export function formatHourLabel(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`;
}

export function isCurrentPlanHour(hour: number, now: Date): boolean {
  return now.getHours() === hour;
}

export function isCurrentPlanSlot(startMinute: number, slotMinutes: number, now: Date): boolean {
  const nowMinute = now.getHours() * 60 + now.getMinutes();
  return nowMinute >= startMinute && nowMinute < startMinute + slotMinutes;
}

export function slotMinutesLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} דק׳`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) return hours === 1 ? "שעה" : `${hours} שעות`;
  return `${hours}:${remainder.toString().padStart(2, "0")} שעות`;
}

export function rangesOverlap(
  aStart: number,
  aDuration: number,
  bStart: number,
  bDuration: number,
): boolean {
  return aStart < bStart + bDuration && bStart < aStart + aDuration;
}

export function slotsForHour(hour: number, slots: DailyPlanOccupancy[]): DailyPlanOccupancy[] {
  const hourStart = hour * 60;
  const hourEnd = hourStart + 60;
  return slots
    .filter((slot) => slot.start_minute >= hourStart && slot.start_minute < hourEnd)
    .sort((a, b) => a.start_minute - b.start_minute);
}

export function usedMinutesInHour(hour: number, slots: DailyPlanOccupancy[]): number {
  return slotsForHour(hour, slots).reduce((sum, slot) => {
    const hourStart = hour * 60;
    const hourEnd = hourStart + 60;
    const start = Math.max(slot.start_minute, hourStart);
    const end = Math.min(slot.start_minute + slot.duration_minutes, hourEnd);
    return sum + Math.max(0, end - start);
  }, 0);
}

export function findFreeStartInHour(
  hour: number,
  duration: number,
  occupied: DailyPlanOccupancy[],
  ignoreStartMinute?: number,
): number | null {
  return findFreeStart(hour * 60, duration, occupied, hour * 60 + 60, ignoreStartMinute);
}

export function findFreeStart(
  requestedStart: number,
  duration: number,
  occupied: DailyPlanOccupancy[],
  rangeEnd = 24 * 60,
  ignoreStartMinute?: number,
): number | null {
  if (duration < MIN_DAILY_PLAN_TASK_DURATION || requestedStart + duration > rangeEnd) return null;
  const relevant = occupied.filter((slot) => slot.start_minute !== ignoreStartMinute);
  for (
    let start = requestedStart;
    start + duration <= rangeEnd;
    start += DAILY_PLAN_TIME_STEP
  ) {
    const conflicts = relevant.some((slot) =>
      rangesOverlap(start, duration, slot.start_minute, slot.duration_minutes),
    );
    if (!conflicts) return start;
  }
  return null;
}

export function canFitDurationInHour(
  hour: number,
  duration: number,
  occupied: DailyPlanOccupancy[],
  ignoreStartMinute?: number,
): boolean {
  return findFreeStartInHour(hour, duration, occupied, ignoreStartMinute) !== null;
}

export const DAILY_PLAN_TIME_ZONE = "Asia/Jerusalem";

export function dailyPlanTodayKey(timeZone = DAILY_PLAN_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

export function isDailyPlanToday(planDate: string, timeZone = DAILY_PLAN_TIME_ZONE): boolean {
  return planDate === dailyPlanTodayKey(timeZone);
}
