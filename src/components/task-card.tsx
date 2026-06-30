import { Calendar, Flag, UserRound, FolderKanban } from "lucide-react";
import { TaskWithRelations } from "@/types/models";
import { domainCardStyle, domainKeyFromName, type DomainKey } from "@/lib/ui/domains";
import { toHebrewSubtopicLabel } from "@/lib/ui/labels";
import { TaskQuickStatus } from "@/components/tasks/task-quick-status";

interface TaskCardProps {
  task: TaskWithRelations;
}

const domainHeaderColors: Record<DomainKey, string> = {
  recruitment: "#22b8cf",
  positioning: "#fb923c",
  general: "#8b5cf6",
};

const priorityStyle: Record<string, string> = {
  low: "border-emerald-400 bg-emerald-100 text-emerald-800 dark:bg-emerald-500/25 dark:text-emerald-100",
  medium: "border-amber-400 bg-amber-100 text-amber-900 dark:bg-amber-500/25 dark:text-amber-100",
  high: "border-rose-400 bg-rose-100 text-rose-800 dark:bg-rose-500/25 dark:text-rose-100",
};

const priorityLabel: Record<string, string> = {
  low: "נמוכה",
  medium: "בינונית",
  high: "גבוהה",
};

export function TaskCard({ task }: TaskCardProps) {
  const domain = domainCardStyle(task.domain_name);
  const domainKey = domainKeyFromName(task.domain_name);
  const headerBg = domainKey ? domainHeaderColors[domainKey] : "#64748b";

  return (
    <article className="surface-card relative overflow-hidden">
      <span className={`absolute inset-y-0 start-0 z-10 w-1.5 ${domain.accent}`} aria-hidden />

      <div
        className="flex items-center justify-between gap-2 px-4 py-3 ps-5"
        style={{ backgroundColor: headerBg }}
      >
        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white">
          {domain.label}
        </span>
        <TaskQuickStatus taskId={task.id} status={task.status} size="sm" />
      </div>

      <div className={`px-4 py-4 ps-5 ${domain.body}`}>
        <h3 className="text-lg font-bold leading-snug text-text-primary">{task.title}</h3>
        <div className={`mt-4 space-y-2.5 rounded-xl p-3 ${domain.metaPanel}`}>
          <div className={`flex items-center gap-2 text-sm font-medium ${domain.metaIcon}`}>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 dark:bg-black/25">
              <FolderKanban size={14} />
            </span>
            <span className="text-text-primary">
              {task.subtopic_name ? toHebrewSubtopicLabel(task.subtopic_name) : "ללא תת-נושא"}
            </span>
          </div>
          <div className={`flex items-center gap-2 text-sm font-medium ${domain.metaIcon}`}>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 dark:bg-black/25">
              <UserRound size={14} />
            </span>
            <span className="text-text-primary">{task.assignee_name ?? "לא משויך"}</span>
          </div>
        </div>
      </div>

      <div className={`flex flex-wrap gap-2 px-4 py-3 ps-5 ${domain.footer}`}>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold ${priorityStyle[task.priority]}`}
        >
          <Flag size={13} />
          עדיפות: {priorityLabel[task.priority]}
        </span>
        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold ${domain.dueChip}`}>
          <Calendar size={13} />
          יעד: {task.due_date ? new Date(task.due_date).toLocaleDateString("he-IL") : "ללא תאריך"}
        </span>
      </div>
    </article>
  );
}
