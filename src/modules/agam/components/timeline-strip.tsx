"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Drawer } from "@/components/ui/drawer";
import { TimelineDatePicker } from "@/modules/agam/components/timeline-date-picker";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { formatAgamDate } from "@/modules/agam/lib/date-format";
import {
  TIMELINE_EVENT_ICONS,
  TIMELINE_EVENT_LABELS,
  sortTimelineEvents,
  timelineEventDayKey,
  timelineRelativeLabel,
  timelineStatusLabel,
  type AgamDashboardTimelineEventType,
} from "@/modules/agam/lib/timeline-events";
import {
  fieldClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/modules/agam/lib/ui";
import type { AgamTimelineEventItem } from "@/modules/agam/types";

type CreateDraft = {
  title: string;
  eventDate: string;
  eventType: AgamDashboardTimelineEventType;
  notes: string;
};

const emptyCreateDraft = (): CreateDraft => ({
  title: "",
  eventDate: "",
  eventType: "general",
  notes: "",
});

function formatDayMonth(value: string | null): { day: string; month: string } | null {
  if (!value) return null;
  const full = formatAgamDate(value);
  if (!full) return null;
  const [day, month] = full.split("/");
  if (!day || !month) return null;
  return { day, month };
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
  const [dateEvent, setDateEvent] = useState<AgamTimelineEventItem | null>(null);
  const [editDate, setEditDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState<CreateDraft>(emptyCreateDraft);
  const [saving, setSaving] = useState(false);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const sorted = useMemo(() => sortTimelineEvents(events), [events]);

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

  const openCreate = () => {
    setSelectedEvent(null);
    setDateEvent(null);
    setCreateDraft(emptyCreateDraft());
    setCreating(true);
  };

  const patchEventDate = async (eventId: string, nextDate: string | null) => {
    const data = await agamFetch<{ event: AgamTimelineEventItem }>(
      `/api/agam/timeline?id=${eventId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ eventDate: nextDate, dateOnly: true }),
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

  const submitCreate = async () => {
    if (!canManage) return;
    const title = createDraft.title.trim();
    if (!title) {
      toast.error("נא למלא נושא לאירוע");
      return;
    }
    setSaving(true);
    try {
      const data = await agamFetch<{ event: AgamTimelineEventItem }>("/api/agam/timeline", {
        method: "POST",
        body: JSON.stringify({
          title,
          eventDate: createDraft.eventDate || null,
          eventType: createDraft.eventType,
          notes: createDraft.notes.trim() || null,
        }),
      });
      onEventsChange?.(sortTimelineEvents([...events, data.event]));
      setCreating(false);
      setCreateDraft(emptyCreateDraft());
      toast.success("האירוע נוסף לציר הזמן");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "הוספת האירוע נכשלה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <section
        className="relative mt-2 flex h-full min-h-[22rem] flex-col rounded-[1.25rem]"
        style={{
          background: "#c4b8a5",
          padding: "18px 10px 10px",
          boxShadow: "0 18px 40px -22px rgba(60,40,20,0.45)",
        }}
      >
        {/* Top spiral binding */}
        <div className="pointer-events-none absolute inset-x-5 top-0 z-20 flex -translate-y-1/2 justify-between" aria-hidden>
          {Array.from({ length: 7 }).map((_, index) => (
            <span
              key={index}
              className="block h-3.5 w-3.5 rounded-full border-[2.5px] border-[#8e96a8]"
              style={{
                background: "linear-gradient(145deg, #f2f4f8 0%, #a0a8b8 45%, #6d7588 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7), 0 1px 2px rgba(0,0,0,0.35)",
              }}
            />
          ))}
        </div>

        {/* Paper sheet */}
        <div
          className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-black/10"
          style={{ backgroundColor: "#fff8ec" }}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-rose-200/80 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-1 shadow-sm">
                <CalendarDays size={14} className="text-rose-500" />
                <span className="text-sm font-extrabold text-stone-800">פנקס זמנים</span>
              </span>
              {sorted.length > 0 ? (
                <span className="text-[11px] font-bold text-sky-700">{sorted.length} רשומות</span>
              ) : null}
            </div>
            {canManage ? (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-accent-primary px-2.5 text-[11px] font-extrabold text-white transition hover:brightness-105"
                aria-label="הוספת אירוע לציר הזמן"
              >
                <Plus size={14} strokeWidth={2.5} />
                הוסף
              </button>
            ) : null}
          </div>

          {sorted.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-500">
                <CalendarDays size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-stone-800">הפנקס ריק עדיין</p>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">
                  {canManage
                    ? "הוסיפו אירוע ראשון — כנס, יום מיונים או ציון דרך."
                    : "כשיתווספו אירועים הם יופיעו כאן."}
                </p>
              </div>
              {canManage ? (
                <button type="button" className={primaryButtonClass} onClick={openCreate}>
                  <Plus size={15} />
                  הוספת אירוע
                </button>
              ) : null}
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-2">
              <div className="relative">
                <div
                  className="pointer-events-none absolute bottom-3 top-3 w-px bg-stone-300/80"
                  style={{ insetInlineStart: "1.05rem" }}
                  aria-hidden
                />
                <ul className="flex flex-col">
                  {sorted.map((event) => {
                    const dayKey = timelineEventDayKey(event.event_date);
                    const status = timelineStatusLabel(dayKey, today);
                    const isPast = status === "עבר";
                    const isToday = status === "היום";
                    const Icon = TIMELINE_EVENT_ICONS[event.event_type] ?? CalendarDays;
                    const relative = timelineRelativeLabel(dayKey, today);
                    const stamp = formatDayMonth(dayKey);

                    return (
                      <li
                        key={event.id}
                        className={`grid grid-cols-[2.15rem_minmax(0,1fr)] items-start gap-2.5 rounded-lg px-0.5 py-2 transition hover:bg-white/70 ${
                          isPast ? "opacity-60 hover:opacity-100" : ""
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => openEvent(event)}
                          className={`relative z-[1] flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-sm ${
                            isToday ? "border-orange-300 bg-orange-50 text-orange-700" : ""
                          }`}
                          aria-label={`פרטי ${event.title}`}
                        >
                          <Icon size={13} />
                        </button>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openDateEdit(event)}
                              className={`relative inline-flex min-w-[2rem] flex-col overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm ${
                                canManage ? "cursor-pointer hover:-rotate-1" : ""
                              }`}
                              title={canManage ? "עדכון תאריך" : undefined}
                            >
                              {stamp ? (
                                <>
                                  <span
                                    className="w-full px-1 py-0.5 text-center text-[9px] font-extrabold leading-none text-white"
                                    style={{ background: "#e11d48" }}
                                    dir="ltr"
                                  >
                                    {stamp.month}
                                  </span>
                                  <span
                                    className="px-1 py-1 text-center text-[12px] font-black leading-none text-stone-800"
                                    dir="ltr"
                                  >
                                    {stamp.day}
                                  </span>
                                </>
                              ) : (
                                <span className="px-1 py-2 text-[9px] font-bold text-stone-400">—</span>
                              )}
                              {canManage ? (
                                <Pencil
                                  size={8}
                                  className="absolute -left-0.5 -top-0.5 rounded-full bg-white p-px text-stone-500 opacity-70 shadow"
                                />
                              ) : null}
                            </button>
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                                isPast ? "bg-stone-200/80 text-stone-500" : "bg-orange-100 text-orange-800"
                              }`}
                            >
                              {relative && relative !== "נותר" && relative !== "עבר" ? relative : status}
                            </span>
                            <span className="rounded-md bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-900">
                              {TIMELINE_EVENT_LABELS[event.event_type]}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => openEvent(event)}
                            className="mt-1 block w-full truncate text-start text-sm font-extrabold text-stone-800"
                          >
                            {event.title}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </div>
      </section>

      <Drawer
        open={creating}
        onClose={() => setCreating(false)}
        title="אירוע חדש"
        subtitle="יופיע מיד בציר הזמן"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold text-text-secondary">נושא האירוע</label>
            <input
              className={fieldClass}
              value={createDraft.title}
              onChange={(e) => setCreateDraft({ ...createDraft, title: e.target.value })}
              placeholder="לדוגמה: כנס הסברה מחזור אביב"
              autoFocus
            />
          </div>
          <TimelineDatePicker
            value={createDraft.eventDate}
            onChange={(eventDate) => setCreateDraft({ ...createDraft, eventDate })}
            label="תאריך"
          />
          <div>
            <label className="mb-2 block text-xs font-bold text-text-secondary">סוג אירוע</label>
            <select
              className={`${fieldClass} min-h-[3rem] py-3 font-bold`}
              value={createDraft.eventType}
              onChange={(e) =>
                setCreateDraft({
                  ...createDraft,
                  eventType: e.target.value as AgamDashboardTimelineEventType,
                })
              }
            >
              {Object.entries(TIMELINE_EVENT_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold text-text-secondary">הערות (אופציונלי)</label>
            <textarea
              rows={3}
              className={`${fieldClass} min-h-[5rem] resize-y py-3 text-sm leading-relaxed`}
              value={createDraft.notes}
              onChange={(e) => setCreateDraft({ ...createDraft, notes: e.target.value })}
              placeholder="מיקום, שעה, הוראות לצוות…"
            />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              className={primaryButtonClass}
              disabled={saving}
              onClick={() => void submitCreate()}
            >
              {saving ? "מוסיף…" : "הוספה לציר הזמן"}
            </button>
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={saving}
              onClick={() => setCreating(false)}
            >
              ביטול
            </button>
          </div>
        </div>
      </Drawer>

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
