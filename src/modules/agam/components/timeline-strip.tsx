"use client";

import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  Activity,
  CalendarDays,
  CalendarCheck,
  ClipboardCheck,
  Flag,
  GraduationCap,
  MessageCircle,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Drawer } from "@/components/ui/drawer";
import { TimelineDatePicker } from "@/modules/agam/components/timeline-date-picker";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { formatAgamDate } from "@/modules/agam/lib/date-format";
import { canModifyTimelineEvent } from "@/modules/agam/lib/permissions";
import { dividerTopClass, fieldClass, panelClass, primaryButtonClass, secondaryButtonClass } from "@/modules/agam/lib/ui";
import type { AgamTimelineEventItem } from "@/modules/agam/types";
import type { ModuleRole } from "@/shared/modules/types";

const TIMELINE_EVENT_LABELS: Record<AgamTimelineEventItem["event_type"], string> = {
  hasbara: "כנס הסברה",
  selection_day: "יום מיונים",
  prep_day: "יום מכין",
  smach: "סמ״ח",
  mabdak: "מבדק",
  bahad1: "בה״ד 1",
  general: "כללי",
};

const TIMELINE_EVENT_TONES: Record<
  AgamTimelineEventItem["event_type"],
  { badge: string; node: string; ring: string }
> = {
  hasbara: {
    badge: "bg-sky-500/12 text-sky-700 dark:text-sky-200",
    node: "text-sky-600 dark:text-sky-300",
    ring: "ring-sky-400/55",
  },
  selection_day: {
    badge: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-200",
    node: "text-indigo-600 dark:text-indigo-300",
    ring: "ring-indigo-400/55",
  },
  prep_day: {
    badge: "bg-teal-500/12 text-teal-700 dark:text-teal-200",
    node: "text-teal-600 dark:text-teal-300",
    ring: "ring-teal-400/55",
  },
  smach: {
    badge: "bg-purple-500/12 text-purple-700 dark:text-purple-200",
    node: "text-purple-600 dark:text-purple-300",
    ring: "ring-purple-400/55",
  },
  mabdak: {
    badge: "bg-amber-500/12 text-amber-800 dark:text-amber-200",
    node: "text-amber-700 dark:text-amber-300",
    ring: "ring-amber-400/55",
  },
  bahad1: {
    badge: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-200",
    node: "text-emerald-600 dark:text-emerald-300",
    ring: "ring-emerald-400/55",
  },
  general: {
    badge: "bg-surface-2 text-text-secondary",
    node: "text-accent-primary",
    ring: "ring-accent-primary/45",
  },
};

const TIMELINE_EVENT_ICONS: Record<
  AgamTimelineEventItem["event_type"],
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

function timelineRelativeLabel(dateStr: string, today: string): string | null {
  if (!dateStr) return null;
  if (dateStr === today) return "היום";
  const todayDate = new Date(`${today}T00:00:00`);
  const eventDate = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(todayDate.getTime()) || Number.isNaN(eventDate.getTime())) return null;
  const diff = Math.round((eventDate.getTime() - todayDate.getTime()) / 86_400_000);
  if (diff === 1) return "מחר";
  if (diff === -1) return "אתמול";
  if (diff > 1 && diff <= 14) return `בעוד ${diff} ימים`;
  if (diff < -1 && diff >= -14) return `לפני ${Math.abs(diff)} ימים`;
  return null;
}

function TimelineFieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="mb-2 block text-xs font-bold text-text-secondary">{children}</span>;
}

