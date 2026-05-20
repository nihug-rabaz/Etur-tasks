"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Plus } from "lucide-react";
import { TaskWithRelations } from "@/types/models";

interface ProjectKanbanProps {
  tasks: TaskWithRelations[];
}

type KanbanStatus = "open" | "in_progress" | "completed";

const statusLabel: Record<KanbanStatus, string> = {
  open: "פתוחות",
  in_progress: "בתהליך",
  completed: "הושלמו",
};

const laneTone: Record<KanbanStatus, string> = {
  open: "border-sky-500/40 bg-sky-500/10",
  in_progress: "border-violet-500/40 bg-violet-500/10",
  completed: "border-emerald-500/40 bg-emerald-500/10",
};

export function ProjectKanban({ tasks }: ProjectKanbanProps) {
  const router = useRouter();
  const [dragTaskId, setDragTaskId] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const lanes = useMemo(() => {
    return {
      open: tasks.filter((task) => task.status === "open"),
      in_progress: tasks.filter((task) => task.status === "in_progress"),
      completed: tasks.filter((task) => task.status === "completed"),
    };
  }, [tasks]);

  const updateTask = (payload: { id: string; status?: KanbanStatus; title?: string }) => {
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
    <section className="grid gap-4 xl:grid-cols-3">
      {(Object.keys(lanes) as KanbanStatus[]).map((statusKey) => (
        <div
          key={statusKey}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => {
            if (!dragTaskId) return;
            updateTask({ id: dragTaskId, status: statusKey });
            setDragTaskId("");
          }}
          className={`rounded-3xl border p-3 transition ${laneTone[statusKey]} ${isPending ? "opacity-80" : ""}`}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">{statusLabel[statusKey]}</h3>
            <span className="rounded-full border border-border-weak bg-surface-1/80 px-2 py-0.5 text-xs text-text-secondary">
              {lanes[statusKey].length}
            </span>
          </div>
          <div className="space-y-2">
            {lanes[statusKey].map((task) => (
              <article
                key={task.id}
                draggable
                onDragStart={() => setDragTaskId(task.id)}
                className="rounded-2xl border border-border-weak bg-surface-1/85 p-3 shadow-[0_8px_28px_rgba(2,6,23,0.28)] transition hover:-translate-y-0.5 hover:border-accent-primary/40"
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
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>{task.assignee_name ?? "לא משויך"}</span>
                  <span>{task.due_date ? new Date(task.due_date).toLocaleDateString("he-IL") : "ללא יעד"}</span>
                </div>
              </article>
            ))}
          </div>
          <button className="mt-3 inline-flex items-center gap-1 rounded-xl border border-accent-primary/40 bg-accent-primary/10 px-3 py-1.5 text-xs font-semibold text-accent-primary">
            <Plus size={12} />
            הוספה לעמודה
          </button>
        </div>
      ))}
    </section>
  );
}
