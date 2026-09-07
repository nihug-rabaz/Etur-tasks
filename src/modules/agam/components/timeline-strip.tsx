"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Drawer } from "@/components/ui/drawer";
import { TimelineDatePicker } from "@/modules/agam/components/timeline-date-picker";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { formatAgamDate } from "@/modules/agam/lib/date-format";
import {
  TIMELINE_EVENT_ICONS,
  TIMELINE_EVENT_LABELS,
  sortTimelineEvents,
  timelineRelativeLabel,
  timelineStatusLabel,
} from "@/modules/agam/lib/timeline-events";
import { panelClass, primaryButtonClass, secondaryButtonClass } from "@/modules/agam/lib/ui";
import type { AgamTimelineEventItem } from "@/modules/agam/types";

function formatTimelineStripDate(value: string | null): string {
  if (!value) return "ללא תאריך";
  const full = formatAgamDate(value);
  if (!full) return "—";
  const [day, month] = full.split("/");
  return day && month ? `${day}/${month}` : full;
}

export function AgamTimelineStrip({
  events,
  canManage = false,
  onEventsChange,
}: {
  events: AgamTimelineEventItem[];
  canManage?: boolean;
  onEventsChange?: (events: AgamTimelineEventItem[]) => void;
}) {
  const [selectedEvent, setSelectedEvent] = useState<AgamTimelineEventItem | null>(null);
  const [editDate, setEditDate] = useState("");
  const [saving, setSaving] = useState(false);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const sorted = useMemo(() => sortTimelineEvents(events), [events]);

  const openEvent = (event: AgamTimelineEventItem) => {
    setSelectedEvent(event);
    setEditDate(event.event_date ? String(event.event_date).slice(0, 10) : "");
  };

  const saveDate = async () => {
    if (!selectedEvent || !canManage) return;
    setSaving(true);
    try {
      const data = await agamFetch<{ event: AgamTimelineEventItem }>(
        `/api/agam/timeline?id=${selectedEvent.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ eventDate: editDate || null, dateOnly: true }),
        },
      );
      const next = events.map((row) => (row.id === data.event.id ? data.event : row));
      onEventsChange?.(next);
      setSelectedEvent(data.event);
      toast.success("התאריך עודכן");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "עדכון התאריך נכשל");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <section className={`${panelClass} relative flex h-full min-h-[22rem] flex-col p-5`}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays size={15} className="text-text-primary" />
            <h2 className="text-sm font-bold text-text-primary">ציר זמן</h2>
            {sorted.length > 0 ? (
              <span className="text-[11px] font-semibold text-text-muted">{sorted.length} אירועים</span>
            ) : null}
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-1 flex-col justify-center py-4 text-center">
            <p className="text-xs leading-relaxed text-text-muted">
              אין אירועים בציר הזמן.
              {canManage ? (
                <>
                  <br />
                  ניהול תבנית ב־
                  <Link
                    href="/agam/admin?tab=timeline"
                    className="font-bold text-text-primary underline-offset-2 hover:underline"
                  >
                    ניהול ← ציר זמן
                  </Link>
                  .
                </>
              ) : null}
            </p>
          </div>
        ) : (
          <div className="agam-timeline-vertical min-h-0 flex-1 overflow-y-auto pe-1">
            <div className="agam-timeline-vertical__rail" aria-hidden />
            {sorted.map((event) => {
              const eventDateValue = event.event_date ? String(event.event_date) : "";
              const status = timelineStatusLabel(eventDateValue || null, today);
              const isPast = status === "עבר";
              const isToday = status === "היום";
              const Icon = TIMELINE_EVENT_ICONS[event.event_type] ?? CalendarDays;
              const relative = timelineRelativeLabel(eventDateValue || null, today);

              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => openEvent(event)}
                  className={`agam-timeline-vertical__item w-full rounded-xl text-start transition hover:bg-surface-2/80 ${
                    isPast ? "opacity-60 hover:opacity-100" : ""
                  }`}
                >
                  <span
                    className={`agam-timeline-vertical__node ${isToday ? "agam-timeline-vertical__node--today" : ""}`}
                  >
                    <Icon size={14} />
                  </span>
                  <span className="min-w-0 pt-0.5">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-[11px] font-bold text-text-muted" dir="ltr">
                        {relative ?? formatTimelineStripDate(eventDateValue || null)}
                      </span>
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                          isPast
                            ? "bg-surface-2 text-text-muted"
                            : "bg-[color:var(--agam-orange-soft)] text-text-primary"
                        }`}
                      >
                        {status}
                      </span>
                      <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold text-text-primary">
                        {TIMELINE_EVENT_LABELS[event.event_type]}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-sm font-extrabold text-text-primary">
                      {event.title}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <Drawer
        open={selectedEvent !== null}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.title ?? "פרטי אירוע"}
        subtitle={
          selectedEvent?.event_date
            ? formatAgamDate(String(selectedEvent.event_date))
            : "ממתין למילוי תאריך"
        }
      >
        {selectedEvent ? (
          <div className="space-y-4">
            {(() => {
              const Icon = TIMELINE_EVENT_ICONS[selectedEvent.event_type] ?? CalendarDays;
              const eventDateValue = selectedEvent.event_date ? String(selectedEvent.event_date) : "";
              const relative = timelineRelativeLabel(eventDateValue || null, today);
              const status = timelineStatusLabel(eventDateValue || null, today);
              return (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="ui-card inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-bold text-text-primary">
                      <Icon size={14} />
                      {TIMELINE_EVENT_LABELS[selectedEvent.event_type]}
                    </span>
                    <span className="ui-card rounded-full bg-surface-2 px-2.5 py-1.5 text-xs font-bold text-text-primary">
                      {status}
                    </span>
                    {relative && relative !== status ? (
                      <span className="ui-card rounded-full bg-surface-2 px-2.5 py-1.5 text-xs font-bold text-text-primary">
                        {relative}
                      </span>
                    ) : null}
                  </div>

                  {canManage ? (
                    <div className="ui-card space-y-3 rounded-2xl bg-surface-2/60 p-4">
                      <p className="text-xs font-bold text-text-muted">עריכת תאריך</p>
                      <TimelineDatePicker value={editDate} onChange={setEditDate} />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={primaryButtonClass}
                          disabled={saving}
                          onClick={() => void saveDate()}
                        >
                          {saving ? "שומר…" : "שמירת תאריך"}
                        </button>
                        {editDate ? (
                          <button
                            type="button"
                            className={secondaryButtonClass}
                            disabled={saving}
                            onClick={() => {
                              setEditDate("");
                            }}
                          >
                            ניקוי תאריך
                          </button>
                        ) : null}
                      </div>
                      <p className="text-xs text-text-muted">
                        שמות אירועים מנוהלים ב־
                        <Link
                          href="/agam/admin?tab=timeline"
                          className="font-bold text-text-primary underline-offset-2 hover:underline"
                        >
                          ניהול ← ציר זמן
                        </Link>
                        .
                      </p>
                    </div>
                  ) : (
                    <div className="ui-card rounded-2xl bg-surface-2/60 p-4">
                      <p className="text-xs font-bold text-text-muted">תאריך</p>
                      <p className="mt-1 text-base font-extrabold text-text-primary" dir="ltr">
                        {eventDateValue ? formatAgamDate(eventDateValue) : "ללא תאריך"}
                      </p>
                    </div>
                  )}

                  {selectedEvent.notes ? (
                    <div className="ui-card rounded-2xl bg-surface-2/60 p-4">
                      <p className="text-xs font-bold text-text-muted">הערות</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
                        {selectedEvent.notes}
                      </p>
                    </div>
                  ) : null}
                </>
              );
            })()}
          </div>
        ) : null}
      </Drawer>
    </>
  );
}