function TimelineTitleField({
  value,
  onChange,
  placeholder = "נושא האירוע",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <TimelineFieldLabel>נושא</TimelineFieldLabel>
      <input
        className={fieldClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function TimelineTypeField({
  value,
  onChange,
}: {
  value: AgamTimelineEventItem["event_type"];
  onChange: (value: AgamTimelineEventItem["event_type"]) => void;
}) {
  return (
    <div>
      <TimelineFieldLabel>סוג אירוע</TimelineFieldLabel>
      <select
        className={`${fieldClass} min-h-[3.75rem] py-3.5 text-base font-bold`}
        value={value}
        onChange={(e) => onChange(e.target.value as AgamTimelineEventItem["event_type"])}
      >
        {Object.entries(TIMELINE_EVENT_LABELS).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}

function TimelineNotesField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <TimelineFieldLabel>הערות</TimelineFieldLabel>
      <textarea
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="פרטים נוספים, מיקום, הוראות..."
        className={`${fieldClass} min-h-[6.5rem] resize-y py-3 text-sm leading-relaxed`}
      />
    </div>
  );
}

function formatTimelineStripDate(value: string): string {
  const full = formatAgamDate(value);
  if (!full) return "—";
  const [day, month] = full.split("/");
  return day && month ? `${day}/${month}` : full;
}

type TimelineDrawerMode = "view" | "edit" | "create" | null;

export function AgamTimelineStrip({
  events,
  canEdit,
  currentUserId,
  role,
  onChanged,
}: {
  events: AgamTimelineEventItem[];
  canEdit: boolean;
  currentUserId: string;
  role: ModuleRole | null;
  onChanged: () => void;
}) {
  const [drawerMode, setDrawerMode] = useState<TimelineDrawerMode>(null);
  const [selectedEvent, setSelectedEvent] = useState<AgamTimelineEventItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  const [createTitle, setCreateTitle] = useState("");
  const [createDate, setCreateDate] = useState("");
  const [createType, setCreateType] = useState<AgamTimelineEventItem["event_type"]>("general");
  const [createNotes, setCreateNotes] = useState("");

  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editType, setEditType] = useState<AgamTimelineEventItem["event_type"]>("general");
  const [editNotes, setEditNotes] = useState("");

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const canModify = (event: AgamTimelineEventItem) =>
    canModifyTimelineEvent(role, event.created_by_id, currentUserId);

  const sorted = useMemo(
    () =>
      [...events].sort((a, b) => {
        const da = String(a.event_date ?? "");
        const db = String(b.event_date ?? "");
        if (da !== db) return da.localeCompare(db);
        return String(a.title ?? "").localeCompare(String(b.title ?? ""));
      }),
    [events],
  );

  const closeDrawer = () => {
    setDrawerMode(null);
    setSelectedEvent(null);
    setConfirmDelete(false);
    setCreateTitle("");
    setCreateDate("");
    setCreateType("general");
    setCreateNotes("");
  };

  const openView = (event: AgamTimelineEventItem) => {
    setSelectedEvent(event);
    setDrawerMode("view");
    setConfirmDelete(false);
  };

  const openCreate = () => {
    setSelectedEvent(null);
    setDrawerMode("create");
    setCreateTitle("");
    setCreateDate("");
    setCreateType("general");
    setCreateNotes("");
  };

  const openEdit = (event: AgamTimelineEventItem) => {
    setSelectedEvent(event);
    setEditTitle(event.title);
    setEditDate(event.event_date || "");
    setEditType(event.event_type);
    setEditNotes(event.notes ?? "");
    setDrawerMode("edit");
    setConfirmDelete(false);
  };

  const submitCreate = async () => {
    setSaving(true);
    try {
      await agamFetch("/api/agam/timeline", {
        method: "POST",
        body: JSON.stringify({
          title: createTitle,
          eventDate: createDate,
          eventType: createType,
          notes: createNotes.trim() || null,
        }),
      });
      toast.success("האירוע נוסף");
      closeDrawer();
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async () => {
    if (!selectedEvent) return;
    setSaving(true);
    try {
      await agamFetch(`/api/agam/timeline?id=${selectedEvent.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editTitle,
          eventDate: editDate,
          eventType: editType,
          notes: editNotes || null,
        }),
      });
      toast.success("האירוע עודכן");
      closeDrawer();
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "עדכון נכשל");
    } finally {
      setSaving(false);
    }
  };

  const submitDelete = async () => {
    if (!selectedEvent) return;
    setSaving(true);
    try {
      await agamFetch(`/api/agam/timeline?id=${selectedEvent.id}`, { method: "DELETE" });
      toast.success("האירוע נמחק");
      closeDrawer();
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "מחיקה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  const drawerOpen = drawerMode !== null;
  const viewEvent = drawerMode === "view" || drawerMode === "edit" ? selectedEvent : null;

  return (
    <>
      <section className={`${panelClass} relative p-5`}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays size={15} className="text-accent-primary" />
            <h2 className="text-sm font-bold text-text-secondary">ציר זמן</h2>
            {sorted.length > 0 ? (
              <span className="text-[11px] font-semibold text-text-muted">{sorted.length} אירועים</span>
            ) : null}
          </div>
          {canEdit ? (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-accent-primary/10 px-2.5 text-xs font-bold text-accent-primary transition hover:bg-accent-primary/15"
            >
              <Plus size={14} />
              אירוע
            </button>
          ) : null}
        </div>

        {sorted.length === 0 ? (
          <p className="py-2 text-xs text-text-muted">אין אירועים — לחצו «אירוע» להוספה.</p>
        ) : (
          <div className="agam-timeline-scroll -mx-1 overflow-x-auto px-1 pb-1">
            <div className="relative flex min-w-max items-start py-2">
              <div className="agam-timeline-track pointer-events-none" aria-hidden />
              {sorted.map((event, index) => {
                const eventDateValue = String(event.event_date || "");
                const isPast = eventDateValue < today;
                const isToday = eventDateValue === today;
                const Icon = TIMELINE_EVENT_ICONS[event.event_type] ?? CalendarDays;
                const tones = TIMELINE_EVENT_TONES[event.event_type] ?? TIMELINE_EVENT_TONES.general;
                const relative = timelineRelativeLabel(eventDateValue, today);
                const isLast = index === sorted.length - 1;

                return (
                  <div key={event.id} className="agam-timeline-node flex shrink-0 items-start">
                    <button
                      type="button"
                      onClick={() => openView(event)}
                      className="group flex w-[5.25rem] flex-col items-center gap-1 px-1.5 text-center transition sm:w-[6.25rem]"
                    >
                      <div
                        className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-background transition group-hover:scale-105 ${
                          isToday
                            ? "bg-accent-primary text-white ring-accent-primary/30 shadow-[0_0_0_3px_rgba(139,92,246,0.2)]"
                            : `bg-surface-1 shadow-[0_0_0_2px_var(--surface-1)] ${tones.node} ${tones.ring}`
                        }`}
                      >
                        <Icon size={15} />
                        {isToday ? (
                          <span className="absolute -top-0.5 -end-0.5 h-2 w-2 rounded-full bg-accent-secondary ring-2 ring-background" />
                        ) : null}
                      </div>
                      <span
                        className={`text-[10px] font-bold text-text-muted ${isPast ? "opacity-70" : ""}`}
                        dir="ltr"
                      >
                        {relative ?? formatTimelineStripDate(eventDateValue)}
                      </span>
                      <span
                        className={`line-clamp-2 min-h-[2rem] text-[11px] font-extrabold leading-tight text-text-primary group-hover:text-accent-primary ${
                          isPast ? "opacity-70 group-hover:opacity-100" : ""
                        }`}
                      >
                        {event.title}
                      </span>
                    </button>
                    {!isLast ? (
                      <div
                        className="relative z-0 mt-[1.05rem] w-4 shrink-0 border-t-2 border-dashed border-accent-primary/35 sm:w-5 dark:border-accent-primary/45"
                        aria-hidden
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={
          drawerMode === "create"
            ? "אירוע חדש"
            : drawerMode === "edit"
              ? "עריכת אירוע"
              : viewEvent?.title ?? "פרטי אירוע"
        }
        subtitle={
          drawerMode === "create"
            ? "הוספה לציר הזמן"
            : viewEvent
              ? formatAgamDate(String(viewEvent.event_date || ""))
              : undefined
        }
      >
        {drawerMode === "create" ? (
          <div className="space-y-4">
            <TimelineTitleField value={createTitle} onChange={setCreateTitle} />
            <TimelineDatePicker value={createDate} onChange={setCreateDate} />
            <TimelineTypeField value={createType} onChange={setCreateType} />
            <TimelineNotesField value={createNotes} onChange={setCreateNotes} />
            <button
              type="button"
              className={`${primaryButtonClass} w-full`}
              disabled={saving || createTitle.trim().length < 2 || !createDate}
              onClick={() => void submitCreate()}
            >
              {saving ? "שומר..." : "הוספה"}
            </button>
          </div>
        ) : null}

        {drawerMode === "edit" && selectedEvent ? (
          <div className="space-y-4">
            <TimelineTitleField value={editTitle} onChange={setEditTitle} placeholder="כותרת האירוע" />
            <TimelineDatePicker value={editDate} onChange={setEditDate} />
            <TimelineTypeField value={editType} onChange={setEditType} />
            <TimelineNotesField value={editNotes} onChange={setEditNotes} />
            <div className="flex gap-2">
              <button type="button" className={`${primaryButtonClass} flex-1`} disabled={saving} onClick={() => void submitEdit()}>
                {saving ? "שומר..." : "שמירה"}
              </button>
              <button type="button" className={secondaryButtonClass} onClick={() => setDrawerMode("view")}>
                ביטול
              </button>
            </div>
          </div>
        ) : null}

        {drawerMode === "view" && viewEvent ? (
          <div className="space-y-4">
            {(() => {
              const Icon = TIMELINE_EVENT_ICONS[viewEvent.event_type] ?? CalendarDays;
              const tones = TIMELINE_EVENT_TONES[viewEvent.event_type] ?? TIMELINE_EVENT_TONES.general;
              const eventDateValue = String(viewEvent.event_date || "");
              const relative = timelineRelativeLabel(eventDateValue, today);
              return (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${tones.badge}`}>
                      <Icon size={14} />
                      {TIMELINE_EVENT_LABELS[viewEvent.event_type]}
                    </span>
                    {relative ? (
                      <span className="rounded-full bg-accent-primary/12 px-2.5 py-1 text-xs font-bold text-accent-primary">
                        {relative}
                      </span>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-text-muted">תאריך</p>
                    <p className="mt-1 text-base font-extrabold text-text-primary" dir="ltr">
                      {formatAgamDate(eventDateValue)}
                    </p>
                  </div>
                  {viewEvent.notes ? (
                    <div>
                      <p className="text-xs font-bold text-text-muted">הערות</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">{viewEvent.notes}</p>
                    </div>
                  ) : null}
                </>
              );
            })()}

            {canModify(viewEvent) ? (
              <div className={`flex flex-wrap gap-2 pt-4 ${dividerTopClass}`}>
                <button type="button" className={secondaryButtonClass} onClick={() => openEdit(viewEvent)}>
                  <Pencil size={14} />
                  עריכה
                </button>
                {confirmDelete ? (
                  <>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                      disabled={saving}
                      onClick={() => void submitDelete()}
                    >
                      {saving ? "מוחק..." : "אישור מחיקה"}
                    </button>
                    <button type="button" className={secondaryButtonClass} onClick={() => setConfirmDelete(false)}>
                      ביטול
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-rose-600 transition hover:bg-rose-500/10"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 size={14} />
                    מחיקה
                  </button>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </Drawer>
    </>
  );
}
