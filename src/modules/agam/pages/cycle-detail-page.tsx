"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Archive, CalendarDays, ChevronDown, Flag, FolderOpen, ListTodo, Plus, Trash2, UserPlus, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Drawer } from "@/components/ui/drawer";
import { CreateCandidateDrawer } from "@/modules/agam/components/create-drawers";
import { CreateAgamTaskDrawer } from "@/modules/agam/components/create-task-drawer";
import { CycleInviteShareCard } from "@/modules/agam/components/cycle-invite-share-card";
import { AgamTaskRow } from "@/modules/agam/components/task-row";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { formatAgamDate, toDateInputValue } from "@/modules/agam/lib/date-format";
import { STATUS_LABELS, STATUS_TONES } from "@/modules/agam/lib/stages";
import { TimelineDatePicker } from "@/modules/agam/components/timeline-date-picker";
import { canEvaluate, canRamad } from "@/modules/agam/lib/permissions";
import { cardClass, chipClass, dangerChipClass, fieldClass, pageShellClass, panelClass, panelPadClass, primaryButtonClass, secondaryButtonClass } from "@/modules/agam/lib/ui";
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
  const [candidateQuery, setCandidateQuery] = useState("");

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

  const candidates = payload?.candidates ?? [];
  const filteredCandidates = useMemo(() => {
    const q = candidateQuery.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter(
      (row) =>
        row.full_name.toLowerCase().includes(q) ||
        row.personal_number.toLowerCase().includes(q) ||
        (row.phone ?? "").includes(q),
    );
  }, [candidateQuery, candidates]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of candidates) {
      counts[row.status] = (counts[row.status] ?? 0) + 1;
    }
    return counts;
  }, [candidates]);

  if (!loaded) return <p className="p-6 text-sm text-text-muted">טוען…</p>;
  if (!payload) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className={`${panelClass} p-8 text-center`}>המחזור לא נמצא.</div>
      </div>
    );
  }

  const { cycle, role } = payload;
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
    <div className={`${pageShellClass} mx-auto max-w-5xl`}>
      <header className={`${panelClass} ${panelPadClass}`}>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={cycle.cohort_year != null ? `/agam/cycles?year=${cycle.cohort_year}` : "/agam/cycles"}
            className="text-xs font-bold text-accent-primary"
          >
            ← שנתונים
          </Link>
          <span className="text-text-muted/40">|</span>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-primary/12 text-accent-primary">
              <CalendarDays size={18} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-extrabold text-text-primary sm:text-2xl">{cycle.name}</h1>
              <p className="text-xs font-semibold text-text-secondary">
                {formatCycleDate(cycle.cycle_date)}
                {cycle.cohort_year ? ` · שנתון ${cycle.cohort_year}` : ""}
                {cycle.notes ? ` · ${cycle.notes}` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Link href={`/agam/cycles/${id}/bahad1`} className={secondaryButtonClass}>
              <Flag size={15} />
              בה״ד 1
            </Link>
            {canEdit ? (
              <>
                <button type="button" className={secondaryButtonClass} onClick={() => setEditOpen(true)}>
                  עריכה
                </button>
                <button type="button" className={secondaryButtonClass} onClick={() => setAssignOpen(true)}>
                  <UserPlus size={15} />
                  שיוך
                </button>
                <button type="button" className={primaryButtonClass} onClick={() => setCreateOpen(true)}>
                  <Plus size={15} />
                  מועמד
                </button>
                <CreateAgamTaskDrawer
                  cycleId={cycle.id}
                  cycleName={cycle.name}
                  triggerClassName={secondaryButtonClass}
                />
              </>
            ) : null}
            {canDelete ? (
              <>
                <button type="button" className={secondaryButtonClass} onClick={() => void archiveCycle()}>
                  <Archive size={15} />
                  ארכיון
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600/10 px-3 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-600/15"
                  onClick={() => void deleteCycle()}
                >
                  מחיקה
                </button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      {!cycle.archived && cycle.invite_slug ? (
        <CycleInviteShareCard
          cycle={cycle}
          canRotate={canDelete}
          onRotated={(next) =>
            setPayload((current) => (current ? { ...current, cycle: next } : current))
          }
        />
      ) : null}

      <details className={`${panelClass} ${panelPadClass} group/tasks`}>
        <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
          <ListTodo size={18} className="text-accent-primary" />
          <span className="text-base font-extrabold text-text-primary">משימות המחזור</span>
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-text-muted">
            {tasks.length}
          </span>
          <ChevronDown
            size={18}
            className="ms-auto text-text-muted transition group-open/tasks:rotate-180"
          />
        </summary>
        <div className="mt-3 max-w-xl ui-divider-top pt-3">
          <CycleTasksCard
            cycleId={id}
            tasks={tasks}
            currentUserId={payload.currentUserId}
            canEvaluate={canEdit}
            canAdmin={canDelete}
            onSaved={() => void load()}
            embedded
          />
        </div>
      </details>

      <section className={`${panelClass} ${panelPadClass}`}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-accent-primary" />
              <h2 className="text-lg font-extrabold text-text-primary">מועמדים במחזור</h2>
            </div>
            <p className="mt-0.5 text-xs text-text-muted">
              {candidates.length} במחזור
              {statusCounts.pending ? ` · ${statusCounts.pending} ממתינים` : ""}
              {statusCounts.passed ? ` · ${statusCounts.passed} עברו` : ""}
            </p>
          </div>
          {canEdit ? (
            <div className="flex flex-wrap gap-1.5">
              <button type="button" className={secondaryButtonClass} onClick={() => setAssignOpen(true)}>
                <UserPlus size={14} />
                שיוך קיימים
              </button>
              <button type="button" className={primaryButtonClass} onClick={() => setCreateOpen(true)}>
                <Plus size={14} />
                מועמד חדש
              </button>
            </div>
          ) : null}
        </div>

        {candidates.length > 0 ? (
          <div className="mt-3 w-full max-w-xs">
            <input
              className={fieldClass}
              placeholder="חיפוש שם / מספר / טלפון"
              value={candidateQuery}
              onChange={(event) => setCandidateQuery(event.target.value)}
            />
          </div>
        ) : null}

        {candidates.length === 0 ? (
          <div className={`mt-4 flex max-w-sm flex-col items-center justify-center ${cardClass} py-8 text-center`}>
            <Users className="text-accent-primary/70" size={28} />
            <p className="mt-3 text-sm font-bold text-text-primary">עדיין אין מועמדים במחזור</p>
            <p className="mt-1 text-xs text-text-muted">צרו מועמד חדש או שייכו מועמדים קיימים.</p>
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
        ) : filteredCandidates.length === 0 ? (
          <p className="mt-6 text-sm text-text-muted">לא נמצאו מועמדים לחיפוש.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2.5">
            {filteredCandidates.map((candidate) => (
              <li key={candidate.id} className="w-[11rem]">
                <article className="group flex h-full flex-col rounded-2xl bg-surface-2/90 p-3 shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent-primary)_10%,transparent)] transition hover:-translate-y-0.5 hover:bg-surface-1 hover:shadow-[0_10px_28px_-18px_rgba(15,23,42,0.35)]">
                  <div className="flex items-start gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-primary/12 text-[11px] font-extrabold text-accent-primary">
                      {candidateInitials(candidate.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/agam/candidates/${candidate.id}`}
                        className="block truncate text-[13px] font-extrabold text-text-primary transition group-hover:text-accent-primary"
                      >
                        {candidate.full_name}
                      </Link>
                      <p className="mt-0.5 truncate text-[10px] text-text-muted" dir="ltr">
                        {candidate.personal_number}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`mt-2 w-fit rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_TONES[candidate.status]}`}
                  >
                    {STATUS_LABELS[candidate.status]}
                  </span>
                  <div className="mt-auto flex gap-1 pt-2">
                    <Link
                      href={`/agam/candidates/${candidate.id}`}
                      className={`${chipClass} flex-1 justify-center px-2 py-1 text-[11px]`}
                    >
                      <FolderOpen size={12} />
                      תיק
                    </Link>
                    {canEdit ? (
                      <button
                        type="button"
                        className={dangerChipClass}
                        onClick={() => void removeCandidate(candidate.id)}
                        title="הסרה מהמחזור"
                      >
                        <Trash2 size={12} />
                      </button>
                    ) : null}
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>

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

function candidateInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`;
}

function CycleTasksCard({
  cycleId,
  tasks,
  currentUserId,
  canEvaluate,
  canAdmin,
  onSaved,
  embedded = false,
}: {
  cycleId: string;
  tasks: AgamLinkedTask[];
  currentUserId: string;
  canEvaluate: boolean;
  canAdmin: boolean;
  onSaved: () => void;
  embedded?: boolean;
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

  const body = (
    <>
      {canEvaluate ? (
        <div className="flex flex-col gap-2">
          <input
            className={fieldClass}
            placeholder="משימה חדשה למחזור"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-40 shrink-0">
              <TimelineDatePicker value={dueDate} onChange={setDueDate} label="תאריך יעד" />
            </div>
            <button
              type="button"
              className={primaryButtonClass}
              disabled={saving || title.trim().length < 2}
              onClick={() => void submit()}
            >
              {saving ? "יוצר..." : "הוספה"}
            </button>
          </div>
        </div>
      ) : null}
      <ul className={`${canEvaluate ? "mt-3" : ""} space-y-1.5`}>
        {tasks.length === 0 ? (
          <li className={`${cardClass} py-4 text-center text-sm text-text-muted`}>אין משימות למחזור עדיין.</li>
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
    </>
  );

  if (embedded) return body;

  return <section className={`${panelClass} ${panelPadClass}`}>{body}</section>;
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
  const [cycleDate, setCycleDate] = useState(toDateInputValue(cycle.cycle_date));
  const [cohortYear, setCohortYear] = useState(cycle.cohort_year?.toString() ?? "");
  const [notes, setNotes] = useState(cycle.notes ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(cycle.name);
    setCycleDate(toDateInputValue(cycle.cycle_date));
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
      <div className="space-y-4">
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
          className={`${primaryButtonClass} w-full`}
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
      <div className="space-y-4">
        <input
          className={fieldClass}
          placeholder="חיפוש לפי שם או מספר אישי"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="ui-card max-h-72 overflow-hidden rounded-2xl bg-surface-2/80">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-text-muted">אין מועמדים פנויים לשיוך.</p>
          ) : (
            filtered.map((row) => {
              const checked = selected.includes(row.id);
              return (
                <button
                  key={row.id}
                  type="button"
                  className={`ui-list-row flex w-full items-center justify-between px-3.5 py-3 text-start text-sm transition hover:bg-surface-1/80 ${
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
          className={`${primaryButtonClass} w-full`}
          disabled={saving || selected.length === 0}
          onClick={() => void submit()}
        >
          {saving ? "משייך…" : `שיוך ${selected.length || ""} מועמדים`.trim()}
        </button>
      </div>
    </Drawer>
  );
}
