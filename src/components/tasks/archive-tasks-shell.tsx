"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  FolderKanban,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { DomainTopicTabs } from "@/components/domain-topic-tabs";
import { TaskDetailsModal } from "@/components/task-details-modal";
import { TasksTable } from "@/components/tasks/tasks-table";
import { TaskFilterBar } from "@/components/tasks/task-filter-bar";
import { TaskFilter, defaultTaskFilters, isTaskFilterActive } from "@/lib/tasks/task-filter";
import {
  domainKeys,
  domainCardStyle,
  groupTasksByDomain,
  type DomainKey,
} from "@/lib/ui/domains";
import { toHebrewSubtopicLabel } from "@/lib/ui/labels";
import { TaskWithRelations } from "@/types/models";

type ViewMode = "timeline" | "table";

interface ArchiveTasksShellProps {
  tasks: TaskWithRelations[];
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("he-IL", { month: "long", year: "numeric" });
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" });
}

export function ArchiveTasksShell({ tasks }: ArchiveTasksShellProps) {
  const [activeDomain, setActiveDomain] = useState<DomainKey | "all">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("timeline");
  const [filters, setFilters] = useState(defaultTaskFilters);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<{ id: string; title: string } | null>(null);

  const filterEngine = useMemo(() => new TaskFilter(tasks), [tasks]);
  const matchedTasks = useMemo(() => filterEngine.apply(filters), [filterEngine, filters]);

  const grouped = useMemo(() => groupTasksByDomain(matchedTasks), [matchedTasks]);
  const counts = useMemo(
    () => ({
      recruitment: grouped.recruitment.length,
      positioning: grouped.positioning.length,
      general: grouped.general.length,
    }),
    [grouped],
  );

  const visibleDomains = activeDomain === "all" ? domainKeys : [activeDomain];

  const filteredTasks = useMemo(
    () => visibleDomains.flatMap((key) => grouped[key]),
    [visibleDomains, grouped],
  );

  const byMonth = useMemo(() => {
    const map = new Map<string, TaskWithRelations[]>();
    for (const task of filteredTasks) {
      const key = monthKey(new Date(task.updated_at));
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredTasks]);

  const toggleMonth = (key: string) => {
    setExpandedMonths((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const openTask = (task: TaskWithRelations) => setSelectedTask({ id: task.id, title: task.title });

  return (
    <section className="space-y-5">
      <div className="dashboard-glass overflow-hidden rounded-3xl">
        <div className="bg-gradient-to-l from-emerald-500/15 via-surface-1 to-teal-400/10 px-5 py-6 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-[0_14px_30px_-8px_rgba(16,185,129,0.55)]">
                <Archive size={26} />
              </span>
              <div>
                <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">ארכיון משימות</h1>
                <p className="mt-1 text-sm font-medium text-text-secondary">
                  כל המשימות שהושלמו — מסודרות לפי תאריך סיום
                </p>
              </div>
            </div>
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
          </div>
        </div>

        <div className="space-y-4 border-t border-border-weak/60 px-5 py-4 sm:px-6">
          <TaskFilterBar
            state={filters}
            onChange={setFilters}
            subtopicOptions={filterEngine.subtopicOptions}
            projectOptions={filterEngine.projectOptions}
            assigneeOptions={filterEngine.assigneeOptions}
            accentRingClass="focus:ring-emerald-400/35"
          />
          <DomainTopicTabs active={activeDomain} counts={counts} onChange={setActiveDomain} />
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="rounded-3xl bg-surface-2/60 px-6 py-16 text-center">
          <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-500">
            <CheckCircle2 size={32} />
          </span>
          <p className="mt-4 text-base font-semibold text-text-primary">אין משימות בארכיון</p>
          <p className="mt-1 text-sm text-text-muted">
            {isTaskFilterActive(filters) ? "לא נמצאו תוצאות לסינון." : "משימות שהושלמו יופיעו כאן אוטומטית."}
          </p>
        </div>
      ) : viewMode === "table" ? (
        <TasksTable tasks={filteredTasks} onSelect={openTask} />
      ) : (
        <div className="space-y-4">
          {byMonth.map(([key, monthTasks]) => {
            const expanded = expandedMonths.size === 0 || expandedMonths.has(key);
            return (
              <section key={key} className="dashboard-glass overflow-hidden rounded-3xl">
                <button
                  type="button"
                  onClick={() => toggleMonth(key)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-start transition hover:bg-surface-2/50"
                >
                  <span className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-600">
                      <CalendarCheck size={18} />
                    </span>
                    <span>
                      <span className="block text-base font-bold text-text-primary">{monthLabel(key)}</span>
                      <span className="text-xs font-medium text-text-muted">{monthTasks.length} משימות</span>
                    </span>
                  </span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {expanded ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2 border-t border-border-weak/50 px-4 py-4 sm:px-5">
                        {monthTasks.map((task) => (
                          <ArchiveTaskRow key={task.id} task={task} onClick={() => openTask(task)} />
                        ))}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </section>
            );
          })}
        </div>
      )}

      {selectedTask ? (
        <TaskDetailsModal
          open={Boolean(selectedTask)}
          onClose={() => setSelectedTask(null)}
          taskId={selectedTask.id}
          taskTitle={selectedTask.title}
        />
      ) : null}
    </section>
  );
}

function ArchiveTaskRow({ task, onClick }: { task: TaskWithRelations; onClick: () => void }) {
  const domain = domainCardStyle(task.domain_name);
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-2xl bg-surface-2/50 px-3 py-3 text-start transition hover:bg-surface-2 sm:gap-4 sm:px-4"
    >
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600 transition group-hover:bg-emerald-500/20">
        <CheckCircle2 size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-bold text-text-primary group-hover:text-emerald-700 sm:text-base">
            {task.title}
          </span>
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${domain.pillClass}`}>
            {domain.label}
          </span>
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
          <span className="inline-flex items-center gap-1">
            <FolderKanban size={12} />
            {task.subtopic_name ? toHebrewSubtopicLabel(task.subtopic_name) : "ללא תת-נושא"}
          </span>
          {task.project_name ? <span>{task.project_name}</span> : null}
          <span className="inline-flex items-center gap-1">
            <UserRound size={12} />
            {task.assignee_name ?? "לא משויך"}
          </span>
        </span>
      </span>
      <span className="shrink-0 text-end text-xs font-medium text-text-muted">
        <span className="block text-[10px] uppercase tracking-wide opacity-70">הושלם</span>
        {formatDate(task.updated_at)}
      </span>
    </button>
  );
}

function ViewModeToggle({ value, onChange }: { value: ViewMode; onChange: (mode: ViewMode) => void }) {
  const base = "rounded-full px-3 py-1.5 text-xs font-bold transition";
  const active = "bg-emerald-600 text-white shadow-sm";
  const idle = "text-text-secondary hover:text-text-primary";
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-surface-2/80 p-1">
      <button type="button" onClick={() => onChange("timeline")} className={`${base} ${value === "timeline" ? active : idle}`}>
        ציר זמן
      </button>
      <button type="button" onClick={() => onChange("table")} className={`${base} ${value === "table" ? active : idle}`}>
        טבלה
      </button>
    </div>
  );
}
