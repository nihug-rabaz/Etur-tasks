"use client";

import { Filter, Search, X } from "lucide-react";
import {
  FilterOption,
  TaskFilterState,
  defaultTaskFilters,
  isTaskFilterActive,
} from "@/lib/tasks/task-filter";
import { TaskPriority } from "@/types/models";

interface TaskFilterBarProps {
  state: TaskFilterState;
  onChange: (next: TaskFilterState) => void;
  subtopicOptions: FilterOption[];
  projectOptions: FilterOption[];
  assigneeOptions: FilterOption[];
  accentRingClass?: string;
}

const priorityOptions: Array<{ value: TaskPriority | "all"; label: string }> = [
  { value: "all", label: "כל העדיפויות" },
  { value: "high", label: "עדיפות גבוהה" },
  { value: "medium", label: "עדיפות בינונית" },
  { value: "low", label: "עדיפות נמוכה" },
];

const dueOptions: Array<{ value: TaskFilterState["due"]; label: string }> = [
  { value: "all", label: "כל התאריכים" },
  { value: "overdue", label: "באיחור" },
  { value: "today", label: "להיום" },
  { value: "week", label: "השבוע" },
  { value: "none", label: "ללא תאריך" },
];

const selectClass =
  "min-w-0 flex-1 rounded-xl bg-surface-2 px-3 py-2.5 text-sm font-semibold text-text-primary outline-none transition focus:ring-2 focus:ring-accent-primary/30 sm:flex-none";

export function TaskFilterBar({
  state,
  onChange,
  subtopicOptions,
  projectOptions,
  assigneeOptions,
  accentRingClass = "focus:ring-accent-primary/30",
}: TaskFilterBarProps) {
  const update = <K extends keyof TaskFilterState>(key: K, value: TaskFilterState[K]) =>
    onChange({ ...state, [key]: value });

  const active = isTaskFilterActive(state);

  return (
    <div className="space-y-3">
      <div className="relative flex items-center">
        <Search size={18} className="pointer-events-none absolute start-4 text-text-muted" aria-hidden />
        <input
          type="search"
          value={state.query}
          onChange={(event) => update("query", event.target.value)}
          placeholder="חיפוש לפי שם משימה, תת-נושא, פרויקט או משויך…"
          className={`w-full rounded-full bg-surface-2 py-3 ps-11 pe-4 text-sm text-text-primary outline-none transition focus:ring-2 ${accentRingClass}`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-text-muted">
          <Filter size={14} />
          סינון
        </span>

        <select
          value={state.priority}
          onChange={(event) => update("priority", event.target.value as TaskFilterState["priority"])}
          className={selectClass}
          aria-label="סינון לפי עדיפות"
        >
          {priorityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={state.due}
          onChange={(event) => update("due", event.target.value as TaskFilterState["due"])}
          className={selectClass}
          aria-label="סינון לפי תאריך יעד"
        >
          {dueOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {subtopicOptions.length > 0 ? (
          <select
            value={state.subtopic}
            onChange={(event) => update("subtopic", event.target.value)}
            className={selectClass}
            aria-label="סינון לפי תת-נושא"
          >
            <option value="all">כל תתי-הנושא</option>
            {subtopicOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : null}

        {projectOptions.length > 0 ? (
          <select
            value={state.project}
            onChange={(event) => update("project", event.target.value)}
            className={selectClass}
            aria-label="סינון לפי פרויקט"
          >
            <option value="all">כל הפרויקטים</option>
            {projectOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : null}

        {assigneeOptions.length > 0 ? (
          <select
            value={state.assignee}
            onChange={(event) => update("assignee", event.target.value)}
            className={selectClass}
            aria-label="סינון לפי משויך"
          >
            <option value="all">כל המשויכים</option>
            {assigneeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : null}

        {active ? (
          <button
            type="button"
            onClick={() => onChange(defaultTaskFilters)}
            className="inline-flex items-center gap-1 rounded-full bg-surface-2/80 px-3 py-2 text-xs font-bold text-text-secondary transition hover:bg-surface-2 hover:text-text-primary"
          >
            <X size={13} />
            נקה סינון
          </button>
        ) : null}
      </div>
    </div>
  );
}
