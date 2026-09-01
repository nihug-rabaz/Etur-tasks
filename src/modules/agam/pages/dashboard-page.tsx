"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Activity, CalendarDays, CalendarCheck, CheckCircle2, ClipboardCheck, Copy, Flag, GraduationCap, Hourglass, MessageCircle, Pencil, Plus, Trash2, Users, XCircle } from "lucide-react";
import { toast } from "sonner";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { CreateCandidateDrawer } from "@/modules/agam/components/create-drawers";
import { AgamTaskRow } from "@/modules/agam/components/task-row";
import { formatAgamDate } from "@/modules/agam/lib/date-format";
import { STATUS_LABELS, STATUS_TONES } from "@/modules/agam/lib/stages";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/modules/agam/lib/ui";
import type { AgamCandidate, AgamCycle, AgamLinkedTask, AgamOrgSettings, AgamTimelineEventItem } from "@/modules/agam/types";
import type { ModuleRole } from "@/shared/modules/types";

export function AgamDashboardPage({
  initialCandidates = [],
  initialSettings = null,
  initialRole = null,
  initialTimelineEvents = [],
  initialGeneralTasks = [],
  initialCycles = [],
  initialCurrentUserId = "",
}: {
  initialCandidates?: AgamCandidate[];
  initialSettings?: AgamOrgSettings | null;
  initialRole?: ModuleRole | null;
  initialTimelineEvents?: AgamTimelineEventItem[];
  initialGeneralTasks?: AgamLinkedTask[];
  initialCycles?: AgamCycle[];
  initialCurrentUserId?: string;
}) {
  const [candidates, setCandidates] = useState<AgamCandidate[]>(initialCandidates);
  const [settings, setSettings] = useState<AgamOrgSettings | null>(initialSettings);
  const [role, setRole] = useState<ModuleRole | null>(initialRole);
  const [timelineEvents, setTimelineEvents] = useState<AgamTimelineEventItem[]>(initialTimelineEvents);
  const [generalTasks, setGeneralTasks] = useState<AgamLinkedTask[]>(initialGeneralTasks);
  const [cycles, setCycles] = useState<AgamCycle[]>(initialCycles);
  const [currentUserId, setCurrentUserId] = useState(initialCurrentUserId);
  const [loaded, setLoaded] = useState(Boolean(initialRole));

  useEffect(() => {
    if (initialRole) {
      setCandidates(initialCandidates);
      setSettings(initialSettings);
      setRole(initialRole);
      setTimelineEvents(initialTimelineEvents);
      setGeneralTasks(initialGeneralTasks);
      setCycles(initialCycles);
      setCurrentUserId(initialCurrentUserId);
      setLoaded(true);
      return;
    }
    void Promise.all([
      agamFetch<{ candidates: AgamCandidate[]; role: ModuleRole; currentUserId: string }>("/api/agam/candidates"),
      agamFetch<{ settings: AgamOrgSettings | null }>("/api/agam/settings"),
      agamFetch<{ events: AgamTimelineEventItem[] }>("/api/agam/timeline"),
      agamFetch<{ tasks: AgamLinkedTask[] }>("/api/agam/tasks?general=1"),
      agamFetch<{ cycles: AgamCycle[] }>("/api/agam/cycles"),
    ])
      .then(([candidatesData, settingsData, timelineData, tasksData, cyclesData]) => {
        setCandidates(candidatesData.candidates);
        setRole(candidatesData.role);
        setSettings(settingsData.settings);
        setTimelineEvents(timelineData.events ?? []);
        setGeneralTasks(tasksData.tasks ?? []);
        setCycles(cyclesData.cycles ?? []);
        setCurrentUserId(candidatesData.currentUserId ?? "");
      })
      .catch(() => toast.error("טעינת המועמדים נכשלה"))
      .finally(() => setLoaded(true));
  }, [initialCandidates, initialCurrentUserId, initialCycles, initialGeneralTasks, initialRole, initialSettings, initialTimelineEvents]);

  const isRamad = role === "admin" || role === "ramad";
  const stats = {
    total: candidates.length,
    pending: candidates.filter((row) => row.status === "pending").length,
    passed: candidates.filter((row) => row.status === "passed").length,
    notPassed: candidates.filter((row) => row.status === "not_passed").length,
  };
  const recent = candidates.slice(0, 8);

  const copyApply = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/agam/apply`);
    toast.success("קישור השאלון הועתק");
  };

  const copyUpload = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/agam/upload`);
    toast.success("קישור העלאת המסמכים הועתק");
  };

  if (!loaded) {
    return <p className="p-6 text-sm text-text-muted">טוען…</p>;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <article className="dashboard-glass flex flex-col gap-6 rounded-3xl p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <p className="text-sm font-bold text-accent-primary">הרבנות הצבאית</p>
          <h1 className="mt-2 text-3xl font-extrabold text-text-primary sm:text-4xl">
            {settings?.unit_name ?? "איתור קציני דת"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-text-secondary">
            ניהול תהליך המיון לקורס קציני דת — משאלון מקדים ועד החלטה סופית.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {role === "admin" || role === "ramad" || role === "user" ? <CreateCandidateDrawer /> : null}
            <Link href="/agam/cycles" className={primaryButtonClass}>
              מחזורי מועמדים
            </Link>
            <Link href="/agam/candidates" className={secondaryButtonClass}>
              לרשימת מועמדים
            </Link>
            <button type="button" onClick={() => void copyApply()} className={secondaryButtonClass}>
              <Copy size={16} />
              העתקת קישור שאלון
            </button>
            <button type="button" onClick={() => void copyUpload()} className={secondaryButtonClass}>
              <Copy size={16} />
              קישור העלאת מסמכים
            </button>
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={settings?.logo_url || "/logo-mador-omtz.png"}
          alt={settings?.unit_name ?? "איתור קציני דת"}
          className="h-24 w-auto object-contain sm:h-28"
        />
      </article>

      {isRamad ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} label="סה״כ מועמדים" value={stats.total} />
          <StatCard icon={Hourglass} label="ממתינים" value={stats.pending} />
          <StatCard icon={CheckCircle2} label="עברו" value={stats.passed} />
          <StatCard icon={XCircle} label="לא עברו" value={stats.notPassed} />
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <TimelineCard
          events={timelineEvents}
          canEdit={role === "admin" || role === "ramad" || role === "user"}
          currentUserId={currentUserId}
          role={role}
          onChanged={() => {
            void agamFetch<{ events: AgamTimelineEventItem[] }>("/api/agam/timeline")
              .then((data) => setTimelineEvents(data.events ?? []))
              .catch(() => toast.error("טעינת ציר הזמן נכשלה"));
          }}
        />
        <GeneralTasksCard
          tasks={generalTasks}
          cycles={cycles}
          currentUserId={currentUserId}
          canEdit={role === "admin" || role === "ramad" || role === "user"}
          canAdmin={role === "admin" || role === "ramad"}
          onChanged={() => {
          void agamFetch<{ tasks: AgamLinkedTask[] }>("/api/agam/tasks?general=1")
            .then((data) => setGeneralTasks(data.tasks ?? []))
            .catch(() => toast.error("טעינת המשימות נכשלה"));
        }} />
      </section>

      <article className="dashboard-glass rounded-3xl p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-text-primary">מועמדים אחרונים</h2>
          <Link href="/agam/candidates" className="text-xs font-bold text-accent-primary">
            הכל
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-text-muted">אין מועמדים עדיין.</p>
        ) : (
          <ul className="divide-y divide-black/8 dark:divide-white/10">
            {recent.map((candidate) => (
              <li key={candidate.id}>
                <Link
                  href={`/agam/candidates/${candidate.id}`}
                  className="flex items-center justify-between gap-3 py-3 transition hover:opacity-80"
                >
                  <div>
                    <p className="font-bold text-text-primary">{candidate.full_name}</p>
                    <p className="text-xs text-text-muted" dir="ltr">
                      {candidate.personal_number}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_TONES[candidate.status]}`}>
                    {STATUS_LABELS[candidate.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="dashboard-glass rounded-3xl p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">{label}</p>
        <Icon size={16} className="text-accent-primary" />
      </div>
      <p className="mt-3 text-3xl font-extrabold text-text-primary">{value}</p>
    </div>
  );
}

function TimelineCard({
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
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventType, setEventType] = useState<AgamTimelineEventItem["event_type"]>("general");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editType, setEditType] = useState<AgamTimelineEventItem["event_type"]>("general");
  const [editNotes, setEditNotes] = useState("");
  const [editing, setEditing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const canModify = (event: AgamTimelineEventItem) => {
    if (!role) return false;
    return role === "admin" || role === "ramad" || event.created_by_id === currentUserId;
  };

  const submit = async () => {
    setSaving(true);
    try {
      await agamFetch("/api/agam/timeline", {
        method: "POST",
        body: JSON.stringify({ title, eventDate, eventType }),
      });
      setTitle("");
      setEventDate("");
      setEventType("general");
      toast.success("האירוע נוסף לציר הזמן");
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "שמירת אירוע נכשלה");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (event: AgamTimelineEventItem) => {
    setEditingId(event.id);
    setEditTitle(event.title);
    setEditDate(event.event_date || "");
    setEditType(event.event_type);
    setEditNotes(event.notes ?? "");
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await agamFetch(`/api/agam/timeline?id=${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({ title: editTitle, eventDate: editDate, eventType: editType, notes: editNotes || null }),
      });
      toast.success("האירוע עודכן");
      setEditingId(null);
      setEditing(false);
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "עדכון אירוע נכשל");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    setSaving(true);
    try {
      await agamFetch(`/api/agam/timeline?id=${deletingId}`, { method: "DELETE" });
      toast.success("האירוע נמחק");
      setDeletingId(null);
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "מחיקת אירוע נכשלה");
    } finally {
      setSaving(false);
    }
  };

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

  const EVENT_TYPE_LABELS: Record<string, string> = {
    hasbara: "כנס הסברה",
    selection_day: "יום מיונים",
    prep_day: "יום מכין",
    smach: "סמ״ח",
    mabdak: "מבדק",
    bahad1: "בה״ד 1",
    general: "כללי",
  };

  const EVENT_TYPE_TONES: Record<string, string> = {
    hasbara: "bg-sky-500/15 text-sky-700 dark:text-sky-100",
    selection_day: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-100",
    prep_day: "bg-teal-500/15 text-teal-700 dark:text-teal-100",
    smach: "bg-purple-500/15 text-purple-700 dark:text-purple-100",
    mabdak: "bg-amber-500/15 text-amber-700 dark:text-amber-100",
    bahad1: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-100",
    general: "bg-surface-2 text-text-secondary",
  };

  const EVENT_ICONS: Record<string, ComponentType<{ size?: number; className?: string }>> = {
    hasbara: MessageCircle,
    selection_day: CalendarCheck,
    prep_day: GraduationCap,
    smach: Activity,
    mabdak: ClipboardCheck,
    bahad1: Flag,
    general: CalendarDays,
  };

  return (
    <article className="dashboard-glass rounded-3xl p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-text-primary">ציר זמן</h2>
        <CalendarDays size={18} className="text-accent-primary" />
      </div>
      {canEdit ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_150px]">
          <input className={fieldClass} placeholder="שם האירוע" value={title} onChange={(event) => setTitle(event.target.value)} />
          <input type="date" className={`${fieldClass} text-left`} dir="ltr" value={eventDate} onChange={(event) => setEventDate(event.target.value)} />
          <select className={fieldClass} value={eventType} onChange={(event) => setEventType(event.target.value as AgamTimelineEventItem["event_type"])}>
            <option value="hasbara">כנס הסברה</option>
            <option value="selection_day">יום מיונים</option>
            <option value="prep_day">יום מכין</option>
            <option value="smach">סמח</option>
            <option value="mabdak">מבדק</option>
            <option value="bahad1">בה״ד 1</option>
            <option value="general">כללי</option>
          </select>
          <button type="button" className={primaryButtonClass} disabled={saving || title.trim().length < 2 || !eventDate} onClick={() => void submit()}>
            <Plus size={16} />
            {saving ? "מוסיף..." : "הוספה"}
          </button>
        </div>
      ) : null}
      {sorted.length === 0 ? (
        <p className="mt-4 text-sm text-text-muted">אין אירועים בציר הזמן.</p>
      ) : (
        <div className="mt-4 -mx-2 overflow-x-auto pb-2">
          <div className="relative min-w-full px-2">
            <div className="absolute inset-x-4 top-6 h-0.5 rounded-full bg-black/10 dark:bg-white/10" />
            <div className="flex gap-4">
              {sorted.map((event) => {
                const eventDateValue = String(event.event_date || "");
                const isPast = eventDateValue < today;
                const isToday = eventDateValue === today;
                const Icon = EVENT_ICONS[event.event_type] ?? CalendarDays;
                const editable = canModify(event);
                return (
                  <div
                    key={event.id}
                    className={`relative flex w-[220px] shrink-0 flex-col rounded-2xl border p-4 transition ${
                      isToday
                        ? "border-accent-primary/40 bg-accent-primary/5"
                        : isPast
                          ? "border-black/8 bg-surface-1/60 opacity-70 dark:border-white/10"
                          : "border-black/8 bg-surface-2 dark:border-white/10"
                    }`}
                  >
                    <div className="absolute -top-2 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-background">
                      <span
                        className={`block h-full w-full rounded-full ${
                          isToday
                            ? "bg-accent-primary"
                            : isPast
                              ? "bg-text-muted"
                              : "bg-accent-primary/60"
                        }`}
                      />
                    </div>
                    {editingId === event.id && editing ? (
                      <div className="mt-2 space-y-2">
                        <input
                          className={fieldClass}
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="כותרת"
                        />
                        <input
                          type="date"
                          className={`${fieldClass} text-left`}
                          dir="ltr"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                        />
                        <select
                          className={fieldClass}
                          value={editType}
                          onChange={(e) => setEditType(e.target.value as AgamTimelineEventItem["event_type"])}
                        >
                          {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                        <textarea
                          className={fieldClass}
                          rows={3}
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="הערות"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className={primaryButtonClass}
                            disabled={saving}
                            onClick={() => void saveEdit()}
                          >
                            {saving ? "שומר..." : "שמירה"}
                          </button>
                          <button
                            type="button"
                            className={secondaryButtonClass}
                            onClick={() => {
                              setEditingId(null);
                              setEditing(false);
                            }}
                          >
                            ביטול
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-text-muted">{formatAgamDate(eventDateValue)}</span>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${EVENT_TYPE_TONES[event.event_type] ?? EVENT_TYPE_TONES.general}`}>
                            <Icon size={12} />
                            {EVENT_TYPE_LABELS[event.event_type] ?? "כללי"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-extrabold text-text-primary line-clamp-2">{event.title}</p>
                        {event.notes ? <p className="mt-1 text-xs text-text-muted line-clamp-3">{event.notes}</p> : null}
                        {editable ? (
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(event)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                              aria-label="ערוך אירוע"
                              title="ערוך אירוע"
                            >
                              <Pencil size={14} />
                            </button>
                            {deletingId === event.id ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => confirmDelete()}
                                  disabled={saving}
                                  className="rounded-lg bg-rose-600 px-2 py-1 text-[11px] font-bold text-white disabled:opacity-50"
                                >
                                  {saving ? "מוחק..." : "מחק"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingId(null)}
                                  disabled={saving}
                                  className="rounded-lg bg-surface-2 px-2 py-1 text-[11px] font-bold text-text-secondary"
                                >
                                  ביטול
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeletingId(event.id)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-500/10"
                                aria-label="מחק אירוע"
                                title="מחק אירוע"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

function GeneralTasksCard({
  tasks,
  cycles,
  currentUserId,
  canEdit,
  canAdmin,
  onChanged,
}: {
  tasks: AgamLinkedTask[];
  cycles: AgamCycle[];
  currentUserId: string;
  canEdit: boolean;
  canAdmin: boolean;
  onChanged: () => void;
}) {
  const [title, setTitle] = useState("");
  const [cycleId, setCycleId] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await agamFetch("/api/agam/tasks", {
        method: "POST",
        body: JSON.stringify({ title, cycleId: cycleId || null }),
      });
      setTitle("");
      setCycleId("");
      toast.success("המשימה נוספה גם לאפליקציית המשימות");
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "יצירת משימה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="dashboard-glass rounded-3xl p-6">
      <h2 className="text-lg font-bold text-text-primary">משימות כלליות</h2>
      {canEdit ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_180px_auto]">
          <input className={fieldClass} placeholder="משימה לכלל המחזור/המערכת" value={title} onChange={(event) => setTitle(event.target.value)} />
          <select className={fieldClass} value={cycleId} onChange={(event) => setCycleId(event.target.value)}>
            <option value="">ללא מחזור</option>
            {cycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.name}
              </option>
            ))}
          </select>
          <button type="button" className={primaryButtonClass} disabled={saving || title.trim().length < 2} onClick={() => void submit()}>
            {saving ? "..." : "+"}
          </button>
        </div>
      ) : null}
      <ul className="mt-4 space-y-2">
        {tasks.length === 0 ? (
          <li className="text-sm text-text-muted">אין משימות כלליות.</li>
        ) : (
          tasks.slice(0, 8).map((task) => (
            <AgamTaskRow
              key={task.id}
              task={task}
              currentUserId={currentUserId}
              canAdmin={canAdmin}
              onSaved={onChanged}
            />
          ))
        )}
      </ul>
    </article>
  );
}
