"use client";

import { useState } from "react";
import { Check, CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { formatAgamDateTime } from "@/modules/agam/lib/date-format";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/modules/agam/lib/ui";
import type { AgamLinkedTask } from "@/modules/agam/types";

const actionBtnClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-primary transition hover:bg-accent-primary/12 disabled:opacity-50";

const dangerBtnClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 transition hover:bg-rose-500/10 disabled:opacity-50";

export function AgamTaskRow({
  task,
  currentUserId,
  canAdmin,
  onSaved,
}: {
  task: AgamLinkedTask;
  currentUserId: string;
  canAdmin: boolean;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [dueDate, setDueDate] = useState(task.due_date?.slice(0, 10) ?? "");
  const [saving, setSaving] = useState(false);
  const canManage = canAdmin || task.created_by === currentUserId;
  const done = task.status === "completed";

  const save = async () => {
    setSaving(true);
    try {
      await agamFetch("/api/agam/tasks", {
        method: "PATCH",
        body: JSON.stringify({ id: task.id, title, dueDate: dueDate || null }),
      });
      setEditing(false);
      toast.success("המשימה עודכנה");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "עדכון משימה נכשל");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async () => {
    setSaving(true);
    try {
      await agamFetch("/api/agam/tasks", {
        method: "PATCH",
        body: JSON.stringify({
          id: task.id,
          status: done ? "in_progress" : "completed",
        }),
      });
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "עדכון סטטוס נכשל");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm("למחוק את המשימה?")) return;
    setSaving(true);
    try {
      await agamFetch(`/api/agam/tasks?id=${task.id}`, { method: "DELETE" });
      toast.success("המשימה נמחקה");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "מחיקת משימה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <li
      className={`rounded-2xl bg-surface-1 px-3.5 py-3 shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent-primary)_14%,transparent)] ${
        done ? "opacity-75" : ""
      }`}
    >
      {editing ? (
        <div className="space-y-2.5">
          <input className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} />
          <input
            type="date"
            className={`${fieldClass} text-left`}
            dir="ltr"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={primaryButtonClass}
              disabled={saving || title.trim().length < 2}
              onClick={() => void save()}
            >
              שמירה
            </button>
            <button type="button" className={secondaryButtonClass} onClick={() => setEditing(false)}>
              ביטול
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={saving || !canManage}
            onClick={() => void toggleStatus()}
            title={done ? "פתיחה מחדש" : "סימון כבוצע"}
            aria-label={done ? "פתיחה מחדש" : "סימון כבוצע"}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition disabled:cursor-default disabled:opacity-50 ${
              done
                ? "bg-emerald-500/15 text-emerald-700"
                : "bg-accent-primary/12 text-text-primary hover:bg-accent-primary/20"
            }`}
          >
            {done ? <CheckCircle2 size={18} /> : <Check size={18} strokeWidth={2.4} />}
          </button>

          <div className="min-w-0 flex-1">
            <p
              className={`truncate text-sm font-extrabold text-text-primary ${
                done ? "line-through opacity-60" : ""
              }`}
            >
              {task.title}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold text-text-muted">
              {task.cycle_name ? <span>{task.cycle_name}</span> : null}
              {task.cycle_name && task.due_date ? <span className="opacity-40">·</span> : null}
              {task.due_date ? <span dir="ltr">{formatAgamDateTime(task.due_date)}</span> : null}
              {!task.cycle_name && !task.due_date ? <span>{done ? "בוצע" : "פתוח"}</span> : null}
            </div>
          </div>

          {canManage ? (
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                className={actionBtnClass}
                title="עריכה"
                aria-label="עריכה"
                onClick={() => setEditing(true)}
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                className={dangerBtnClass}
                title="מחיקה"
                aria-label="מחיקה"
                disabled={saving}
                onClick={() => void remove()}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ) : null}
        </div>
      )}
    </li>
  );
}
