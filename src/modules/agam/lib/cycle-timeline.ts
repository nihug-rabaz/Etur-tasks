import type { AgamCycle, AgamTimelineEventItem, AgamTimelineTemplate } from "@/modules/agam/types";
import { toDateInputValue } from "@/modules/agam/lib/date-format";
import { timelineEventDayKey } from "@/modules/agam/lib/timeline-events";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Local calendar day (YYYY-MM-DD) — not UTC, so Israel evening stays the correct day. */
export function localTodayKey(now = new Date()): string {
  return toDateInputValue(now);
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function daysBetweenDateKeys(fromKey: string, toKey: string): number {
  const from = new Date(`${fromKey}T00:00:00`);
  const to = new Date(`${toKey}T00:00:00`);
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

/**
 * Cycle relevant for today: preferred id if given, else the next cycle
 * on/after today, else the most recent past cycle.
 */
export function resolveTimelineCycle(
  cycles: AgamCycle[],
  today = localTodayKey(),
  preferredId?: string | null,
): AgamCycle | null {
  const active = cycles
    .filter((cycle) => !cycle.archived)
    .slice()
    .sort((a, b) => toDateInputValue(a.cycle_date).localeCompare(toDateInputValue(b.cycle_date)));
  if (active.length === 0) return null;
  if (preferredId) {
    const preferred = active.find((cycle) => cycle.id === preferredId);
    if (preferred) return preferred;
  }
  const upcoming = active.find((cycle) => toDateInputValue(cycle.cycle_date) >= today);
  return upcoming ?? active[active.length - 1] ?? null;
}

export function templateEventId(templateId: string): string {
  return `template:${templateId}`;
}

export function parseTemplateEventId(eventId: string): string | null {
  return eventId.startsWith("template:") ? eventId.slice("template:".length) : null;
}

export function materializeTemplateEvent(
  template: AgamTimelineTemplate,
  cycle: AgamCycle,
): AgamTimelineEventItem {
  const cycleDate = timelineEventDayKey(cycle.cycle_date) ?? String(cycle.cycle_date).slice(0, 10);
  return {
    id: templateEventId(template.id),
    title: template.title,
    event_date: addDaysToDateKey(cycleDate, template.day_offset),
    event_type: template.event_type,
    notes: template.notes,
    sort_order: template.sort_order,
    created_by_id: template.created_by_id,
    created_at: template.created_at,
    updated_at: template.updated_at,
    cycle_id: cycle.id,
    is_template: true,
    template_id: template.id,
    day_offset: template.day_offset,
  };
}

export function formatDayOffsetLabel(offset: number): string {
  if (offset === 0) return "ביום המחזור";
  if (offset > 0) return `${offset} ימים אחרי תאריך המחזור`;
  return `${Math.abs(offset)} ימים לפני תאריך המחזור`;
}
