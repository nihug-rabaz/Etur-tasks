"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Check } from "lucide-react";
import { toast } from "sonner";
import { Drawer } from "@/components/ui/drawer";
import { TimelineDatePicker } from "@/modules/agam/components/timeline-date-picker";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { formatAgamDate } from "@/modules/agam/lib/date-format";
import {
  BAHAD1_EMBLEM_SRC,
  TIMELINE_EVENT_ICONS,
  TIMELINE_EVENT_LABELS,
  sortTimelineEvents,
  timelineEventDayKey,
  timelineNodeSize,
  timelineRelativeLabel,
  timelineStatusLabel,
} from "@/modules/agam/lib/timeline-events";
import { primaryButtonClass, secondaryButtonClass } from "@/modules/agam/lib/ui";
import type { AgamCycle, AgamTimelineEventItem } from "@/modules/agam/types";

type TimelineStatus = "עבר" | "נותר" | "היום";

function formatShortDate(value: string | null): string {
  if (!value) return "ללא תאריך";
  return formatAgamDate(value) || "ללא תאריך";
}

export function AgamTimelineStrip({
  events,
  cycle = null,
  cycles = [],
  canManage = false,
  onEventsChange,
  onCycleChange,
}: {
  events: AgamTimelineEventItem[];
  cycle?: AgamCycle | null;
  cycles?: AgamCycle[];
  canManage?: boolean;
  onEventsChange?: (events: AgamTimelineEventItem[]) => void;
  onCycleChange?: (cycleId: string) => void;
}) {
  const [selectedEvent, setSelectedEvent] = useState<AgamTimelineEventItem | null>(null);
  const [dateEvent, setDateEvent] = useState<AgamTimelineEventItem | null>(null);
  const [editDate, setEditDate] = useState("");
  const [saving, setSaving] = useState(false);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const sorted = useMemo(() => sortTimelineEvents(events), [events]);
  const smachSpan = useMemo(() => {
    const start = sorted.findIndex((event) => event.schedule_key === "smach_start");
    const end = sorted.findIndex((event) => event.schedule_key === "smach_end");
    return start >= 0 && end > start ? { start, end } : null;
  }, [sorted]);
  const cycleOptions = useMemo(
    () =>
      [...cycles]
        .filter((row) => !row.archived)
        .sort((a, b) => String(a.cycle_date).localeCompare(String(b.cycle_date))),
    [cycles],
  );

  const counts = useMemo(() => {
    let past = 0;
    let remaining = 0;
    let current = 0;
    for (const event of sorted) {
      const status = timelineStatusLabel(timelineEventDayKey(event.event_date), today);
      if (status === "עבר") past += 1;
      else if (status === "היום") current += 1;
      else remaining += 1;
    }
    return { past, remaining, current };
  }, [sorted, today]);

  const openEvent = (event: AgamTimelineEventItem) => {
    setDateEvent(null);
    setSelectedEvent(event);
    setEditDate(timelineEventDayKey(event.event_date) ?? "");
  };

  const openDateEdit = (event: AgamTimelineEventItem) => {
    if (!canManage) {
      openEvent(event);
      return;
    }
    setSelectedEvent(null);
    setDateEvent(event);
    setEditDate(timelineEventDayKey(event.event_date) ?? "");
  };

  const patchEventDate = async (eventId: string, nextDate: string | null) => {
    const data = await agamFetch<{ event: AgamTimelineEventItem }>(
      `/api/agam/timeline?id=${eventId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          eventDate: nextDate,
          dateOnly: true,
          cycleId: cycle?.id ?? null,
        }),
      },
    );
    const next = events.map((row) => (row.id === data.event.id ? data.event : row));
    onEventsChange?.(next);
    return data.event;
  };

  const saveDate = async (nextDate = editDate) => {
    if (!dateEvent && !selectedEvent) return;
    if (!canManage) return;
    const target = dateEvent ?? selectedEvent;
    if (!target) return;
    setSaving(true);
    try {
      const updated = await patchEventDate(target.id, nextDate || null);
      if (dateEvent) setDateEvent(updated);
      if (selectedEvent?.id === updated.id) setSelectedEvent(updated);
      setEditDate(timelineEventDayKey(updated.event_date) ?? "");
      toast.success("התאריך עודכן");
      if (dateEvent) setDateEvent(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "עדכון התאריך נכשל");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <section className="agam-timeline flex h-full min-h-[22rem] flex-col">
        <header className="agam-timeline__header shrink-0 px-1 pb-3 pt-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-text-muted">
                מסלול המיון
              </p>
              <h2 className="mt-0.5 text-lg font-extrabold tracking-tight text-text-primary">
                לוח זמנים
              </h2>
              {cycle ? (
                <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
                  {cycleOptions.length > 1 && onCycleChange ? (
                    <select
                      className="max-w-full truncate rounded-lg border-0 bg-surface-2 px-2 py-1 text-[11px] font-extrabold text-text-primary"
                      value={cycle.id}
                      onChange={(event) => onCycleChange(event.target.value)}
                      aria-label="בחירת מחזור ללוח הזמנים"
                    >
                      {cycleOptions.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.name}
                          {row.cycle_date ? ` · ${formatAgamDate(row.cycle_date)}` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="truncate text-[11px] font-extrabold text-text-primary">
                      {cycle.name}
                    </span>
                  )}
                  {cycle.cycle_date ? (
                    <span className="text-[11px] font-bold text-text-muted" dir="ltr">
                      {formatAgamDate(cycle.cycle_date)}
                    </span>
                  ) : null}
                </div>
              ) : (
                <p className="mt-1.5 text-[11px] font-bold text-text-muted">
                  אין מחזור פעיל — צרו מחזור כדי לחשב תאריכים
                </p>
              )}
            </div>
          </div>

          {sorted.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="agam-timeline__chip agam-timeline__chip--past">
                {counts.past} עברו
              </span>
              {counts.current > 0 ? (
                <span className="agam-timeline__chip agam-timeline__chip--today">
                  {counts.current} היום
                </span>
              ) : null}
              <span className="agam-timeline__chip agam-timeline__chip--soon">
                {counts.remaining} נותרו
              </span>
            </div>
          ) : null}
        </header>

        {sorted.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 pb-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--agam-orange-soft)] text-text-primary">
              <CalendarDays size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">עדיין אין אירועים</p>
              <p className="mt-1 text-xs leading-relaxed text-text-muted">
                {cycle
                  ? "התאריכים נקבעים בלוח הזמנים של המחזור."
                  : "צרו מחזור כדי להציג את מסלול המיון לפי תאריך המחזור."}
              </p>
            </div>
          </div>
        ) : (
          <div className="agam-timeline__body min-h-0 flex-1 px-1 pb-4 pt-3">
            <ol className="agam-timeline__rail">
              {sorted.map((event, index) => {
                const spanClass =
                  smachSpan && index === smachSpan.start
                    ? "is-span-start"
                    : smachSpan && index === smachSpan.end
                      ? "is-span-end"
                      : smachSpan && index > smachSpan.start && index < smachSpan.end
                        ? "is-span-mid"
                        : "";
                const dayKey = timelineEventDayKey(event.event_date);
                const status = timelineStatusLabel(dayKey, today) as TimelineStatus;
                const next = sorted[index + 1];
                const nextStatus = next
                  ? timelineStatusLabel(timelineEventDayKey(next.event_date), today)
                  : null;
                const linkClass =
                  status !== "עבר"
                    ? ""
                    : nextStatus === "נותר"
                      ? "is-link-active"
                      : "is-link-done";
                const Icon = TIMELINE_EVENT_ICONS[event.event_type] ?? CalendarDays;
                const size = timelineNodeSize(event.event_type);
                const statusClass =
                  status === "עבר"
                    ? "is-past"
                    : status === "היום"
                      ? "is-today"
                      : "is-soon";

                return (
                  <li
                    key={event.id}
                    className={`agam-timeline__item agam-timeline__item--${size} ${statusClass} ${linkClass} ${spanClass}`}
                    style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
                  >
                    <button
                      type="button"
                      className="agam-timeline__node"
                      onClick={() => openEvent(event)}
                      aria-label={`פרטי ${event.title}`}
                    >
                      {size === "xl" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={BAHAD1_EMBLEM_SRC} alt="" className="agam-timeline__emblem" />
                      ) : size === "sm" ? (
                        status === "עבר" ? <Check size={10} strokeWidth={3.5} /> : null
                      ) : status === "עבר" ? (
                        <Check size={14} strokeWidth={3} />
                      ) : (
                        <Icon size={14} />
                      )}
                    </button>

                    <article className="agam-timeline__card">
                      <div className="agam-timeline__meta">
                        <button
                          type="button"
                          className="agam-timeline__date"
                          onClick={() => openDateEdit(event)}
                          title={canManage ? "עדכון תאריך" : undefined}
                          dir="ltr"
                        >
                          {formatShortDate(dayKey)}
                        </button>
                      </div>
                      <button
                        type="button"
                        className="agam-timeline__card-btn"
                        onClick={() => openEvent(event)}
                      >
                        <span className="agam-timeline__type">
                          {TIMELINE_EVENT_LABELS[event.event_type]}
                        </span>
                        <h3 className="agam-timeline__title">{event.title}</h3>
                        {event.notes ? (
                          <p className="agam-timeline__notes">{event.notes}</p>
                        ) : null}
                      </button>
                    </article>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </section>

      <Drawer
        open={dateEvent !== null}
        onClose={() => setDateEvent(null)}
        title="עדכון תאריך"
        subtitle={dateEvent?.title}
      >
        {dateEvent ? (
          <div className="space-y-4">
            <div className="ui-card rounded-2xl bg-surface-2/60 p-4">
              <p className="text-xs font-bold text-text-muted">תאריך נוכחי</p>
              <p className="mt-1 text-base font-extrabold text-text-primary" dir="ltr">
                {dateEvent.event_date
                  ? formatAgamDate(String(dateEvent.event_date))
                  : "ללא תאריך"}
              </p>
            </div>
            <TimelineDatePicker
              value={editDate}
              onChange={(value) => {
                setEditDate(value);
                void (async () => {
                  setSaving(true);
                  try {
                    const updated = await patchEventDate(dateEvent.id, value || null);
                    setDateEvent(null);
                    toast.success(value ? "התאריך עודכן" : "התאריך נוקה");
                    if (selectedEvent?.id === updated.id) setSelectedEvent(updated);
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "עדכון התאריך נכשל");
                  } finally {
                    setSaving(false);
                  }
                })();
              }}
              label="בחרו תאריך חדש"
            />
            {saving ? <p className="text-xs font-semibold text-text-muted">שומר…</p> : null}
          </div>
        ) : null}
      </Drawer>

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
              const eventDateValue = timelineEventDayKey(selectedEvent.event_date) ?? "";
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
                            onClick={() => setEditDate("")}
                          >
                            ניקוי תאריך
                          </button>
                        ) : null}
                      </div>
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
