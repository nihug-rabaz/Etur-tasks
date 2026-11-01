import type { ComponentType } from "react";
import {
  Activity,
  BookOpenCheck,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  Dumbbell,
  Flag,
  GraduationCap,
  MessageCircle,
  Target,
} from "lucide-react";
import type { AgamTimelineEventItem } from "@/modules/agam/types";

export type AgamDashboardTimelineEventType = AgamTimelineEventItem["event_type"];

export const TIMELINE_EVENT_LABELS: Record<AgamDashboardTimelineEventType, string> = {
  hasbara: "כנס הסברה",
  selection_day: "יום מיונים",
  fitness_test: "מבחן כושר",
  prep_day: "יום מכין",
  theory_test: "כושר ועיוני",
  smach: "סמ״ח",
  smach_test: "מבחן סמ״ח",
  mabdak: "מבדק",
  bahad1: "בה״ד 1",
  general: "כללי",
};

export const TIMELINE_EVENT_ICONS: Record<
  AgamDashboardTimelineEventType,
  ComponentType<{ size?: number; className?: string }>
> = {
  hasbara: MessageCircle,
  selection_day: CalendarCheck,
  fitness_test: Dumbbell,
  prep_day: GraduationCap,
  theory_test: BookOpenCheck,
  smach: Activity,
  smach_test: Target,
  mabdak: ClipboardCheck,
  bahad1: Flag,
  general: CalendarDays,
};

export type TimelineNodeSize = "sm" | "lg" | "xl";

/** Rail node size: בה״ד 1 is the milestone, tests are minor stops, everything else is a full day. */
export function timelineNodeSize(type: AgamDashboardTimelineEventType): TimelineNodeSize {
  if (type === "bahad1") return "xl";
  if (type === "fitness_test" || type === "theory_test" || type === "mabdak" || type === "smach_test") return "sm";
  return "lg";
}

/** Official Bahad 1 emblem (Wikimedia Commons, IDF Spokesperson's Unit, CC BY-SA 3.0). */
export const BAHAD1_EMBLEM_SRC = "/agam/bahad1-emblem.svg";

export function timelineRelativeLabel(dateStr: string | null | undefined, today: string): string | null {
  if (!dateStr) return "נותר";
  if (dateStr === today) return "היום";
  const todayDate = new Date(`${today}T00:00:00`);
  const eventDate = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(todayDate.getTime()) || Number.isNaN(eventDate.getTime())) return null;
  const diff = Math.round((eventDate.getTime() - todayDate.getTime()) / 86_400_000);
  if (diff === 1) return "מחר";
  if (diff === -1) return "אתמול";
  if (diff > 1 && diff <= 14) return `בעוד ${diff} ימים`;
  if (diff < -1 && diff >= -14) return `לפני ${Math.abs(diff)} ימים`;
  if (diff < 0) return "עבר";
  return "נותר";
}

/**
 * Cycle-schedule items keep their default order (sort_order); dated ones swap
 * places among themselves when the dates contradict that order, and undated
 * ones stay in their default slot, anchored to the nearest dated neighbour so
 * other events interleave around them by date.
 */
function scheduleAnchors(events: AgamTimelineEventItem[]): Map<string, { day: string | null; rank: number }> {
  const items = events
    .filter((event) => event.schedule_key)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((event) => ({ event, day: timelineEventDayKey(event.event_date) }));

  const datedByDate = items
    .filter((item) => item.day)
    .sort((a, b) => a.day!.localeCompare(b.day!) || (a.event.sort_order ?? 0) - (b.event.sort_order ?? 0));
  let cursor = 0;
  const ordered = items.map((item) => (item.day ? datedByDate[cursor++] : item));

  const anchors = new Map<string, { day: string | null; rank: number }>();
  ordered.forEach((item, rank) => {
    let day = item.day;
    for (let back = rank - 1; !day && back >= 0; back -= 1) day = ordered[back].day;
    for (let ahead = rank + 1; !day && ahead < ordered.length; ahead += 1) day = ordered[ahead].day;
    anchors.set(item.event.id, { day: day ?? null, rank });
  });
  return anchors;
}

export function sortTimelineEvents(events: AgamTimelineEventItem[]): AgamTimelineEventItem[] {
  const anchors = scheduleAnchors(events);
  const keyOf = (event: AgamTimelineEventItem) => {
    const anchor = anchors.get(event.id);
    if (anchor) return { day: anchor.day ?? "", rank: anchor.rank, schedule: true };
    return { day: timelineEventDayKey(event.event_date) ?? "", rank: Number.POSITIVE_INFINITY, schedule: false };
  };
  return [...events].sort((a, b) => {
    const ka = keyOf(a);
    const kb = keyOf(b);
    if (!ka.day && kb.day) return 1;
    if (ka.day && !kb.day) return -1;
    if (ka.day !== kb.day) return ka.day.localeCompare(kb.day);
    if (ka.schedule !== kb.schedule) return ka.schedule ? -1 : 1;
    if (ka.schedule && kb.schedule) return ka.rank - kb.rank;
    const so = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (so !== 0) return so;
    return String(a.title ?? "").localeCompare(String(b.title ?? ""));
  });
}

export function timelineStatusLabel(dateStr: string | null | undefined, today: string): "עבר" | "נותר" | "היום" {
  if (!dateStr) return "נותר";
  if (dateStr === today) return "היום";
  return dateStr < today ? "עבר" : "נותר";
}

export function timelineEventDayKey(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const text = String(value).trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const date = text.includes("T") ? new Date(text) : new Date(`${text}T00:00:00`);
  if (Number.isNaN(date.getTime())) return text.slice(0, 10) || null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const TIMELINE_EVENT_DOT: Record<AgamDashboardTimelineEventType, string> = {
  hasbara: "bg-sky-400",
  selection_day: "bg-orange-400",
  fitness_test: "bg-amber-400",
  prep_day: "bg-emerald-400",
  theory_test: "bg-indigo-400",
  smach: "bg-violet-400",
  smach_test: "bg-violet-300",
  mabdak: "bg-teal-400",
  bahad1: "bg-rose-400",
  general: "bg-slate-400",
};
