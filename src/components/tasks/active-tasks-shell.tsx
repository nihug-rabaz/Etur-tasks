"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, LayoutGrid, Rows3, UserRound, Users } from "lucide-react";
import { TaskCard } from "@/components/task-card";
import { DomainTopicTabs } from "@/components/domain-topic-tabs";
import { CreateTaskDrawer } from "@/components/create-task-drawer";
import { TaskDetailsModal } from "@/components/task-details-modal";
import { TasksTable } from "@/components/tasks/tasks-table";
import { TaskFilterBar } from "@/components/tasks/task-filter-bar";
import { isTaskAssignedToUser } from "@/lib/tasks/assignees";
import { TaskFilter, defaultTaskFilters } from "@/lib/tasks/task-filter";
import {
  domainKeys,
  domainMeta,
  groupTasksByDomain,
  type DomainKey,
} from "@/lib/ui/domains";
import { TaskWithRelations } from "@/types/models";

type ViewMode = "cards" | "table";
type TaskScope = "all" | "mine";

interface ActiveTasksShellProps {
  tasks: TaskWithRelations[];
  currentUserId: string;
}

export function ActiveTasksShell({ tasks, currentUserId }: ActiveTasksShellProps) {
  const [taskScope, setTaskScope] = useState<TaskScope>("all");
  const [activeDomain, setActiveDomain] = useState<DomainKey | "all">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [filters, setFilters] = useState(defaultTaskFilters);
  const [collapsedDomains, setCollapsedDomains] = useState<Set<DomainKey>>(
    () => new Set(domainKeys),
  );
  const [selectedTask, setSelectedTask] = useState<{ id: string; title: string } | null>(null);

  const scopedTasks = useMemo(
    () =>
      taskScope === "mine"
        ? tasks.filter((task) => isTaskAssignedToUser(task, currentUserId))
        : tasks,
    [tasks, taskScope, currentUserId],
  );

  const mineCount = useMemo(
    () => tasks.filter((task) => isTaskAssignedToUser(task, currentUserId)).length,
    [tasks, currentUserId],
  );

  const filterEngine = useMemo(() => new TaskFilter(scopedTasks), [scopedTasks]);
  const filteredTasks = useMemo(() => filterEngine.apply(filters), [filterEngine, filters]);

  const grouped = useMemo(() => groupTasksByDomain(filteredTasks), [filteredTasks]);
  const counts = useMemo(
    () => ({
      recruitment: grouped.recruitment.length,
      positioning: grouped.positioning.length,
      general: grouped.general.length,
    }),
    [grouped],
  );

  const visibleDomains = activeDomain === "all" ? domainKeys : [activeDomain];

  const singleDomainTasks =
    activeDomain === "all" ? null : grouped[activeDomain];

  const toggleDomain = (key: DomainKey) => {
    setCollapsedDomains((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const openTaskDetails = (task: TaskWithRelations) =>
    setSelectedTask({ id: task.id, title: task.title });

  return (
    <section className="space-y-5">
      <div className="dashboard-glass rounded-3xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">משימות פעילות</h1>
            <p className="mt-1 text-sm font-medium text-text-secondary">
              {filteredTasks.length} משימות פעילות
              {taskScope === "mine" ? " משויכות אליך" : " (לא הושלמו)"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
            <CreateTaskDrawer triggerLabel="משימה חדשה" />
          </div>
        </div>
        <div className="mt-4 space-y-4">
          <TaskScopeTabs
            active={taskScope}
            allCount={tasks.length}
            mineCount={mineCount}
            onChange={setTaskScope}
          />
          <DomainTopicTabs active={activeDomain} counts={counts} onChange={setActiveDomain} />
          <TaskFilterBar
            state={filters}
            onChange={setFilters}
            subtopicOptions={filterEngine.subtopicOptions}
            projectOptions={filterEngine.projectOptions}
            assigneeOptions={filterEngine.assigneeOptions}
          />
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="rounded-3xl bg-surface-2/60 p-10 text-center text-sm font-medium text-text-secondary">
          {scopedTasks.length === 0
            ? taskScope === "mine"
              ? "אין משימות פעילות משויכות אליך כרגע."
              : "אין משימות פעילות להצגה כרגע."
            : "לא נמצאו משימות התואמות לסינון."}
        </div>
      ) : singleDomainTasks ? (
        singleDomainTasks.length === 0 ? (
          <div className="rounded-2xl bg-surface-2/60 px-4 py-8 text-center text-sm text-text-secondary">
            אין משימות בתחום זה.
          </div>
        ) : viewMode === "table" ? (
          <TasksTable tasks={singleDomainTasks} onSelect={openTaskDetails} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {singleDomainTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => openTaskDetails(task)}
                className="cursor-pointer text-start"
              >
                <TaskCard task={task} />
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-4">
          {visibleDomains.map((key) => {
            const domainTasks = grouped[key];
            if (domainTasks.length === 0) return null;

            const expanded = !collapsedDomains.has(key);
            const meta = domainMeta[key];

            return (
              <DomainTasksSection
                key={key}
                domainKey={key}
                label={meta.label}
                count={domainTasks.length}
                accentClass={meta.header}
                expanded={expanded}
                onToggle={() => toggleDomain(key)}
              >
                {viewMode === "table" ? (
                  <TasksTable tasks={domainTasks} onSelect={openTaskDetails} embedded />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {domainTasks.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => openTaskDetails(task)}
                        className="cursor-pointer text-start"
                      >
                        <TaskCard task={task} />
                      </button>
                    ))}
                  </div>
                )}
              </DomainTasksSection>
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

interface DomainTasksSectionProps {
  domainKey: DomainKey;
  label: string;
  count: number;
  accentClass: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}

function DomainTasksSection({
  domainKey,
  label,
  count,
  accentClass,
  expanded,
  onToggle,
  children,
}: DomainTasksSectionProps) {
  return (
    <section className="dashboard-glass overflow-hidden rounded-3xl" data-domain={domainKey}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-start transition hover:bg-surface-2/50"
      >
        <span className="flex items-center gap-3">
          <span
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-white ${accentClass}`}
          >
            <span className="text-sm font-black">{label.charAt(0)}</span>
          </span>
          <span>
            <span className="block text-base font-bold text-text-primary">{label}</span>
            <span className="text-xs font-medium text-text-muted">{count} משימות</span>
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
            <div className="border-t border-border-weak/50 px-4 py-4 sm:px-5">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

interface TaskScopeTabsProps {
  active: TaskScope;
  allCount: number;
  mineCount: number;
  onChange: (scope: TaskScope) => void;
}

function TaskScopeTabs({ active, allCount, mineCount, onChange }: TaskScopeTabsProps) {
  const baseClass =
    "inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition sm:flex-none sm:px-5";
  const activeClass = "bg-accent-primary text-white shadow-sm";
  const idleClass = "bg-surface-2/80 text-text-secondary hover:bg-surface-2 hover:text-text-primary";

  const tabClass = (selected: boolean) => `${baseClass} ${selected ? activeClass : idleClass}`;
  const countClass = (selected: boolean) =>
    `rounded-full px-2 py-0.5 text-xs tabular-nums ${
      selected ? "bg-white/20" : "bg-surface-1 text-text-muted"
    }`;

  return (
    <div className="flex w-full gap-2 sm:w-auto" role="tablist" aria-label="סינון משימות">
      <button
        type="button"
        role="tab"
        aria-selected={active === "all"}
        onClick={() => onChange("all")}
        className={tabClass(active === "all")}
      >
        <Users size={16} />
        כל המשימות
        <span className={countClass(active === "all")}>{allCount}</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === "mine"}
        onClick={() => onChange("mine")}
        className={tabClass(active === "mine")}
      >
        <UserRound size={16} />
        המשימות שלי
        <span className={countClass(active === "mine")}>{mineCount}</span>
      </button>
    </div>
  );
}

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  const baseClass =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition";
  const activeClass = "bg-text-primary text-surface-1 shadow-sm";
  const idleClass = "text-text-secondary hover:text-text-primary";

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-surface-2/70 p-1">
      <button
        type="button"
        onClick={() => onChange("cards")}
        aria-pressed={value === "cards"}
        title="תצוגת כרטיסיות"
        className={`${baseClass} ${value === "cards" ? activeClass : idleClass}`}
      >
        <LayoutGrid size={14} />
        כרטיסיות
      </button>
      <button
        type="button"
        onClick={() => onChange("table")}
        aria-pressed={value === "table"}
        title="תצוגת טבלה"
        className={`${baseClass} ${value === "table" ? activeClass : idleClass}`}
      >
        <Rows3 size={14} />
        טבלה
      </button>
    </div>
  );
}
