"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { TimelineDatePicker } from "@/modules/agam/components/timeline-date-picker";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { formatAgamDate } from "@/modules/agam/lib/date-format";
import {
  TIMELINE_EVENT_ICONS,
  TIMELINE_EVENT_LABELS,
  sortTimelineEvents,
  timelineRelativeLabel,
  type AgamDashboardTimelineEventType,
} from "@/modules/agam/lib/timeline-events";
import {
  dangerChipClass,
  dividerClass,
  fieldClass,
  iconChipClass,
  panelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/modules/agam/lib/ui";
import type { AgamTimelineEventItem } from "@/modules/agam/types";

type EventDraft = {
  title: string;
  eventDate: string;
  eventType: AgamDashboardTimelineEventType;
  notes: string;
};

const emptyDraft = (): EventDraft => ({
  title: "",
  eventDate: "",
  eventType: "general",
  notes: "",
});

function eventToDraft(event: AgamTimelineEventItem): EventDraft {
  return {
    title: event.title,
    eventDate: String(event.event_date || ""),
    eventType: event.event_type,
    notes: event.notes ?? "",
  };
}

function EventFormFields({
  draft,
  onChange,
}: {
  draft: EventDraft;
  onChange: (next: EventDraft) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="mb-2 block text-xs font-bold text-text-secondary">נושא האירוע</label>
        <input
          className={fieldClass}
          value={draft.title}
          onChange={(e) => onChange({ ...draft, title: e.target.value })}
          placeholder="לדוגמה: כנס הסברה מחזור אביב"
        />
      </div>
      <div>
          <TimelineDatePicker
          value={draft.eventDate}
          onChange={(eventDate) => onChange({ ...draft, eventDate })}
          label="תאריך (אופציונלי)"
        />
      </div>
      <div>
        <label className="mb-2 block text-xs font-bold text-text-secondary">סוג אירוע</label>
        <select
          className={`${fieldClass} min-h-[3.25rem] py-3 font-bold`}
          value={draft.eventType}
          onChange={(e) =>
            onChange({ ...draft, eventType: e.target.value as AgamDashboardTimelineEventType })
          }
        >
          {Object.entries(TIMELINE_EVENT_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="mb-2 block text-xs font-bold text-text-secondary">הערות (אופציונלי)</label>
        <textarea
          rows={3}
          className={`${fieldClass} min-h-[5.5rem] resize-y py-3 text-sm leading-relaxed`}
          value={draft.notes}
          onChange={(e) => onChange({ ...draft, notes: e.target.value })}
          placeholder="מיקום, שעה, הוראות לצוות…"
        />
      </div>
    </div>
  );
}

export function TimelineEventsSettings() {
  const [events, setEvents] = useState<AgamTimelineEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createDraft, setCreateDraft] = useState<EventDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EventDraft>(emptyDraft);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const load = async () => {
    try {
      const data = await agamFetch<{ events: AgamTimelineEventItem[] }>("/api/agam/timeline");
      setEvents(data.events ?? []);
    } catch {
      toast.error("טעינת אירועי ציר הזמן נכשלה");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const sorted = useMemo(() => sortTimelineEvents(events), [events]);

  const upcomingCount = useMemo(
    () => sorted.filter((event) => String(event.event_date || "") >= today).length,
    [sorted, today],
  );

  const submitCreate = async () => {
    setSaving(true);
    try {
      await agamFetch("/api/agam/timeline", {
        method: "POST",
        body: JSON.stringify({
          title: createDraft.title.trim(),
          eventDate: createDraft.eventDate || null,
          eventType: createDraft.eventType,
          notes: createDraft.notes.trim() || null,
        }),
      });
      toast.success("האירוע נוסף לציר הזמן");
      setCreateDraft(emptyDraft());
      setShowCreate(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async (id: string) => {
    setSaving(true);
    try {
      await agamFetch(`/api/agam/timeline?id=${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editDraft.title.trim(),
          eventDate: editDraft.eventDate || null,
          eventType: editDraft.eventType,
          notes: editDraft.notes.trim() || null,
        }),
      });
      toast.success("האירוע עודכן");
      setEditingId(null);
      setConfirmDeleteId(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "עדכון נכשל");
    } finally {
      setSaving(false);
    }
  };

  const submitDelete = async (id: string) => {
    setSaving(true);
    try {
      await agamFetch(`/api/agam/timeline?id=${id}`, { method: "DELETE" });
      toast.success("האירוע נמחק");
      setConfirmDeleteId(null);
      if (editingId === id) setEditingId(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "מחיקה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-text-muted">טוען אירועים…</p>;
  }

  return (
    <div className="space-y-5">
      <section className={`${panelClass} overflow-hidden`}>
        <div className="relative px-6 py-6 sm:px-8">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.55]"
            style={{
              background:
                "radial-gradient(ellipse 70% 90% at 100% 0%, color-mix(in srgb, var(--accent-primary) 14%, transparent), transparent 55%)",
            }}
            aria-hidden
          />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-xl">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1 text-[11px] font-bold text-text-primary">
                <CalendarDays size={13} />
                ניהול ציר זמן
              </div>
              <h2 className="text-xl font-extrabold text-text-primary sm:text-2xl">תאריכי אירועים</h2>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                הגדירו כאן את אירועי המדור — כנסים, ימי מיונים, סמ״ח ועוד. התאריכים יופיעו אוטומטית
                בציר הזמן הראשי בדף הבית, בלי יצירה משם.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <div className="rounded-2xl bg-surface-2 px-4 py-3 text-center">
                <p className="text-[11px] font-bold text-text-muted">סה״כ</p>
                <p className="text-2xl font-extrabold text-text-primary">{sorted.length}</p>
              </div>
              <div className="rounded-2xl bg-surface-2 px-4 py-3 text-center">
                <p className="text-[11px] font-bold text-text-muted">קרובים</p>
                <p className="text-2xl font-extrabold text-text-primary">{upcomingCount}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {!showCreate ? (
        <div className="flex justify-start">
          <button
            type="button"
            className={primaryButtonClass}
            onClick={() => {
              setShowCreate(true);
              setCreateDraft(emptyDraft());
              setEditingId(null);
              setConfirmDeleteId(null);
            }}
          >
            <Plus size={16} />
            הוספת אירוע
          </button>
        </div>
      ) : (
        <section className={`${panelClass} space-y-4 p-6`}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-extrabold text-text-primary">אירוע חדש</h3>
            <button
              type="button"
              className={iconChipClass}
              onClick={() => {
                setShowCreate(false);
                setCreateDraft(emptyDraft());
              }}
              aria-label="סגירה"
            >
              <X size={16} />
            </button>
          </div>
          <EventFormFields draft={createDraft} onChange={setCreateDraft} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={primaryButtonClass}
              disabled={saving || createDraft.title.trim().length < 2}
              onClick={() => void submitCreate()}
            >
              <Check size={16} />
              {saving ? "שומר…" : "שמירה לציר הזמן"}
            </button>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => {
                setShowCreate(false);
                setCreateDraft(emptyDraft());
              }}
            >
              ביטול
            </button>
          </div>
        </section>
      )}

      <section className={`${panelClass} overflow-hidden`}>
        {sorted.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-text-primary">
              <CalendarDays size={22} />
            </div>
            <p className="text-sm font-bold text-text-primary">אין אירועים עדיין</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-text-muted">
              הוסיפו תאריך ראשון — הוא יופיע מיד בציר הזמן הראשי של קצינים.
            </p>
          </div>
        ) : (
          <ul>
            {sorted.map((event, index) => {
              const Icon = TIMELINE_EVENT_ICONS[event.event_type] ?? CalendarDays;
              const eventDateValue = String(event.event_date || "");
              const isPast = eventDateValue < today;
              const relative = timelineRelativeLabel(eventDateValue, today);
              const isEditing = editingId === event.id;

              return (
                <li key={event.id} className={index === 0 ? undefined : dividerClass}>
                  <div className={`px-5 py-4 sm:px-6 ${isPast ? "opacity-75" : ""}`}>
                    {isEditing ? (
                      <div className="space-y-4">
                        <EventFormFields draft={editDraft} onChange={setEditDraft} />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={primaryButtonClass}
                            disabled={saving || editDraft.title.trim().length < 2}
                            onClick={() => void submitEdit(event.id)}
                          >
                            <Check size={16} />
                            {saving ? "שומר…" : "שמירת שינויים"}
                          </button>
                          <button
                            type="button"
                            className={secondaryButtonClass}
                            onClick={() => {
                              setEditingId(null);
                              setConfirmDeleteId(null);
                            }}
                          >
                            ביטול
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-text-primary">
                            <Icon size={18} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-lg bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-text-primary">
                                {TIMELINE_EVENT_LABELS[event.event_type]}
                              </span>
                              <span className="text-[11px] font-bold text-text-muted" dir="ltr">
                                {formatAgamDate(eventDateValue)}
                              </span>
                              {relative ? (
                                <span className="rounded-full bg-accent-primary/12 px-2 py-0.5 text-[10px] font-bold text-text-primary">
                                  {relative}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 truncate text-sm font-extrabold text-text-primary">{event.title}</p>
                            {event.notes ? (
                              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-secondary">
                                {event.notes}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            className={iconChipClass}
                            onClick={() => {
                              setShowCreate(false);
                              setEditingId(event.id);
                              setEditDraft(eventToDraft(event));
                              setConfirmDeleteId(null);
                            }}
                            aria-label="עריכה"
                          >
                            <Pencil size={14} />
                          </button>
                          {confirmDeleteId === event.id ? (
                            <>
                              <button
                                type="button"
                                className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                                disabled={saving}
                                onClick={() => void submitDelete(event.id)}
                              >
                                {saving ? "מוחק…" : "אישור מחיקה"}
                              </button>
                              <button
                                type="button"
                                className={secondaryButtonClass}
                                onClick={() => setConfirmDeleteId(null)}
                              >
                                ביטול
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className={dangerChipClass}
                              onClick={() => setConfirmDeleteId(event.id)}
                            >
                              <Trash2 size={14} />
                              מחיקה
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
