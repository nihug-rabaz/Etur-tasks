import { TaskWithRelations } from "@/types/models";

interface StatusColumnProps {
  title: string;
  tasks: TaskWithRelations[];
  tone: "progress" | "done";
}

const toneClassMap = {
  progress: "border-violet-500/35 bg-violet-500/10",
  done: "border-emerald-500/35 bg-emerald-500/10",
} as const;

export function StatusColumn({ title, tasks, tone }: StatusColumnProps) {
  return (
    <article className={`rounded-2xl border p-3 ${toneClassMap[tone]}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        <span className="rounded-full bg-surface-1/80 px-2 py-0.5 text-xs font-semibold text-text-secondary">
          {tasks.length}
        </span>
      </div>
      {tasks.length === 0 ? (
        <p className="rounded-xl bg-surface-1/70 px-3 py-2 text-sm text-text-muted">אין משימות להצגה.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li key={task.id} className="rounded-xl border border-border-weak bg-surface-1/80 px-3 py-2">
              <p className="truncate text-sm font-medium text-text-primary">{task.title}</p>
              <p className="mt-1 text-xs text-text-muted">
                {(task.domain_name ?? "ללא תחום") + " | " + (task.subtopic_name ?? "ללא תת-נושא")}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                יעד: {task.due_date ? new Date(task.due_date).toLocaleDateString("he-IL") : "ללא תאריך"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
