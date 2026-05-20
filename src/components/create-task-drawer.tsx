"use client";

import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarClock,
  FolderKanban,
  Layers,
  Plus,
  Rocket,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { AssigneeMultiSelect, type AssigneeOption } from "@/components/ui/assignee-select";
import { toHebrewSubtopicLabel } from "@/lib/ui/labels";

interface OptionItem {
  id: string;
  name: string;
}

interface CreateTaskDrawerProps {
  triggerLabel?: string;
  defaultSubtopicId?: string;
  defaultProjectId?: string | null;
  compact?: boolean;
  floating?: boolean;
  iconOnly?: boolean;
}

const fieldClass =
  "w-full rounded-2xl border border-border-weak bg-surface-2/50 px-4 py-3 text-sm text-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition placeholder:text-text-muted focus:border-accent-primary/55 focus:bg-surface-1 focus:ring-2 focus:ring-accent-primary/22";

const labelClass =
  "mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-text-muted";

const cardClass =
  "rounded-2xl border border-border-weak/90 bg-surface-2/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";

function FieldBlock({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div>
      <div className={labelClass}>
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}

const PRIORITY_SEGMENTS = [
  { value: "low", label: "נמוך" },
  { value: "medium", label: "בינוני" },
  { value: "high", label: "גבוה" },
] as const;

const STATUS_SEGMENTS = [
  { value: "open", label: "פתוחה" },
  { value: "in_progress", label: "בתהליך" },
  { value: "completed", label: "הושלמה" },
] as const;

export function CreateTaskDrawer({
  triggerLabel = "משימה חדשה",
  defaultSubtopicId,
  defaultProjectId,
  compact = false,
  floating = false,
  iconOnly = false,
}: CreateTaskDrawerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subtopics, setSubtopics] = useState<OptionItem[]>([]);
  const [projects, setProjects] = useState<Array<OptionItem & { subtopic_id: string }>>([]);
  const [users, setUsers] = useState<AssigneeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState("");
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [subtopicId, setSubtopicId] = useState(defaultSubtopicId ?? "");
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [assignedToIds, setAssignedToIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("open");

  useEffect(() => {
    if (!open) return;
    const loadOptions = async () => {
      setOptionsLoading(true);
      setOptionsError("");
      try {
        const response = await fetch("/api/create-options", { credentials: "include" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const message =
            response.status === 403
              ? "החשבון ממתין לאישור מנהל"
              : typeof data.error === "string"
                ? data.error
                : "לא הצלחנו לטעון אפשרויות ליצירת משימה";
          setSubtopics([]);
          setProjects([]);
          setUsers([]);
          setOptionsError(message);
          return;
        }
        const nextSubtopics = data.subtopics ?? [];
        const nextProjects = data.projects ?? [];
        setSubtopics(nextSubtopics);
        setProjects(nextProjects);
        setUsers(
          (data.users ?? []).map((u: { id: string; name: string; avatar?: string | null }) => ({
            id: u.id,
            name: u.name,
            avatar: u.avatar ?? null,
          })),
        );
        if (nextSubtopics.length === 0) {
          setOptionsError("אין תת-נושאים זמינים. פנה למנהל להקצות הרשאות.");
          return;
        }
        setSubtopicId((current) => {
          if (current && nextSubtopics.some((item: OptionItem) => item.id === current)) {
            return current;
          }
          if (defaultSubtopicId && nextSubtopics.some((item: OptionItem) => item.id === defaultSubtopicId)) {
            return defaultSubtopicId;
          }
          return nextSubtopics[0].id;
        });
      } finally {
        setOptionsLoading(false);
      }
    };
    loadOptions();
  }, [open, defaultSubtopicId]);

  const filteredProjects = useMemo(
    () => projects.filter((item) => item.subtopic_id === subtopicId),
    [projects, subtopicId],
  );

  const handleSubtopicChange = (value: string) => {
    setSubtopicId(value);
    if (!projectId) return;
    const isProjectValid = projects.some(
      (item) => item.subtopic_id === value && item.id === projectId,
    );
    if (!isProjectValid) {
      setProjectId("");
    }
  };

  const handleSubmit = async () => {
    setError("");
    if (!title.trim()) {
      setError("שם משימה הוא שדה חובה");
      return;
    }
    if (!subtopicId) {
      setError("יש לבחור תת-נושא");
      return;
    }
    setLoading(true);
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        subtopicId,
        projectId: projectId || null,
        assignedToIds,
        dueDate: dueDate || null,
        description: description || null,
        priority,
        status,
      }),
    });
    setLoading(false);
    if (!response.ok) {
      setError("לא הצלחנו ליצור משימה, נסה שוב");
      return;
    }
    toast.success("המשימה נוצרה בהצלחה 👍");
    setOpen(false);
    setTitle("");
    setDescription("");
    router.refresh();
  };

  const openDrawer = (event?: MouseEvent) => {
    event?.stopPropagation();
    if (defaultSubtopicId) setSubtopicId(defaultSubtopicId);
    if (defaultProjectId) setProjectId(defaultProjectId);
    setOpen(true);
  };

  const drawerHeader = (
    <div className="relative overflow-hidden rounded-2xl border border-border-weak bg-gradient-to-br from-accent-primary/18 via-surface-2/35 to-accent-cyan/14 p-5 shadow-[0_12px_40px_rgba(79,70,229,0.14)] dark:shadow-[0_12px_48px_rgba(91,140,255,0.18)]">
      <div className="pointer-events-none absolute -left-10 -top-6 h-36 w-36 rounded-full bg-accent-secondary/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -right-6 h-40 w-40 rounded-full bg-accent-cyan/25 blur-3xl" />
      <div className="relative flex items-start gap-4">
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-accent-primary to-accent-cyan text-white shadow-[0_8px_28px_rgba(79,70,229,0.45)]">
          <Rocket size={22} strokeWidth={2} />
        </span>
        <div className="min-w-0 space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-accent-primary">יצירה מהירה</p>
          <h2 className="text-xl font-bold leading-tight text-text-primary sm:text-2xl">משימה חדשה במערכת</h2>
          <p className="text-sm leading-relaxed text-text-secondary">
            הגדירו כותרת, שיוך ופרויקט — והמשימה תופיע בלוח מיד.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {iconOnly ? (
        <button
          type="button"
          onClick={openDrawer}
          title="משימה חדשה בפרויקט"
          aria-label="משימה חדשה בפרויקט"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border-weak bg-surface-1/90 text-text-secondary transition hover:border-accent-primary/55 hover:bg-accent-primary/10 hover:text-accent-primary"
        >
          <Plus size={15} strokeWidth={2.25} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => openDrawer()}
          className={
            floating
              ? "fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 rounded-full border border-accent-primary/50 bg-gradient-to-l from-accent-primary to-accent-cyan px-5 py-3 text-sm font-medium text-white shadow-[0_0_34px_rgba(91,140,255,0.45)] transition hover:scale-[1.03]"
              : compact
                ? "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-l from-accent-primary to-accent-cyan px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-accent-primary/30 transition hover:scale-[1.02]"
                : "inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-accent-primary to-accent-cyan px-4 py-2 text-sm font-medium text-white shadow-md shadow-accent-primary/30 transition hover:scale-[1.02]"
          }
        >
          <Plus size={16} />
          {triggerLabel}
        </button>
      )}

      <Drawer open={open} onClose={() => setOpen(false)} customHeader={drawerHeader}>
        <div className="space-y-5">
          <FieldBlock
            icon={<Layers size={14} className="text-accent-primary" />}
            label="שם המשימה"
          >
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleSubmit()}
              placeholder="למשל: סיכום פגישה, אישור חומרים, מעקב אחר ספק…"
              className={`${fieldClass} text-base font-medium`}
            />
          </FieldBlock>

          <div className={cardClass}>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-text-muted">איפה זה יושב</p>
            {optionsLoading ? (
              <p className="mb-3 text-sm text-text-secondary">טוען תת-נושאים ופרויקטים…</p>
            ) : null}
            {optionsError ? (
              <div className="mb-3 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
                {optionsError}
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldBlock
                icon={<FolderKanban size={14} className="text-accent-cyan" />}
                label="תת-נושא"
              >
                <select
                  value={subtopicId}
                  onChange={(event) => handleSubtopicChange(event.target.value)}
                  disabled={optionsLoading || subtopics.length === 0}
                  className={fieldClass}
                >
                  <option value="">בחר תת-נושא</option>
                  {subtopics.map((item) => (
                    <option key={item.id} value={item.id}>
                      {toHebrewSubtopicLabel(item.name)}
                    </option>
                  ))}
                </select>
              </FieldBlock>
              <FieldBlock
                icon={<FolderKanban size={14} className="text-accent-secondary" />}
                label="פרויקט"
              >
                <select
                  value={projectId}
                  onChange={(event) => setProjectId(event.target.value)}
                  disabled={optionsLoading || !subtopicId}
                  className={fieldClass}
                >
                  <option value="">ללא פרויקט</option>
                  {filteredProjects.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </FieldBlock>
            </div>
          </div>

          <div className={`${cardClass} space-y-4`}>
            <FieldBlock
              icon={<Sparkles size={14} className="text-accent-secondary" />}
              label="תיאור"
            >
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="הקשר, קישורים, הערות קצרות…"
                rows={4}
                className={`${fieldClass} min-h-[100px] resize-y`}
              />
            </FieldBlock>
            <div>
              <p className={labelClass}>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                עדיפות
              </p>
              <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border-weak bg-surface-2/40 p-1.5">
                {PRIORITY_SEGMENTS.map((item) => {
                  const active = priority === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setPriority(item.value)}
                      className={`rounded-xl py-2.5 text-xs font-bold transition ${
                        active
                          ? "bg-gradient-to-l from-accent-primary to-accent-cyan text-white shadow-md shadow-accent-primary/30"
                          : "text-text-secondary hover:bg-surface-1/80 hover:text-text-primary"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className={labelClass}>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                סטטוס
              </p>
              <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border-weak bg-surface-2/40 p-1.5">
                {STATUS_SEGMENTS.map((item) => {
                  const active = status === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setStatus(item.value)}
                      className={`rounded-xl py-2.5 text-xs font-bold transition ${
                        active
                          ? "border border-accent-primary/50 bg-surface-1 text-accent-primary shadow-[0_0_20px_rgba(91,140,255,0.15)]"
                          : "text-text-secondary hover:bg-surface-1/80 hover:text-text-primary"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={cardClass}>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-text-muted">אנשים וזמן</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldBlock
                icon={<UserRound size={14} className="text-accent-primary" />}
                label="שיוך למשתמשים"
              >
                <AssigneeMultiSelect value={assignedToIds} onChange={setAssignedToIds} users={users} />
              </FieldBlock>
              <FieldBlock
                icon={<CalendarClock size={14} className="text-accent-cyan" />}
                label="תאריך יעד"
              >
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className={`${fieldClass} font-mono text-[13px]`}
                />
              </FieldBlock>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-700 dark:text-rose-300">
              {error}
            </div>
          ) : null}

          <div className="sticky bottom-0 z-[1] -mx-6 mt-2 border-t border-border-weak/80 bg-gradient-to-t from-surface-1 via-surface-1/97 to-transparent px-6 pt-5 pb-2 backdrop-blur-md">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-2xl border border-border-weak bg-surface-2/60 px-5 py-3 text-sm font-semibold text-text-primary transition hover:border-border-strong hover:bg-surface-2"
              >
                ביטול
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleSubmit}
                className="rounded-2xl bg-gradient-to-l from-accent-primary to-accent-cyan px-6 py-3 text-sm font-bold text-white shadow-[0_10px_32px_rgba(79,70,229,0.35)] transition hover:shadow-[0_12px_36px_rgba(79,70,229,0.45)] disabled:opacity-55"
              >
                {loading ? "יוצרים משימה…" : "יצירת משימה"}
              </button>
            </div>
          </div>
        </div>
      </Drawer>
    </>
  );
}
