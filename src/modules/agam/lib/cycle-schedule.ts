import type {
  AgamCycle,
  AgamCycleSchedule,
  AgamCycleScheduleKey,
  AgamDashboardEventType,
  AgamTimelineEventItem,
} from "@/modules/agam/types";
import { sortTimelineEvents, timelineEventDayKey } from "@/modules/agam/lib/timeline-events";

/** Default chronological order of a cycle's track — index is the default position on the timeline. */
export const CYCLE_SCHEDULE_FIELDS: Array<{
  key: AgamCycleScheduleKey;
  label: string;
  eventType: AgamDashboardEventType;
}> = [
  { key: "selection_day", label: "יום מיונים", eventType: "selection_day" },
  { key: "fitness_test", label: "מבחן כושר", eventType: "fitness_test" },
  { key: "prep_day", label: "יום מכין", eventType: "prep_day" },
  { key: "fitness_theory_test", label: "מבחן כושר ומבחן עיוני", eventType: "theory_test" },
  { key: "smach_start", label: "סמ״ח — פתיחה", eventType: "smach" },
  { key: "smach_mikra", label: "מקראות ישראל", eventType: "smach_test" },
  { key: "smach_weapon", label: "נשק", eventType: "smach_test" },
  { key: "smach_run", label: "ריצה", eventType: "smach_test" },
  { key: "smach_pushups", label: "שכיבות סמיכה", eventType: "smach_test" },
  { key: "smach_end", label: "סמ״ח — סיום", eventType: "smach" },
  { key: "bahad1_intake", label: "קליטה לבה״ד 1", eventType: "bahad1" },
];

const SCHEDULE_KEYS = new Set<string>(CYCLE_SCHEDULE_FIELDS.map((field) => field.key));

export function isCycleScheduleKey(value: string): value is AgamCycleScheduleKey {
  return SCHEDULE_KEYS.has(value);
}

export function normalizeCycleSchedule(raw: unknown): AgamCycleSchedule {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const schedule: AgamCycleSchedule = {};
  for (const field of CYCLE_SCHEDULE_FIELDS) {
    const day = timelineEventDayKey(typeof source[field.key] === "string" ? (source[field.key] as string) : null);
    schedule[field.key] = day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
  }
  return schedule;
}

export function scheduleEventId(cycleId: string, key: AgamCycleScheduleKey): string {
  return `schedule:${cycleId}:${key}`;
}

export function parseScheduleEventId(eventId: string): { cycleId: string; key: AgamCycleScheduleKey } | null {
  const match = /^schedule:([0-9a-f-]{36}):([a-z0-9_]+)$/i.exec(eventId);
  if (!match || !isCycleScheduleKey(match[2])) return null;
  return { cycleId: match[1], key: match[2] };
}

export function materializeScheduleEvents(cycle: AgamCycle): AgamTimelineEventItem[] {
  const schedule = normalizeCycleSchedule(cycle.schedule);
  return CYCLE_SCHEDULE_FIELDS.map((field, index) => ({
    id: scheduleEventId(cycle.id, field.key),
    title: field.label,
    event_date: schedule[field.key] ?? null,
    event_type: field.eventType,
    notes: null,
    sort_order: index,
    created_by_id: cycle.created_by_id,
    created_at: cycle.created_at,
    updated_at: cycle.updated_at,
    cycle_id: cycle.id,
    is_template: false,
    schedule_key: field.key,
  }));
}

/** The timeline shows only the fixed cycle schedule. */
export function buildCycleTimelineEvents(cycle: AgamCycle | null): AgamTimelineEventItem[] {
  return sortTimelineEvents(cycle ? materializeScheduleEvents(cycle) : []);
}
