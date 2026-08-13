"use client";

import { useEffect, useMemo, useState } from "react";
import { TaskDetailsModal } from "@/components/task-details-modal";
import { TasksTable } from "@/components/tasks/tasks-table";
import { TaskFilterBar } from "@/components/tasks/task-filter-bar";
import { mergeTaskList, useTasksLiveSync } from "@/components/tasks/tasks-live-sync";
import { TaskFilter, defaultTaskFilters, type FilterOption } from "@/lib/tasks/task-filter";
import type { TaskWithRelations } from "@/types/models";

interface DovrutTasksShellProps {
  tasks: TaskWithRelations[];
}

function withDovrutDisplayName(task: TaskWithRelations): TaskWithRelations {
  const link = [task.dovrut_campaign_name, task.dovrut_project_name, task.dovrut_concept_name]
    .filter(Boolean)
    .join(" · ");
  return {
    ...task,
    project_name: link || "משימה כללית",
  };
}

function uniqueOptions(
  tasks: TaskWithRelations[],
  pickId: (task: TaskWithRelations) => string | null | undefined,
  pickLabel: (task: TaskWithRelations) => string | null | undefined,
): FilterOption[] {
  const map = new Map<string, string>();
  for (const task of tasks) {
    const id = pickId(task);
    const label = pickLabel(task);
    if (id && label) map.set(id, label);
  }
  return Array.from(map.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "he"));
}

const selectClass =
  "min-w-0 flex-1 rounded-xl bg-surface-2 px-3 py-2.5 text-sm font-semibold text-text-primary outline-none transition focus:ring-2 focus:ring-accent-primary/30 sm:flex-none";

export function DovrutTasksShell({ tasks: initialTasks }: DovrutTasksShellProps) {
  const { subscribe } = useTasksLiveSync();
  const [tasks, setTasks] = useState(initialTasks);
  const [filters, setFilters] = useState(defaultTaskFilters);
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [dovrutProjectFilter, setDovrutProjectFilter] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    return subscribe((changes) => {
      setTasks((current) =>
        mergeTaskList(current, changes).filter((task) => task.origin === "dovrut"),
      );
    });
  }, [subscribe]);

  const campaignOptions = useMemo(
    () => uniqueOptions(tasks, (task) => task.dovrut_campaign_id, (task) => task.dovrut_campaign_name),
    [tasks],
  );

  const dovrutProjectOptions = useMemo(() => {
    const scoped =
      campaignFilter === "all"
        ? tasks
        : tasks.filter((task) => task.dovrut_campaign_id === campaignFilter);
    return uniqueOptions(
      scoped,
      (task) => task.dovrut_project_id,
      (task) => task.dovrut_project_name,
    );
  }, [tasks, campaignFilter]);

  const scopedByDovrut = useMemo(() => {
    return tasks.filter((task) => {
      if (campaignFilter !== "all" && task.dovrut_campaign_id !== campaignFilter) return false;
      if (dovrutProjectFilter !== "all" && task.dovrut_project_id !== dovrutProjectFilter) {
        return false;
      }
      return true;
    });
  }, [tasks, campaignFilter, dovrutProjectFilter]);

  const displayTasks = useMemo(() => scopedByDovrut.map(withDovrutDisplayName), [scopedByDovrut]);
  const filterEngine = useMemo(() => new TaskFilter(displayTasks), [displayTasks]);
  const filteredTasks = useMemo(() => filterEngine.apply(filters), [filterEngine, filters]);
  const hasExtraFilters = campaignFilter !== "all" || dovrutProjectFilter !== "all";

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">משימות כלליות</h1>
          <p className="mt-1 text-sm text-text-muted">
            משימות שנוצרו מתוך דוברות — עם שיוך אופציונלי לקמפיין / פרויקט / אייטם, ותתי-נושא שמחברים גם למערכת המשימות.
          </p>
        </div>
      </div>

      <TaskFilterBar
        state={filters}
        onChange={setFilters}
        subtopicOptions={filterEngine.subtopicOptions}
        projectOptions={[]}
        assigneeOptions={filterEngine.assigneeOptions}
        hideProjectFilter
        onClearExtra={
          hasExtraFilters
            ? () => {
                setCampaignFilter("all");
                setDovrutProjectFilter("all");
              }
            : undefined
        }
        extraFilters={
          <>
            <select
              value={campaignFilter}
              onChange={(event) => {
                setCampaignFilter(event.target.value);
                setDovrutProjectFilter("all");
              }}
              className={selectClass}
              aria-label="סינון לפי קמפיין"
            >
              <option value="all">כל הקמפיינים</option>
              {campaignOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={dovrutProjectFilter}
              onChange={(event) => setDovrutProjectFilter(event.target.value)}
              className={selectClass}
              aria-label="סינון לפי פרויקט דוברות"
            >
              <option value="all">כל הפרויקטים</option>
              {dovrutProjectOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </>
        }
      />

      <TasksTable
        tasks={filteredTasks}
        onSelect={(task) => setSelectedTask({ id: task.id, title: task.title })}
      />

      {selectedTask ? (
        <TaskDetailsModal
          open
          onClose={() => setSelectedTask(null)}
          taskId={selectedTask.id}
          taskTitle={selectedTask.title}
        />
      ) : null}
    </div>
  );
}
