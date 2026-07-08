import { TabSectionItem, TabTaskItem } from "@/services/dashboard.service";
import { toHebrewSubtopicLabel } from "@/lib/ui/labels";
import {
  FilterOption,
  NormalizedFilterTask,
  TaskFilterState,
  distinctFilterValues,
  isTaskFilterActive,
  taskMatchesFilters,
} from "@/lib/tasks/task-filter";
import { sortTabSectionTasks } from "@/lib/tasks/sort-tab-tasks";

// Applies the shared task filters over the section/project hierarchy of a dashboard tab.
export class TabTaskFilter {
  constructor(private readonly sections: TabSectionItem[]) {}

  private allTasks(): Array<{ task: TabTaskItem; section: string; project: string | null }> {
    const items: Array<{ task: TabTaskItem; section: string; project: string | null }> = [];
    for (const section of this.sections) {
      for (const task of section.standaloneTasks) {
        items.push({ task, section: section.name, project: null });
      }
      for (const project of section.projects) {
        for (const task of project.tasks) {
          items.push({ task, section: section.name, project: project.name });
        }
      }
    }
    return items;
  }

  private normalize(task: TabTaskItem, section: string, project: string | null): NormalizedFilterTask {
    return {
      title: task.title,
      priority: task.priority,
      dueDate: task.dueDate,
      subtopic: section,
      project,
      assigneeNames: task.assignees.map((person) => person.name),
    };
  }

  get subtopicOptions(): FilterOption[] {
    return distinctFilterValues(this.sections, (section) => section.name).map((name) => ({
      value: name,
      label: toHebrewSubtopicLabel(name),
    }));
  }

  get projectOptions(): FilterOption[] {
    const names = this.sections.flatMap((section) => section.projects.map((project) => project.name));
    return distinctFilterValues(names, (name) => name).map((name) => ({ value: name, label: name }));
  }

  get assigneeOptions(): FilterOption[] {
    const names = this.allTasks().flatMap((entry) => entry.task.assignees.map((person) => person.name));
    return distinctFilterValues(names, (name) => name).map((name) => ({ value: name, label: name }));
  }

  apply(state: TaskFilterState): TabSectionItem[] {
    if (!isTaskFilterActive(state)) return this.sections;
    return this.sections
      .map((section) => {
        const standaloneTasks = section.standaloneTasks.filter((task) =>
          taskMatchesFilters(this.normalize(task, section.name, null), state),
        );
        const projects = section.projects
          .map((project) => ({
            ...project,
            tasks: project.tasks.filter((task) =>
              taskMatchesFilters(this.normalize(task, section.name, project.name), state),
            ),
          }))
          .filter((project) => project.tasks.length > 0);
        return sortTabSectionTasks({ ...section, standaloneTasks, projects });
      })
      .filter((section) => section.standaloneTasks.length > 0 || section.projects.length > 0);
  }
}
