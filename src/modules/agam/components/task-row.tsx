"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { formatAgamDateTime } from "@/modules/agam/lib/date-format";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/modules/agam/lib/ui";
import type { AgamLinkedTask } from "@/modules/agam/types";

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
          status: task.status === "completed" ? "in_progress" : "completed",
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
    <li className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
      {editing ? (
        <div className="space-y-2">
          <input className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} />
          <input
            type="date"
            className={`${fieldClass} text-left`}
            dir="ltr"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" className={primaryButtonClass} disabled={saving || title.trim().length < 2} onClick={() => void save()}>
              שמירה
            </button>
            <button type="button" className={secondaryButtonClass} onClick={() => setEditing(false)}>
              ביטול
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className={task.status === "completed" ? "line-through opacity-60" : "font-bold"}>{task.title}</span>
            {task.status === "completed" ? <CheckCircle2 size={16} className="text-emerald-600" /> : null}
          </div>
          {task.cycle_name ? <p className="mt-1 text-xs font-semibold text-accent-primary">{task.cycle_name}</p> : null}
          {task.due_date ? <p className="mt-1 text-xs text-text-muted">{formatAgamDateTime(task.due_date)}</p> : null}
          {canManage ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className="text-xs font-bold text-accent-primary" disabled={saving} onClick={() => void toggleStatus()}>
                {task.status === "completed" ? "פתיחה מחדש" : "סימון בוצע"}
              </button>
              <button type="button" className="text-xs font-bold text-accent-primary" onClick={() => setEditing(true)}>
                עריכה
              </button>
              <button type="button" className="text-xs font-bold text-rose-600" disabled={saving} onClick={() => void remove()}>
                מחיקה
              </button>
            </div>
          ) : null}
        </>
      )}
    </li>
  );
}
