"use client";

import Link from "next/link";
import { useEffect, useState, type ComponentType } from "react";
import { CalendarDays, CheckCircle2, Copy, Hourglass, Plus, Users, XCircle } from "lucide-react";
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
        <TimelineCard events={timelineEvents} canEdit={role === "admin" || role === "ramad" || role === "user"} onChanged={() => {
          void agamFetch<{ events: AgamTimelineEventItem[] }>("/api/agam/timeline")
            .then((data) => setTimelineEvents(data.events ?? []))
            .catch(() => toast.error("טעינת ציר הזמן נכשלה"));
        }} />
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
  onChanged,
}: {
  events: AgamTimelineEventItem[];
  canEdit: boolean;
  onChanged: () => void;
}) {
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventType, setEventType] = useState<AgamTimelineEventItem["event_type"]>("general");
  const [saving, setSaving] = useState(false);

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
      <ol className="mt-5 space-y-3">
        {events.length === 0 ? (
          <li className="text-sm text-text-muted">אין אירועים בציר הזמן.</li>
        ) : (
          events.map((event) => (
            <li key={event.id} className="border-s-2 border-accent-primary/30 ps-4">
              <p className="text-xs font-bold text-accent-primary">{formatAgamDate(event.event_date)}</p>
              <p className="mt-1 font-bold text-text-primary">{event.title}</p>
              {event.notes ? <p className="text-xs text-text-muted">{event.notes}</p> : null}
            </li>
          ))
        )}
      </ol>
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
