"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, GripVertical, Plus } from "lucide-react";
import { TaskWithRelations } from "@/types/models";

interface ProjectKanbanProps {
  tasks: TaskWithRelations[];
}

export function ProjectKanban({ tasks }: ProjectKanbanProps) {
  const router = useRouter();
  const [dragTaskId, setDragTaskId] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const activeTasks = useMemo(
    () => tasks.filter((task) => task.status !== "completed"),
    [tasks],
  );

  const updateTask = (payload: { id: string; status?: "completed"; title?: string }) => {
    startTransition(async () => {
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      router.refresh();
    });
  };

  return (
    <section className="rounded-3xl border border-violet-500/40 bg-violet-500/10 p-3 transition">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">בתהליך</h3>
        <span className="rounded-full border border-border-weak bg-surface-1/80 px-2 py-0.5 text-xs text-text-secondary">
          {activeTasks.length}
        </span>
      </div>
      <div
        className={`space-y-2 ${isPending ? "opacity-80" : ""}`}
        onDragOver={(event) => event.preventDefault()}
      >
        {activeTasks.map((task) => (
          <article
            key={task.id}
            draggable
            onDragStart={() => setDragTaskId(task.id)}
            onDragEnd={() => setDragTaskId("")}
            className="rounded-2xl bg-surface-1 p-3 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <input
                defaultValue={task.title}
                onBlur={(event) => {
                  const next = event.target.value.trim();
                  if (!next || next === task.title) return;
                  updateTask({ id: task.id, title: next });
                }}
                className="w-full rounded-lg border border-transparent bg-transparent px-1 text-sm font-semibold text-text-primary outline-none transition focus:border-border-strong"
              />
              <GripVertical size={14} className="text-text-muted" />
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-text-muted">
              <span>{task.assignee_name ?? "לא משויך"}</span>
              <span>{task.due_date ? new Date(task.due_date).toLocaleDateString("he-IL") : "ללא יעד"}</span>
            </div>
            <button
              type="button"
              onClick={() => updateTask({ id: task.id, status: "completed" })}
              disabled={isPending}
              className="mt-3 inline-flex items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-500/20 disabled:opacity-60"
            >
              <Check size={12} />
              סימון כהושלם
            </button>
          </article>
        ))}
      </div>
      {dragTaskId ? (
        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => {
            updateTask({ id: dragTaskId, status: "completed" });
            setDragTaskId("");
          }}
          className="mt-3 rounded-2xl border border-dashed border-emerald-500/50 bg-emerald-500/10 px-3 py-4 text-center text-xs font-semibold text-emerald-700"
        >
          גרור לכאן לסימון כהושלם
        </div>
      ) : (
        <button className="mt-3 inline-flex items-center gap-1 rounded-xl border border-accent-primary/40 bg-accent-primary/10 px-3 py-1.5 text-xs font-semibold text-accent-primary">
          <Plus size={12} />
          הוספה לעמודה
        </button>
      )}
    </section>
  );
}
