"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { formatDayOffsetLabel } from "@/modules/agam/lib/cycle-timeline";
import {
  TIMELINE_EVENT_ICONS,
  TIMELINE_EVENT_LABELS,
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
import type { AgamTimelineTemplate } from "@/modules/agam/types";

type TemplateDraft = {
  title: string;
  dayOffset: string;
  eventType: AgamDashboardTimelineEventType;
  notes: string;
};

const emptyDraft = (): TemplateDraft => ({
  title: "",
  dayOffset: "0",
  eventType: "general",
  notes: "",
});

function templateToDraft(template: AgamTimelineTemplate): TemplateDraft {
  return {
    title: template.title,
    dayOffset: String(template.day_offset ?? 0),
    eventType: template.event_type,
    notes: template.notes ?? "",
  };
}

function parseDayOffset(value: string): number | null {
  const trimmed = value.trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num < -365 || num > 365) return null;
  return num;
}

function TemplateFormFields({
  draft,
  onChange,
}: {
  draft: TemplateDraft;
  onChange: (next: TemplateDraft) => void;
}) {
  const offset = parseDayOffset(draft.dayOffset);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="mb-2 block text-xs font-bold text-text-secondary">נושא האירוע</label>
        <input
          className={fieldClass}
          value={draft.title}
          onChange={(e) => onChange({ ...draft, title: e.target.value })}
          placeholder="לדוגמה: כנס הסברה"
        />
      </div>
      <div>
        <label className="mb-2 block text-xs font-bold text-text-secondary">
          ימים ביחס לתאריך המחזור
        </label>
        <input
          className={`${fieldClass} text-left`}
          dir="ltr"
          inputMode="numeric"
          value={draft.dayOffset}
          onChange={(e) => onChange({ ...draft, dayOffset: e.target.value })}
          placeholder="0"
        />
        <p className="mt-1.5 text-[11px] font-semibold text-text-muted">
          {offset == null
            ? "הזינו מספר שלם בין ‎-365 ל־365"
            : formatDayOffsetLabel(offset)}
        </p>
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
          {Object.entries(TIMELINE_EVENT_LABELS)
            .filter(([key]) => key !== "smach_test")
            .map(([key, label]) => (
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
  const [templates, setTemplates] = useState<AgamTimelineTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createDraft, setCreateDraft] = useState<TemplateDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<TemplateDraft>(emptyDraft);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await agamFetch<{ templates: AgamTimelineTemplate[] }>(
        "/api/agam/timeline/templates",
      );
      setTemplates(data.templates ?? []);
    } catch {
      toast.error("טעינת אירועי המסלול נכשלה");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const sorted = useMemo(
    () =>
      [...templates].sort((a, b) => {
        if (a.day_offset !== b.day_offset) return a.day_offset - b.day_offset;
        return (a.sort_order ?? 0) - (b.sort_order ?? 0);
      }),
    [templates],
  );

  const submitCreate = async () => {
    const dayOffset = parseDayOffset(createDraft.dayOffset);
    if (dayOffset == null) {
      toast.error("יחס הימים אינו תקין");
      return;
    }
    setSaving(true);
    try {
      await agamFetch("/api/agam/timeline/templates", {
        method: "POST",
        body: JSON.stringify({
          title: createDraft.title.trim(),
          dayOffset,
          eventType: createDraft.eventType,
          notes: createDraft.notes.trim() || null,
          sortOrder: dayOffset,
        }),
      });
      toast.success("האירוע הקבוע נוסף");
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
    const dayOffset = parseDayOffset(editDraft.dayOffset);
    if (dayOffset == null) {
      toast.error("יחס הימים אינו תקין");
      return;
    }
    setSaving(true);
    try {
      await agamFetch(`/api/agam/timeline/templates?id=${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editDraft.title.trim(),
          dayOffset,
          eventType: editDraft.eventType,
          notes: editDraft.notes.trim() || null,
          sortOrder: dayOffset,
        }),
      });
      toast.success("האירוע הקבוע עודכן");
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
      await agamFetch(`/api/agam/timeline/templates?id=${id}`, { method: "DELETE" });
      toast.success("האירוע הקבוע נמחק");
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
                אירועים קבועים
              </div>
              <h2 className="text-xl font-extrabold text-text-primary sm:text-2xl">
                מסלול שחוזר בכל מחזור
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                הגדירו כאן את אירועי המדור הקבועים — כנסים, ימי מיונים, סמ״ח ועוד. בכל מחזור
                התאריכים יחושבו אוטומטית לפי תאריך המחזור, ויופיעו בלוח הזמנים בדף הבית.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <div className="rounded-2xl bg-surface-2 px-4 py-3 text-center">
                <p className="text-[11px] font-bold text-text-muted">אירועים קבועים</p>
                <p className="text-2xl font-extrabold text-text-primary">{sorted.length}</p>
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
            הוספת אירוע קבוע
          </button>
        </div>
      ) : (
        <section className={`${panelClass} space-y-4 p-6`}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-extrabold text-text-primary">אירוע קבוע חדש</h3>
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
          <TemplateFormFields draft={createDraft} onChange={setCreateDraft} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={primaryButtonClass}
              disabled={
                saving ||
                createDraft.title.trim().length < 2 ||
                parseDayOffset(createDraft.dayOffset) == null
              }
              onClick={() => void submitCreate()}
            >
              <Check size={16} />
              {saving ? "שומר…" : "שמירה"}
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
            <p className="text-sm font-bold text-text-primary">אין אירועים קבועים עדיין</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-text-muted">
              הוסיפו את מסלול המיון הקבוע — הוא יישכפל אוטומטית לכל מחזור חדש.
            </p>
          </div>
        ) : (
          <ul>
            {sorted.map((template, index) => {
              const Icon = TIMELINE_EVENT_ICONS[template.event_type] ?? CalendarDays;
              const isEditing = editingId === template.id;

              return (
                <li key={template.id} className={index === 0 ? undefined : dividerClass}>
                  <div className="px-5 py-4 sm:px-6">
                    {isEditing ? (
                      <div className="space-y-4">
                        <TemplateFormFields draft={editDraft} onChange={setEditDraft} />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={primaryButtonClass}
                            disabled={
                              saving ||
                              editDraft.title.trim().length < 2 ||
                              parseDayOffset(editDraft.dayOffset) == null
                            }
                            onClick={() => void submitEdit(template.id)}
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
                                {TIMELINE_EVENT_LABELS[template.event_type]}
                              </span>
                              <span className="rounded-full bg-accent-primary/12 px-2 py-0.5 text-[10px] font-bold text-text-primary">
                                {formatDayOffsetLabel(template.day_offset)}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-sm font-extrabold text-text-primary">
                              {template.title}
                            </p>
                            {template.notes ? (
                              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-secondary">
                                {template.notes}
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
                              setEditingId(template.id);
                              setEditDraft(templateToDraft(template));
                              setConfirmDeleteId(null);
                            }}
                            aria-label="עריכה"
                          >
                            <Pencil size={14} />
                          </button>
                          {confirmDeleteId === template.id ? (
                            <>
                              <button
                                type="button"
                                className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                                disabled={saving}
                                onClick={() => void submitDelete(template.id)}
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
                              onClick={() => setConfirmDeleteId(template.id)}
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
