import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DomainPreviewTask } from "@/services/dashboard.service";

interface DomainCardProps {
  id: string;
  name: string;
  activeTasks: number;
  activeProjects: number;
  progress: number;
  gradientClass: string;
  previewTasks: DomainPreviewTask[];
}

export function DomainCard(props: DomainCardProps) {
  const statusLabel = {
    in_progress: "בתהליך",
  } as const;

  const priorityLabel = {
    low: "נמוכה",
    medium: "בינונית",
    high: "גבוהה",
  } as const;

  return (
    <div className="space-y-3">
      <Link
        href={`/domains/${props.id}`}
        className={`${props.gradientClass} group glow-ring block rounded-2xl p-5 text-white shadow-lg transition duration-200 hover:scale-[1.02]`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{props.name}</h2>
          <ArrowRight size={18} className="transition group-hover:translate-x-1" />
        </div>
        <p className="mt-4 text-sm opacity-90">משימות פעילות: {props.activeTasks}</p>
        <p className="text-sm opacity-90">פרויקטים פעילים: {props.activeProjects}</p>
        <div className="mt-4 h-2 rounded-full bg-white/30">
          <div
            className="h-full rounded-full bg-white transition-all"
            style={{ width: `${Math.min(props.progress, 100)}%` }}
          />
        </div>
      </Link>
      <div className="rounded-2xl border border-border-weak bg-surface-1/85 p-3 shadow-sm">
        <p className="text-sm font-semibold text-text-primary">משימות בתחום</p>
        {props.previewTasks.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">אין כרגע משימות פעילות.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {props.previewTasks.map((task) => (
              <li
                key={task.id}
                className="rounded-xl border border-border-weak bg-surface-2/70 px-3 py-2 text-sm text-text-primary"
              >
                <p className="truncate font-medium">{task.title}</p>
                <p className="mt-1 text-xs text-text-muted">
                  סטטוס: {statusLabel[task.status]} | עדיפות: {priorityLabel[task.priority]} | יעד:{" "}
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString("he-IL") : "ללא תאריך"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
