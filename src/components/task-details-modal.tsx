"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarClock,
  Check,
  Clock,
  FileText,
  Flag,
  History,
  Pencil,
  Target,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AssigneeMultiSelect, type AssigneeOption } from "@/components/ui/assignee-select";
import { domainKeyFromName, domainMeta } from "@/lib/ui/domains";
import { toHebrewSubtopicLabel } from "@/lib/ui/labels";

type TaskPriority = "low" | "medium" | "high";
type TaskStatus = "in_progress" | "completed";

interface TaskDetails {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  subtopic_name: string | null;
  domain_name: string | null;
  project_name: string | null;
  assignee_name: string | null;
  assignee_ids: string[] | null;
}

const statusLabel: Record<TaskStatus, string> = {
  in_progress: "בתהליך",
  completed: "הושלמה",
};

const priorityLabel: Record<TaskPriority, string> = {
  low: "נמוכה",
  medium: "בינונית",
  high: "גבוהה",
};

const statusOptions: TaskStatus[] = ["in_progress", "completed"];
const priorityOptions: TaskPriority[] = ["low", "medium", "high"];

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("he-IL", { dateStyle: "medium", timeStyle: "short" });
}

function toDatetimeLocal(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function statusBadgeClass(status: TaskStatus): string {
  if (status === "completed") return "hud-badge hud-badge--closed";
  return "hud-badge hud-badge--progress hud-pulse";
}

function domainLabel(name: string | null | undefined): string {
  if (!name) return "—";
  const key = domainKeyFromName(name);
  return key ? domainMeta[key].label : name;
}

function dueCapsuleClass(due: string | null): string {
  if (!due) return "hud-capsule";
  const date = new Date(due);
  if (Number.isNaN(date.getTime())) return "hud-capsule";
  const now = Date.now();
  const diff = date.getTime() - now;
  const day = 24 * 60 * 60 * 1000;
  if (diff < 0) return "hud-capsule hud-capsule--danger";
  if (diff < 2 * day) return "hud-capsule hud-capsule--warn";
  return "hud-capsule";
}

interface DraftState {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  assignedToIds: string[];
}

export function TaskDetailsModal({
  open,
  onClose,
  taskId,
  taskTitle,
  onUpdated,
}: {
  open: boolean;
  onClose: () => void;
  taskId: string;
  taskTitle: string;
  onUpdated?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [task, setTask] = useState<TaskDetails | null>(null);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [users, setUsers] = useState<AssigneeOption[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!editing || users.length > 0) return;
    let cancelled = false;
    fetch(`/api/create-options`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const list = Array.isArray(data.users) ? (data.users as AssigneeOption[]) : [];
        setUsers(list);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [editing, users.length]);

  useEffect(() => {
    if (!open) return;
    setEditing(false);
    let cancelled = false;
    const load = async () => {
      setError("");
      setLoading(true);
      try {
        const response = await fetch(`/api/tasks/${taskId}`);
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok) {
          setError("לא הצלחנו לטעון את פרטי המשימה.");
          setTask(null);
          return;
        }
        setTask(data.task ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, taskId]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const title = task?.title ?? taskTitle;
  const status: TaskStatus = task?.status ?? "in_progress";
  const priority: TaskPriority = task?.priority ?? "medium";

  const initialDraft = useMemo<DraftState | null>(() => {
    if (!task) return null;
    return {
      title: task.title,
      description: task.description ?? "",
      priority: task.priority,
      status: task.status,
      dueDate: toDatetimeLocal(task.due_date),
      assignedToIds: task.assignee_ids ?? [],
    };
  }, [task]);

  const startEdit = () => {
    if (!initialDraft) return;
    setDraft(initialDraft);
    setEditing(true);
    setError("");
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(null);
    setError("");
  };

  const save = async () => {
    if (!draft || !task) return;
    if (!draft.title.trim()) {
      setError("נדרשת כותרת למשימה.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        id: task.id,
        title: draft.title.trim(),
        description: draft.description.trim() ? draft.description : null,
        status: draft.status,
        priority: draft.priority,
        dueDate: draft.dueDate ? new Date(draft.dueDate).toISOString() : null,
        assignedToIds: draft.assignedToIds,
      };
      const response = await fetch(`/api/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error === "Forbidden" ? "אין לך הרשאה לערוך משימה זו." : "שמירת השינויים נכשלה.");
        return;
      }
      const refresh = await fetch(`/api/tasks/${task.id}`);
      if (refresh.ok) {
        const data = await refresh.json().catch(() => ({}));
        setTask(data.task ?? task);
      }
      setEditing(false);
      setDraft(null);
      onUpdated?.();
    } finally {
      setSaving(false);
    }
  };

  const updateDraft = <K extends keyof DraftState>(key: K, value: DraftState[K]) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  if (!mounted) return null;

  const headerStatus = editing && draft ? draft.status : status;
  const headerPriority = editing && draft ? draft.priority : priority;
  const headerDue = editing && draft ? (draft.dueDate ? new Date(draft.dueDate).toISOString() : null) : task?.due_date ?? null;
  const headerTitle = editing && draft ? draft.title || "—" : title;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-slate-900/35 backdrop-blur-sm"
            onClick={editing ? undefined : onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.section
              onClick={(event) => event.stopPropagation()}
              initial={{ y: 24, opacity: 0, scale: 0.96, filter: "blur(6px)" }}
              animate={{ y: 0, opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ y: 12, opacity: 0, scale: 0.97, filter: "blur(4px)" }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="hud-modal w-full max-w-xl overflow-hidden rounded-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="פרטי משימה"
            >
              {loading || saving ? <span className="hud-loader" /> : null}

              <header className="relative px-6 pt-6 pb-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    {editing && draft ? (
                      <div className="flex items-center gap-2">
                        <Zap size={20} className="shrink-0 text-sky-500 drop-shadow-[0_0_6px_rgba(14,165,233,0.5)]" />
                        <input
                          type="text"
                          value={draft.title}
                          onChange={(event) => updateDraft("title", event.target.value)}
                          placeholder="כותרת המשימה"
                          className="hud-title flex-1 rounded-lg border border-sky-300/60 bg-white/70 px-3 py-1.5 text-2xl font-extrabold leading-tight outline-none ring-0 focus:border-sky-500 sm:text-[26px]"
                        />
                      </div>
                    ) : (
                      <h3 className="hud-title flex items-center gap-2 text-2xl font-extrabold leading-tight sm:text-[26px]">
                        <Zap size={20} className="shrink-0 text-sky-500 drop-shadow-[0_0_6px_rgba(14,165,233,0.5)]" />
                        <span className="truncate">{headerTitle}</span>
                      </h3>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {!editing ? (
                      <button
                        type="button"
                        onClick={startEdit}
                        disabled={!task || loading}
                        aria-label="עריכה"
                        title="עריכה"
                        className="hud-edit-btn"
                      >
                        <Pencil size={15} strokeWidth={2.5} />
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={save}
                          disabled={saving}
                          aria-label="שמירה"
                          title="שמירה"
                          className="hud-save-btn"
                        >
                          <Check size={16} strokeWidth={2.8} />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={saving}
                          aria-label="ביטול"
                          title="ביטול"
                          className="hud-close-btn"
                        >
                          <X size={16} strokeWidth={2.5} />
                        </button>
                      </>
                    )}
                    {!editing ? (
                      <button
                        type="button"
                        onClick={onClose}
                        aria-label="סגירה"
                        className="hud-close-btn"
                      >
                        <X size={16} strokeWidth={2.5} />
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className={statusBadgeClass(headerStatus)}>{statusLabel[headerStatus]}</span>
                  <span className="hud-capsule">
                    <Flag size={12} className="text-fuchsia-600" />
                    עדיפות · {priorityLabel[headerPriority]}
                  </span>
                  <span className={dueCapsuleClass(headerDue)}>
                    <Target size={12} />
                    יעד · {formatDate(headerDue)}
                  </span>
                </div>
              </header>

              <div className="hud-divider" />

              <div className="relative space-y-4 px-6 pb-6 pt-5">
                <section className="hud-glass-card p-4">
                  <div className="flex items-center gap-2">
                    <FileText size={13} className="text-sky-600" />
                    <p className="hud-glass-card__label">Description</p>
                  </div>
                  {editing && draft ? (
                    <textarea
                      value={draft.description}
                      onChange={(event) => updateDraft("description", event.target.value)}
                      placeholder="תיאור המשימה…"
                      rows={4}
                      className="mt-3 w-full resize-y rounded-lg border border-sky-300/60 bg-white/70 px-3 py-2 text-sm leading-relaxed text-slate-800 outline-none focus:border-sky-500"
                    />
                  ) : (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                      {loading
                        ? "טוען נתונים…"
                        : task?.description?.trim()
                          ? task.description
                          : "אין תיאור למשימה הזו."}
                    </p>
                  )}
                  {error ? (
                    <p className="mt-3 font-mono text-xs text-rose-600">⚠ {error}</p>
                  ) : null}
                </section>

                {editing && draft ? (
                  <section className="hud-glass-card space-y-4 p-4">
                    <div>
                      <p className="hud-glass-card__label">סטטוס</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {statusOptions.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => updateDraft("status", option)}
                            className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                              draft.status === option
                                ? "border-sky-500 bg-sky-100 text-sky-800 shadow-[0_0_10px_rgba(14,165,233,0.25)]"
                                : "border-slate-300 bg-white/70 text-slate-600 hover:border-sky-400"
                            }`}
                          >
                            {statusLabel[option]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="hud-glass-card__label">עדיפות</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {priorityOptions.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => updateDraft("priority", option)}
                            className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                              draft.priority === option
                                ? "border-fuchsia-500 bg-fuchsia-100 text-fuchsia-800 shadow-[0_0_10px_rgba(217,70,239,0.25)]"
                                : "border-slate-300 bg-white/70 text-slate-600 hover:border-fuchsia-400"
                            }`}
                          >
                            {priorityLabel[option]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="hud-glass-card__label">תאריך יעד</p>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="datetime-local"
                          value={draft.dueDate}
                          onChange={(event) => updateDraft("dueDate", event.target.value)}
                          className="rounded-lg border border-sky-300/60 bg-white/70 px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-500"
                        />
                        {draft.dueDate ? (
                          <button
                            type="button"
                            onClick={() => updateDraft("dueDate", "")}
                            className="rounded-lg border border-slate-300 bg-white/70 px-2 py-2 text-xs font-semibold text-slate-600 hover:border-rose-400 hover:text-rose-600"
                          >
                            ניקוי
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div>
                      <p className="hud-glass-card__label">משויכים</p>
                      <div className="mt-2">
                        <AssigneeMultiSelect
                          value={draft.assignedToIds}
                          onChange={(ids) => updateDraft("assignedToIds", ids)}
                          users={users}
                        />
                      </div>
                    </div>
                  </section>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <section className="hud-glass-card p-4">
                      <div className="flex items-center gap-2">
                        <Clock size={13} className="text-sky-600" />
                        <p className="hud-glass-card__label">Created</p>
                      </div>
                      <p className="mt-2.5 font-mono text-sm font-semibold text-slate-800">
                        {formatDate(task?.created_at ?? null)}
                      </p>
                    </section>
                    <section className="hud-glass-card p-4">
                      <div className="flex items-center gap-2">
                        <History size={13} className="text-fuchsia-600" />
                        <p className="hud-glass-card__label">Updated</p>
                      </div>
                      <p className="mt-2.5 font-mono text-sm font-semibold text-slate-800">
                        {formatDate(task?.updated_at ?? null)}
                      </p>
                    </section>
                  </div>
                )}

                {!editing && (task?.assignee_name || task?.project_name || task?.subtopic_name) ? (
                  <section className="hud-glass-card p-4">
                    <div className="flex items-center gap-2">
                      <CalendarClock size={13} className="text-sky-600" />
                      <p className="hud-glass-card__label">Context</p>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">תחום</p>
                        <p className="mt-1 font-semibold text-slate-800">{domainLabel(task?.domain_name)}</p>
                      </div>
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">תת-נושא</p>
                        <p className="mt-1 font-semibold text-slate-800">{task?.subtopic_name ? toHebrewSubtopicLabel(task.subtopic_name) : "—"}</p>
                      </div>
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">משויך</p>
                        <p className="mt-1 font-semibold text-slate-800">{task?.assignee_name ?? "—"}</p>
                      </div>
                    </div>
                  </section>
                ) : null}
              </div>
            </motion.section>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
