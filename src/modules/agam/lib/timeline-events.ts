import type { ComponentType } from "react";
import {
  Activity,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  Flag,
  GraduationCap,
  MessageCircle,
} from "lucide-react";
import type { AgamTimelineEventItem } from "@/modules/agam/types";

export type AgamDashboardTimelineEventType = AgamTimelineEventItem["event_type"];

export const TIMELINE_EVENT_LABELS: Record<AgamDashboardTimelineEventType, string> = {
  hasbara: "כנס הסברה",
  selection_day: "יום מיונים",
  prep_day: "יום מכין",
  smach: "סמ״ח",
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
  prep_day: GraduationCap,
  smach: Activity,
  mabdak: ClipboardCheck,
  bahad1: Flag,
  general: CalendarDays,
};

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

export function sortTimelineEvents(events: AgamTimelineEventItem[]): AgamTimelineEventItem[] {
  return [...events].sort((a, b) => {
    const so = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (so !== 0) return so;
    const da = String(a.event_date ?? "");
    const db = String(b.event_date ?? "");
    if (!da && db) return 1;
    if (da && !db) return -1;
    if (da !== db) return da.localeCompare(db);
    return String(a.title ?? "").localeCompare(String(b.title ?? ""));
  });
}

export function timelineStatusLabel(dateStr: string | null | undefined, today: string): "עבר" | "נותר" | "היום" {
  if (!dateStr) return "נותר";
  if (dateStr === today) return "היום";
  return dateStr < today ? "עבר" : "נותר";
}
