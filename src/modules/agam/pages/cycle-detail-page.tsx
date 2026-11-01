"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Archive, CalendarDays, Check, ChevronDown, Flag, Link2, ListTodo, MoreHorizontal, Pencil, Plus, RefreshCw, Trash2, Trophy, UserPlus, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Drawer } from "@/components/ui/drawer";
import { CandidateCaseCard, candidateCaseGridClass } from "@/modules/agam/components/candidate-case-card";
import { CreateCandidateDrawer } from "@/modules/agam/components/create-drawers";
import { AgamTaskRow } from "@/modules/agam/components/task-row";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { cycleInviteAbsoluteUrl } from "@/modules/agam/lib/cycle-invite";
import { formatAgamDate, toDateInputValue } from "@/modules/agam/lib/date-format";
import { TimelineDatePicker } from "@/modules/agam/components/timeline-date-picker";
import { canEvaluate, canRamad } from "@/modules/agam/lib/permissions";
import { cardClass, fieldClass, iconChipClass, pageShellClass, panelClass, panelPadClass, primaryButtonClass, secondaryButtonClass } from "@/modules/agam/lib/ui";
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
  const [inviteCopied, setInviteCopied] = useState(false);
  const [inviteRotating, setInviteRotating] = useState(false);

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

  const copyInviteLink = async () => {
    if (!cycle.invite_slug) return;
    try {
      await navigator.clipboard.writeText(cycleInviteAbsoluteUrl(cycle.invite_slug));
      setInviteCopied(true);
      toast.success("קישור ההרשמה הועתק");
      window.setTimeout(() => setInviteCopied(false), 1800);
    } catch {
      toast.error("העתקה נכשלה");
    }
  };

  const rotateInviteLink = async () => {
    if (
      !window.confirm(
        "ליצור קישור חדש? הקישור הישן יפסיק לעבוד עבור מועמדים שטרם נרשמו.",
      )
    ) {
      return;
    }
    setInviteRotating(true);
    try {
      const data = await agamFetch<{ cycle: AgamCycle }>(`/api/agam/cycles/${id}`, {
        method: "PUT",
        body: JSON.stringify({ rotateInviteSlug: true }),
      });
      setPayload((current) => (current ? { ...current, cycle: data.cycle } : current));
      toast.success("נוצר קישור הרשמה חדש");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "חידוש הקישור נכשל");
    } finally {
      setInviteRotating(false);
    }
  };

  const metaLine = [
    formatCycleDate(cycle.cycle_date),
    cycle.cohort_year ? `שנתון ${cycle.cohort_year}` : null,
    cycle.notes?.trim() || null,
  ]
    .filter(Boolean)
    .join(" · ");

  const showInvite = !cycle.archived && Boolean(cycle.invite_slug);

  return (
    <div className={`${pageShellClass} mx-auto max-w-5xl`}>
      <header className={`${panelClass} ${panelPadClass}`}>
        <Link href="/agam/cycles" className="text-xs font-bold text-accent-primary">
          ← שנתונים
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-primary/12 text-accent-primary">
              <CalendarDays size={18} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-extrabold tracking-tight text-text-primary">
                {cycle.name}
              </h1>
              {metaLine ? (
                <p className="mt-1 text-sm text-text-secondary">{metaLine}</p>
              ) : null}
              {showInvite ? (
                <p className="mt-1 text-xs text-text-muted">שלחו למועמדים למילוי שאלון והצטרפות אוטומטית</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {showInvite ? (
              <button type="button" className={secondaryButtonClass} onClick={() => void copyInviteLink()}>
                {inviteCopied ? <Check size={15} /> : <Link2 size={15} />}
                {inviteCopied ? "הועתק" : "קישור הרשמה"}
              </button>
            ) : null}
            <Link href={`/agam/cycles/${id}/ranking`} className={secondaryButtonClass}>
              <Trophy size={15} />
              דירוג
            </Link>
            <Link href={`/agam/cycles/${id}/bahad1`} className={secondaryButtonClass}>
              <Flag size={15} />
              בה״ד 1
            </Link>
            {canEdit || canDelete ? (
              <CycleManageMenu
                canEdit={canEdit}
                canDelete={canDelete}
                canRotateInvite={canDelete && showInvite}
                inviteRotating={inviteRotating}
                onEdit={() => setEditOpen(true)}
                onArchive={() => void archiveCycle()}
                onDelete={() => void deleteCycle()}
                onRotateInvite={() => void rotateInviteLink()}
              />
            ) : null}
          </div>
        </div>
      </header>

      <section className={`${panelClass} ${panelPadClass}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Users size={17} className="text-accent-primary" />
              <h2 className="text-base font-extrabold text-text-primary">מועמדים</h2>
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold tabular-nums text-text-muted">
                {candidates.length}
              </span>
            </div>
            {candidates.length > 0 ? (
              <p className="mt-0.5 text-xs text-text-muted">
                {statusCounts.pending ? `${statusCounts.pending} ממתינים` : null}
                {statusCounts.pending && statusCounts.passed ? " · " : null}
                {statusCounts.passed ? `${statusCounts.passed} עברו` : null}
              </p>
            ) : null}
          </div>
          {canEdit && candidates.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              <button type="button" className={secondaryButtonClass} onClick={() => setAssignOpen(true)}>
                <UserPlus size={14} />
                שיוך
              </button>
              <button type="button" className={primaryButtonClass} onClick={() => setCreateOpen(true)}>
                <Plus size={14} />
                מועמד
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
          <div className="mt-5 flex flex-col items-start gap-3 rounded-2xl bg-surface-2/70 px-4 py-5">
            <p className="text-sm font-bold text-text-primary">עדיין אין מועמדים במחזור</p>
            <p className="text-xs leading-relaxed text-text-muted">
              שלחו את קישור ההרשמה, או הוסיפו מועמד ידנית.
            </p>
            {canEdit ? (
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className={primaryButtonClass} onClick={() => setCreateOpen(true)}>
                  <Plus size={14} />
                  מועמד חדש
                </button>
                <button
                  type="button"
                  className="text-xs font-bold text-accent-primary transition hover:underline"
                  onClick={() => setAssignOpen(true)}
                >
                  שיוך קיימים
                </button>
              </div>
            ) : null}
          </div>
        ) : filteredCandidates.length === 0 ? (
          <p className="mt-5 text-sm text-text-muted">לא נמצאו מועמדים לחיפוש.</p>
        ) : (
          <ul className={`mt-3 ${candidateCaseGridClass}`}>
            {filteredCandidates.map((candidate) => (
              <li key={candidate.id}>
                <CandidateCaseCard
                  candidate={candidate}
                  fromCycleId={id}
                  action={
                    canEdit ? (
                      <button
                        type="button"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-text-muted opacity-0 transition hover:bg-rose-500/10 hover:text-rose-600 group-hover:opacity-100 focus-visible:opacity-100"
                        onClick={() => void removeCandidate(candidate.id)}
                        title="הסרה מהמחזור"
                        aria-label="הסרה מהמחזור"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : null
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <details className={`${panelClass} group/tasks`}>
        <summary className={`flex cursor-pointer list-none items-center gap-2 ${panelPadClass} [&::-webkit-details-marker]:hidden`}>
          <ListTodo size={16} className="text-text-muted" />
          <span className="text-sm font-bold text-text-primary">משימות</span>
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold tabular-nums text-text-muted">
            {tasks.length}
          </span>
          <ChevronDown
            size={16}
            className="ms-auto text-text-muted transition group-open/tasks:rotate-180"
          />
        </summary>
        <div className={`ui-divider-top max-w-xl px-4 pb-4 pt-3 sm:px-5`}>
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

function CycleManageMenu({
  canEdit,
  canDelete,
  canRotateInvite = false,
  inviteRotating = false,
  onEdit,
  onArchive,
  onDelete,
  onRotateInvite,
}: {
  canEdit: boolean;
  canDelete: boolean;
  canRotateInvite?: boolean;
  inviteRotating?: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onRotateInvite?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={iconChipClass}
        aria-expanded={open}
        aria-label="פעולות מחזור"
        onClick={() => setOpen((current) => !current)}
      >
        <MoreHorizontal size={16} />
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-20 mt-1.5 min-w-[10.5rem] overflow-hidden rounded-xl border border-border-weak bg-surface-1 py-1 shadow-lg">
          {canEdit ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-start text-sm font-semibold text-text-primary transition hover:bg-surface-2"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
            >
              <Pencil size={14} />
              עריכה
            </button>
          ) : null}
          {canRotateInvite ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-start text-sm font-semibold text-text-primary transition hover:bg-surface-2 disabled:opacity-50"
              disabled={inviteRotating}
              onClick={() => {
                setOpen(false);
                onRotateInvite?.();
              }}
            >
              <RefreshCw size={14} className={inviteRotating ? "animate-spin" : undefined} />
              {inviteRotating ? "מחדש…" : "חידוש קישור"}
            </button>
          ) : null}
          {canDelete ? (
            <>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-start text-sm font-semibold text-text-primary transition hover:bg-surface-2"
                onClick={() => {
                  setOpen(false);
                  onArchive();
                }}
              >
                <Archive size={14} />
                ארכיון
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-start text-sm font-semibold text-rose-700 transition hover:bg-rose-500/10"
                onClick={() => {
                  setOpen(false);
                  onDelete();
                }}
              >
                <Trash2 size={14} />
                מחיקה
              </button>
            </>
          ) : null}
        </div>
      ) : null}
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
