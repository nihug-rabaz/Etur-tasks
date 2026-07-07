import { TaskPriority, TaskWithRelations } from "@/types/models";
import { toHebrewSubtopicLabel } from "@/lib/ui/labels";

export type DueBucket = "all" | "overdue" | "today" | "week" | "none";

export interface TaskFilterState {
  query: string;
  priority: TaskPriority | "all";
  subtopic: string | "all";
  project: string | "all";
  assignee: string | "all";
  due: DueBucket;
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface NormalizedFilterTask {
  title: string;
  priority: TaskPriority;
  dueDate: string | null;
  subtopic: string | null;
  project: string | null;
  assigneeNames: string[];
}

export const defaultTaskFilters: TaskFilterState = {
  query: "",
  priority: "all",
  subtopic: "all",
  project: "all",
  assignee: "all",
  due: "all",
};

export function isTaskFilterActive(state: TaskFilterState): boolean {
  return (
    state.query.trim() !== "" ||
    state.priority !== "all" ||
    state.subtopic !== "all" ||
    state.project !== "all" ||
    state.assignee !== "all" ||
    state.due !== "all"
  );
}

// Shared predicate: decides whether a normalized task passes a filter state.
export function taskMatchesFilters(task: NormalizedFilterTask, state: TaskFilterState): boolean {
  const query = state.query.trim().toLowerCase();
  if (query) {
    const blob = `${task.title} ${task.subtopic ?? ""} ${task.project ?? ""} ${task.assigneeNames.join(" ")}`;
    if (!blob.toLowerCase().includes(query)) return false;
  }
  if (state.priority !== "all" && task.priority !== state.priority) return false;
  if (state.subtopic !== "all" && task.subtopic !== state.subtopic) return false;
  if (state.project !== "all" && task.project !== state.project) return false;
  if (state.assignee !== "all" && !task.assigneeNames.includes(state.assignee)) return false;
  if (state.due !== "all" && !matchesDueBucket(task.dueDate, state.due)) return false;
  return true;
}

export function matchesDueBucket(dueDate: string | null, bucket: DueBucket): boolean {
  if (bucket === "all") return true;
  if (bucket === "none") return !dueDate;
  if (!dueDate) return false;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  if (bucket === "overdue") return due < startOfToday;
  if (bucket === "today") return due >= startOfToday && due < startOfTomorrow;
  const endOfWeek = new Date(startOfToday);
  endOfWeek.setDate(endOfWeek.getDate() + 7);
  return due >= startOfToday && due < endOfWeek;
}

export function distinctFilterValues<T>(
  items: T[],
  pick: (item: T) => string | null | undefined,
): string[] {
  const values = new Set<string>();
  for (const item of items) {
    const value = pick(item);
    if (value) values.add(value);
  }
  return Array.from(values).sort((a, b) => a.localeCompare(b, "he"));
}

// Encapsulates deriving filter options and applying a filter state over a flat task list.
export class TaskFilter {
  constructor(private readonly tasks: TaskWithRelations[]) {}

  get subtopicOptions(): FilterOption[] {
    return distinctFilterValues(this.tasks, (task) => task.subtopic_name).map((name) => ({
      value: name,
      label: toHebrewSubtopicLabel(name),
    }));
  }

  get projectOptions(): FilterOption[] {
    return distinctFilterValues(this.tasks, (task) => task.project_name).map((name) => ({
      value: name,
      label: name,
    }));
  }

  get assigneeOptions(): FilterOption[] {
    return distinctFilterValues(this.tasks, (task) => task.assignee_name).map((name) => ({
      value: name,
      label: name,
    }));
  }

  apply(state: TaskFilterState): TaskWithRelations[] {
    return this.tasks.filter((task) =>
      taskMatchesFilters(
        {
          title: task.title,
          priority: task.priority,
          dueDate: task.due_date,
          subtopic: task.subtopic_name ?? null,
          project: task.project_name ?? null,
          assigneeNames: task.assignee_name ? [task.assignee_name] : [],
        },
        state,
      ),
    );
  }
}
