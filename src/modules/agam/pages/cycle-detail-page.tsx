"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Archive, CalendarDays, FolderOpen, Plus, Trash2, UserPlus, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Drawer } from "@/components/ui/drawer";
import { CreateCandidateDrawer } from "@/modules/agam/components/create-drawers";
import { AgamTaskRow } from "@/modules/agam/components/task-row";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { formatAgamDate } from "@/modules/agam/lib/date-format";
import { STATUS_LABELS, STATUS_TONES } from "@/modules/agam/lib/stages";
import { TimelineDatePicker } from "@/modules/agam/components/timeline-date-picker";
import { canEvaluate, canRamad } from "@/modules/agam/lib/permissions";
import { cardClass, chipClass, dangerChipClass, fieldClass, innerCardClass, panelClass, primaryButtonClass, secondaryButtonClass } from "@/modules/agam/lib/ui";
import type { AgamCandidate, AgamCycle, AgamLinkedTask } from "@/modules/agam/types";
import type { ModuleRole } from "@/shared/modules/types";

function formatCycleDate(value: string): string {
  return formatAgamDate(value);
}

type CyclePayload = {
  cycle: AgamCycle;
  candidates: AgamCandidate[];
  role: ModuleRole;
  currentUserId: string;
};

export function AgamCycleDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [payload, setPayload] = useState<CyclePayload | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [tasks, setTasks] = useState<AgamLinkedTask[]>([]);

  const load = useCallback(async () => {
    try {
      const data = await agamFetch<CyclePayload>(`/api/agam/cycles/${id}`);
      setPayload(data);
      const tasksData = await agamFetch<{ tasks: AgamLinkedTask[] }>(`/api/agam/tasks?cycleId=${id}`);
      setTasks(tasksData.tasks ?? []);
    } catch {
      toast.error("טעינת המחזור נכשלה");
      setPayload(null);
    } finally {
      setLoaded(true);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!loaded) return <p className="p-6 text-sm text-text-muted">טוען…</p>;
  if (!payload) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className={`${panelClass} p-8 text-center`}>המחזור לא נמצא.</div>
      </div>
    );
  }

  const { cycle, candidates, role } = payload;
  const canEdit = canEvaluate(role);
  const canDelete = canRamad(role);

  const removeCandidate = async (candidateId: string) => {
    try {
      await agamFetch(`/api/agam/cycles/${id}`, {
        method: "PUT",
        body: JSON.stringify({ unassignCandidateId: candidateId }),
      });
      toast.success("המועמד הוסר מהמחזור");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "הסרה נכשלה");
    }
  };

  const deleteCycle = async () => {
    if (!window.confirm("למחוק את המחזור? המועמדים יישארו במערכת ללא שיוך.")) return;
    try {
      await agamFetch(`/api/agam/cycles/${id}`, { method: "DELETE" });
      toast.success("המחזור נמחק");
      router.push("/agam/cycles");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "מחיקה נכשלה");
    }
  };

  const archiveCycle = async () => {
    if (!window.confirm("להעביר את כל המחזור לארכיון?")) return;
    try {
      await agamFetch(`/api/agam/cycles/${id}`, {
        method: "PUT",
        body: JSON.stringify({ archived: true }),
      });
      toast.success("המחזור הועבר לארכיון");
      router.push("/agam/cycles?archived=1");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "העברה לארכיון נכשלה");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className={`${panelClass} p-6 sm:p-8`}>
        <Link href="/agam/cycles" className="text-xs font-bold text-accent-primary">
          חזרה למחזורים
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-primary/12 text-accent-primary">
              <CalendarDays size={26} />
            </div>
            <div>
              <p className="text-sm font-bold text-accent-primary">מחזור מועמדים</p>
              <h1 className="mt-1 text-3xl font-extrabold text-text-primary">{cycle.name}</h1>
              <p className="mt-2 text-sm font-semibold text-text-secondary">
                {formatCycleDate(cycle.cycle_date)}
                {cycle.cohort_year ? ` · שנתון ${cycle.cohort_year}` : ""}
              </p>
              {cycle.notes ? <p className="mt-2 max-w-2xl text-sm text-text-muted">{cycle.notes}</p> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <>
                <button type="button" className={secondaryButtonClass} onClick={() => setEditOpen(true)}>
                  עריכה
                </button>
                <button type="button" className={secondaryButtonClass} onClick={() => setAssignOpen(true)}>
                  <UserPlus size={16} />
                  שיוך קיימים
                </button>
                <button type="button" className={primaryButtonClass} onClick={() => setCreateOpen(true)}>
                  <Plus size={16} />
                  מועמד חדש
                </button>
              </>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => void archiveCycle()}
              >
                <Archive size={16} />
                ארכיון מחזור
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600/10 px-4 py-2.5 text-sm font-bold text-rose-700 transition hover:bg-rose-600/15"
                onClick={() => void deleteCycle()}
              >
                מחיקת מחזור
              </button>
            ) : null}
          </div>
        </div>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-bold text-text-secondary">
          <Users size={14} />
          {candidates.length} מועמדים במחזור
        </div>
      </header>

      <section className={`${panelClass} p-6`}>
        <h2 className="text-xl font-extrabold text-text-primary">מועמדים במחזור</h2>
        {candidates.length === 0 ? (
          <div className={`mt-6 ${cardClass} py-10 text-center`}>
            <p className="text-sm text-text-muted">אין מועמדים במחזור זה עדיין.</p>
            {canEdit ? (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button type="button" className={primaryButtonClass} onClick={() => setCreateOpen(true)}>
                  יצירת מועמד
                </button>
                <button type="button" className={secondaryButtonClass} onClick={() => setAssignOpen(true)}>
                  שיוך מועמדים קיימים
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {candidates.map((candidate) => (
              <li key={candidate.id} className={`flex flex-wrap items-center justify-between gap-3 ${innerCardClass}`}>
                <div className="min-w-0">
                  <Link
                    href={`/agam/candidates/${candidate.id}`}
                    className="text-sm font-extrabold text-text-primary hover:text-accent-primary"
                  >
                    {candidate.full_name}
                  </Link>
                  <p className="mt-0.5 text-xs text-text-muted" dir="ltr">
                    {candidate.personal_number}
                    {candidate.phone ? ` · ${candidate.phone}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_TONES[candidate.status]}`}
                  >
                    {STATUS_LABELS[candidate.status]}
                  </span>
                  <Link href={`/agam/candidates/${candidate.id}`} className={chipClass}>
                    <FolderOpen size={13} />
                    תיק
                  </Link>
                  {canEdit ? (
                    <button
                      type="button"
                      className={dangerChipClass}
                      onClick={() => void removeCandidate(candidate.id)}
                    >
                      <Trash2 size={13} />
                      הסרה
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <CycleTasksCard
        cycleId={id}
        tasks={tasks}
        currentUserId={payload.currentUserId}
        canEvaluate={canEdit}
        canAdmin={canDelete}
        onSaved={() => void load()}
      />

      <EditCycleDrawer
        cycle={cycle}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={() => void load()}
      />
      <AssignCandidatesDrawer
        cycleId={id}
        open={assignOpen}
        onOpenChange={setAssignOpen}
        onSaved={() => void load()}
      />
      <CreateCandidateDrawer
        hideTrigger
        open={createOpen}
        onOpenChange={setCreateOpen}
        cycleId={id}
        stayOnSuccess
        onCreated={() => void load()}
      />
    </div>
  );
}

function CycleTasksCard({
  cycleId,
  tasks,
  currentUserId,
  canEvaluate,
  canAdmin,
  onSaved,
}: {
  cycleId: string;
  tasks: AgamLinkedTask[];
  currentUserId: string;
  canEvaluate: boolean;
  canAdmin: boolean;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await agamFetch("/api/agam/tasks", {
        method: "POST",
        body: JSON.stringify({ title, dueDate: dueDate || null, cycleId }),
      });
      setTitle("");
      setDueDate("");
      toast.success("המשימה נוספה גם לאפליקציית המשימות");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "יצירת משימה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={`${panelClass} p-6`}>
      <h2 className="text-xl font-extrabold text-text-primary">משימות כלל המחזור</h2>
      {canEvaluate ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_auto]">
          <input className={fieldClass} placeholder="משימה חדשה למחזור" value={title} onChange={(event) => setTitle(event.target.value)} />
          <TimelineDatePicker value={dueDate} onChange={setDueDate} label="תאריך יעד" />
          <button type="button" className={primaryButtonClass} disabled={saving || title.trim().length < 2} onClick={() => void submit()}>
            {saving ? "יוצר..." : "הוספה"}
          </button>
        </div>
      ) : null}
      <ul className="mt-4 space-y-2">
        {tasks.length === 0 ? (
          <li className="text-sm text-text-muted">אין משימות למחזור.</li>
        ) : (
          tasks.map((task) => (
            <AgamTaskRow
              key={task.id}
              task={task}
              currentUserId={currentUserId}
              canAdmin={canAdmin}
              onSaved={onSaved}
            />
          ))
        )}
      </ul>
    </section>
  );
}

function EditCycleDrawer({
  cycle,
  open,
  onOpenChange,
  onSaved,
}: {
  cycle: AgamCycle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(cycle.name);
  const [cycleDate, setCycleDate] = useState(cycle.cycle_date.slice(0, 10));
  const [cohortYear, setCohortYear] = useState(cycle.cohort_year?.toString() ?? "");
  const [notes, setNotes] = useState(cycle.notes ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(cycle.name);
    setCycleDate(cycle.cycle_date.slice(0, 10));
    setCohortYear(cycle.cohort_year?.toString() ?? "");
    setNotes(cycle.notes ?? "");
  }, [cycle]);

  const submit = async () => {
    setSaving(true);
    try {
      await agamFetch(`/api/agam/cycles/${cycle.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name,
          cycleDate,
          cohortYear: cohortYear ? Number(cohortYear) : null,
          notes: notes || null,
        }),
      });
      toast.success("המחזור עודכן");
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "עדכון נכשל");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={() => onOpenChange(false)} title="עריכת מחזור">
      <div className="space-y-4 p-1">
        <label className="block space-y-2 text-sm font-bold text-text-secondary">
          שם
          <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <TimelineDatePicker value={cycleDate} onChange={setCycleDate} label="תאריך" />
        <label className="block space-y-2 text-sm font-bold text-text-secondary">
          שנתון
          <input
            type="number"
            dir="ltr"
            className={`${fieldClass} text-left`}
            value={cohortYear}
            onChange={(event) => setCohortYear(event.target.value)}
          />
        </label>
        <label className="block space-y-2 text-sm font-bold text-text-secondary">
          הערות
          <textarea
            className={fieldClass}
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
        <button
          type="button"
          className={primaryButtonClass}
          disabled={saving || name.trim().length < 2 || !cycleDate}
          onClick={() => void submit()}
        >
          {saving ? "שומר…" : "שמירה"}
        </button>
      </div>
    </Drawer>
  );
}

function AssignCandidatesDrawer({
  cycleId,
  open,
  onOpenChange,
  onSaved,
}: {
  cycleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [candidates, setCandidates] = useState<AgamCandidate[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected([]);
    setQuery("");
    void agamFetch<{ candidates: AgamCandidate[] }>("/api/agam/candidates?unassigned=1")
      .then((data) => setCandidates(data.candidates))
      .catch(() => toast.error("טעינת מועמדים פנויים נכשלה"));
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidates.filter(
      (row) =>
        !q ||
        row.full_name.toLowerCase().includes(q) ||
        row.personal_number.toLowerCase().includes(q),
    );
  }, [candidates, query]);

  const toggle = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const submit = async () => {
    if (selected.length === 0) return;
    setSaving(true);
    try {
      await agamFetch(`/api/agam/cycles/${cycleId}`, {
        method: "PUT",
        body: JSON.stringify({ assignCandidateIds: selected }),
      });
      toast.success(`${selected.length} מועמדים שויכו`);
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "שיוך נכשל");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={() => onOpenChange(false)}
      title="שיוך מועמדים קיימים"
      subtitle="מועמדים שעדיין לא משויכים למחזור"
    >
      <div className="space-y-4 p-1">
        <input
          className={fieldClass}
          placeholder="חיפוש לפי שם או מספר אישי"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="ui-card max-h-72 overflow-y-auto rounded-xl bg-surface-2/80">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-text-muted">אין מועמדים פנויים לשיוך.</p>
          ) : (
            filtered.map((row) => {
              const checked = selected.includes(row.id);
              return (
                <button
                  key={row.id}
                  type="button"
                  className={`flex w-full items-center justify-between px-3 py-2.5 text-start text-sm ${
                    checked ? "bg-accent-primary/12 font-bold text-accent-primary" : "text-text-primary"
                  }`}
                  onClick={() => toggle(row.id)}
                >
                  <span>{row.full_name}</span>
                  <span className="text-xs text-text-muted" dir="ltr">
                    {row.personal_number}
                  </span>
                </button>
              );
            })
          )}
        </div>
        <button
          type="button"
          className={primaryButtonClass}
          disabled={saving || selected.length === 0}
          onClick={() => void submit()}
        >
          {saving ? "משייך…" : `שיוך ${selected.length || ""} מועמדים`.trim()}
        </button>
      </div>
    </Drawer>
  );
}
