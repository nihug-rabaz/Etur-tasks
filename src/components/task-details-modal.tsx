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
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { AssigneeMultiSelect, UserAvatarMark, type AssigneeOption } from "@/components/ui/assignee-select";
import { TaskChatPanel } from "@/components/tasks/task-chat-panel";
import { domainKeyFromName, domainMeta } from "@/lib/ui/domains";
import { toHebrewSubtopicLabel } from "@/lib/ui/labels";

type TaskPriority = "low" | "medium" | "high";
type TaskStatus = "in_progress" | "completed";

interface TaskAssignee {
  id: string;
  name: string;
  avatar: string | null;
}

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
  assignees?: TaskAssignee[];
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

type BadgeMenu = "status" | "priority" | "due" | null;

function BadgePopover({
  open,
  onClose,
  anchorRef,
  children,
  width = 188,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  width?: number;
}) {
  const menuId = useId();
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const sync = () => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let left = rect.left;
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
    if (left < 8) left = 8;
    let top = rect.bottom + 8;
    const estimatedHeight = 170;
    if (top + estimatedHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - estimatedHeight - 8);
    }
    setPos({ top, left });
  };

  useLayoutEffect(() => {
    if (!open) return;
    sync();
    const onReflow = () => sync();
    window.addEventListener("scroll", onReflow, true);
    window.addEventListener("resize", onReflow);
    return () => {
      window.removeEventListener("scroll", onReflow, true);
      window.removeEventListener("resize", onReflow);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (anchorRef.current?.contains(event.target as Node)) return;
      const menu = document.getElementById(menuId);
      if (menu?.contains(event.target as Node)) return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, menuId, anchorRef]);

  if (!open) return null;

  return createPortal(
    <div
      id={menuId}
      style={{ position: "fixed", top: pos.top, left: pos.left, width, zIndex: 21000 }}
      className="rounded-2xl border border-amber-200/80 bg-white p-2 shadow-[0_18px_40px_-12px_rgba(15,23,42,0.3)]"
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  );
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
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  taskId: string;
  taskTitle: string;
  onUpdated?: () => void;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [task, setTask] = useState<TaskDetails | null>(null);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [users, setUsers] = useState<AssigneeOption[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [badgeMenu, setBadgeMenu] = useState<BadgeMenu>(null);
  const statusBadgeRef = useRef<HTMLButtonElement>(null);
  const priorityBadgeRef = useRef<HTMLButtonElement>(null);
  const dueBadgeRef = useRef<HTMLButtonElement>(null);

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
    setConfirmDelete(false);
    setBadgeMenu(null);
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
      if (event.key === "Escape" && !editing) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, editing]);

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
    setBadgeMenu(null);
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
      setBadgeMenu(null);
      onUpdated?.();
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const updateDraft = <K extends keyof DraftState>(key: K, value: DraftState[K]) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  // Permanently removes the task and refreshes the underlying lists.
  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error === "Forbidden" ? "אין לך הרשאה למחוק משימה זו." : "מחיקת המשימה נכשלה.");
        return;
      }
      onDeleted?.();
      onClose();
      router.refresh();
    } finally {
      setDeleting(false);
    }
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
              className="hud-modal font-sans flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="פרטי משימה"
            >
              {loading || saving ? <span className="hud-loader" /> : null}

              <header className="relative shrink-0 px-6 pt-6 pb-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  {!loading && task ? (
                    <p className="flex min-w-0 items-center justify-start gap-1.5 text-[11px] font-semibold text-amber-800/65">
                      <Clock size={11} className="text-amber-600/85" />
                      <span>נוצר · {formatDate(task.created_at)}</span>
                    </p>
                  ) : (
                    <span />
                  )}
                  <div className="flex shrink-0 items-center gap-2">
                    {editing ? (
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
                    ) : (
                      <>
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
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(true)}
                          disabled={!task || loading}
                          aria-label="מחיקה"
                          title="מחיקה"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                        >
                          <Trash2 size={15} strokeWidth={2.5} />
                        </button>
                        <button
                          type="button"
                          onClick={onClose}
                          aria-label="סגירה"
                          className="hud-close-btn"
                        >
                          <X size={16} strokeWidth={2.5} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  {editing && draft ? (
                    <div className="flex items-center gap-2">
                      <Zap size={20} className="shrink-0 text-amber-600" />
                      <input
                        type="text"
                        autoFocus
                        value={draft.title}
                        onChange={(event) => updateDraft("title", event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") void save();
                        }}
                        placeholder="כותרת המשימה"
                        className="hud-title flex-1 rounded-xl border border-amber-300/70 bg-white px-3 py-2 text-xl leading-snug outline-none ring-0 focus:border-amber-500 sm:text-2xl"
                      />
                    </div>
                  ) : (
                    <h3 className="hud-title flex items-start gap-2 text-xl leading-snug sm:text-2xl">
                      <Zap size={20} className="mt-1 shrink-0 text-amber-600" />
                      <span className="break-words">{headerTitle}</span>
                    </h3>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {editing && draft ? (
                    <>
                      <button
                        ref={statusBadgeRef}
                        type="button"
                        onClick={() => setBadgeMenu((current) => (current === "status" ? null : "status"))}
                        className={`${statusBadgeClass(headerStatus)} cursor-pointer transition hover:brightness-95`}
                      >
                        {statusLabel[headerStatus]}
                      </button>
                      <button
                        ref={priorityBadgeRef}
                        type="button"
                        onClick={() => setBadgeMenu((current) => (current === "priority" ? null : "priority"))}
                        className="hud-capsule cursor-pointer transition hover:brightness-95"
                      >
                        <Flag size={12} className="text-fuchsia-600" />
                        עדיפות · {priorityLabel[headerPriority]}
                      </button>
                      <button
                        ref={dueBadgeRef}
                        type="button"
                        onClick={() => setBadgeMenu((current) => (current === "due" ? null : "due"))}
                        className={`${dueCapsuleClass(headerDue)} cursor-pointer transition hover:brightness-95`}
                      >
                        <Target size={12} />
                        יעד · {formatDate(headerDue)}
                      </button>

                      <BadgePopover
                        open={badgeMenu === "status"}
                        onClose={() => setBadgeMenu(null)}
                        anchorRef={statusBadgeRef}
                      >
                        <p className="px-2 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          סטטוס
                        </p>
                        {statusOptions.map((option) => {
                          const active = draft.status === option;
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                updateDraft("status", option);
                                setBadgeMenu(null);
                              }}
                              className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-bold transition ${
                                active
                                  ? "bg-amber-100 text-amber-900"
                                  : "text-slate-700 hover:bg-amber-50"
                              }`}
                            >
                              <span>{statusLabel[option]}</span>
                              {active ? <Check size={13} strokeWidth={2.8} /> : null}
                            </button>
                          );
                        })}
                      </BadgePopover>

                      <BadgePopover
                        open={badgeMenu === "priority"}
                        onClose={() => setBadgeMenu(null)}
                        anchorRef={priorityBadgeRef}
                      >
                        <p className="px-2 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          עדיפות
                        </p>
                        {priorityOptions.map((option) => {
                          const active = draft.priority === option;
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                updateDraft("priority", option);
                                setBadgeMenu(null);
                              }}
                              className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-bold transition ${
                                active
                                  ? "bg-orange-100 text-orange-900"
                                  : "text-slate-700 hover:bg-orange-50"
                              }`}
                            >
                              <span>{priorityLabel[option]}</span>
                              {active ? <Check size={13} strokeWidth={2.8} /> : null}
                            </button>
                          );
                        })}
                      </BadgePopover>

                      <BadgePopover
                        open={badgeMenu === "due"}
                        onClose={() => setBadgeMenu(null)}
                        anchorRef={dueBadgeRef}
                        width={240}
                      >
                        <p className="px-2 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          תאריך יעד
                        </p>
                        <input
                          type="datetime-local"
                          value={draft.dueDate}
                          onChange={(event) => updateDraft("dueDate", event.target.value)}
                          className="w-full rounded-xl border border-amber-300/70 bg-white px-3 py-2 text-sm text-amber-950 outline-none focus:border-amber-500"
                        />
                        <div className="mt-2 flex items-center justify-end gap-2">
                          {draft.dueDate ? (
                            <button
                              type="button"
                              onClick={() => updateDraft("dueDate", "")}
                              className="rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-rose-600 transition hover:bg-rose-50"
                            >
                              ניקוי
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setBadgeMenu(null)}
                            className="rounded-lg bg-amber-500 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-amber-600"
                          >
                            סיום
                          </button>
                        </div>
                      </BadgePopover>
                    </>
                  ) : (
                    <>
                      <span className={statusBadgeClass(headerStatus)}>{statusLabel[headerStatus]}</span>
                      <span className="hud-capsule">
                        <Flag size={12} className="text-fuchsia-600" />
                        עדיפות · {priorityLabel[headerPriority]}
                      </span>
                      <span className={dueCapsuleClass(headerDue)}>
                        <Target size={12} />
                        יעד · {formatDate(headerDue)}
                      </span>
                    </>
                  )}
                </div>
              </header>

              <div className="hud-divider shrink-0" />

              <div className="hud-modal-body-scroll relative min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-6 pb-6 pt-5">
                {confirmDelete ? (
                  <section className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                    <p className="text-sm font-bold text-rose-700">למחוק את המשימה?</p>
                    <p className="mt-1 text-xs text-rose-600">פעולה זו אינה הפיכה והמשימה תוסר לצמיתות.</p>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting}
                        className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-60"
                      >
                        <Trash2 size={14} />
                        {deleting ? "מוחק…" : "מחיקה"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        disabled={deleting}
                        className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
                      >
                        ביטול
                      </button>
                    </div>
                  </section>
                ) : null}
                <section className="hud-glass-card p-4">
                  <div className="flex items-center gap-2">
                    <FileText size={13} className="text-amber-700" />
                    <p className="hud-glass-card__label">תיאור</p>
                  </div>
                  {editing && draft ? (
                    <textarea
                      value={draft.description}
                      onChange={(event) => updateDraft("description", event.target.value)}
                      placeholder="תיאור המשימה…"
                      rows={4}
                      className="mt-3 w-full resize-y rounded-xl border border-amber-300/60 bg-white px-3 py-2.5 text-sm leading-relaxed text-amber-950 outline-none focus:border-amber-500"
                    />
                  ) : (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-amber-950/90">
                      {loading
                        ? "טוען נתונים…"
                        : task?.description?.trim()
                          ? task.description
                          : "אין תיאור למשימה הזו."}
                    </p>
                  )}
                  {error ? (
                    <p className="mt-3 text-sm text-rose-600">{error}</p>
                  ) : null}
                </section>

                {editing && draft ? (
                  <section className="hud-glass-card space-y-4 p-4">
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
                ) : null}

                {!editing && task ? (
                  <section className="hud-glass-card p-4">
                    <div className="flex items-center gap-2">
                      <CalendarClock size={13} className="text-amber-700" />
                      <p className="hud-glass-card__label">שיוך ומיקום</p>
                    </div>
                    <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-amber-800/70">תחום</p>
                        <p className="mt-1 font-semibold text-amber-950">{domainLabel(task?.domain_name)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-amber-800/70">תת-נושא</p>
                        <p className="mt-1 font-semibold text-amber-950">{task?.subtopic_name ? toHebrewSubtopicLabel(task.subtopic_name) : "—"}</p>
                      </div>
                      {task?.project_name ? (
                        <div>
                          <p className="text-xs font-medium text-amber-800/70">פרויקט</p>
                          <p className="mt-1 font-semibold text-amber-950">{task.project_name}</p>
                        </div>
                      ) : null}
                      <div className="sm:col-span-2">
                        <p className="text-xs font-medium text-amber-800/70">משויכים</p>
                        {task.assignees && task.assignees.length > 0 ? (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {task.assignees.map((person) => (
                              <span
                                key={person.id}
                                title={person.name}
                                className="group relative inline-flex items-center gap-2 rounded-full border border-amber-200/70 bg-amber-50/90 py-1 pe-3 ps-1 transition hover:border-amber-400 hover:bg-white"
                              >
                                <UserAvatarMark
                                  name={person.name}
                                  avatarUrl={person.avatar}
                                  size="xs"
                                  variant="flush"
                                />
                                <span className="max-w-[7.5rem] truncate text-xs font-bold text-amber-950">
                                  {person.name.split(" ")[0]}
                                </span>
                                <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-amber-950 px-2.5 py-1 text-[11px] font-semibold text-amber-50 opacity-0 shadow-lg transition group-hover:opacity-100">
                                  {person.name}
                                </span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-1 font-semibold text-amber-950">{task.assignee_name ?? "—"}</p>
                        )}
                      </div>
                    </div>
                  </section>
                ) : null}

                {!editing && open && taskId ? <TaskChatPanel taskId={taskId} open={open} /> : null}
              </div>

              {!loading && task ? (
                <p className="flex shrink-0 items-center justify-end gap-1.5 border-t border-amber-200/35 px-6 py-3 text-[11px] font-semibold text-fuchsia-700/70">
                  <History size={11} className="text-fuchsia-600/85" />
                  <span>עדכון אחרון ב {formatDate(task.updated_at)}</span>
                </p>
              ) : null}
            </motion.section>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
