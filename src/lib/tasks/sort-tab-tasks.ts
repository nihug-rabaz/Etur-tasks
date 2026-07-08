import { TabSectionItem, TabTaskItem } from "@/services/dashboard.service";
import { TaskPriority } from "@/types/models";

const priorityRank: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function compareTabTasksByPriority(a: TabTaskItem, b: TabTaskItem): number {
  return priorityRank[a.priority] - priorityRank[b.priority];
}

export function sortTabTasksByPriority(tasks: TabTaskItem[]): TabTaskItem[] {
  return [...tasks].sort(compareTabTasksByPriority);
}

export function sortTabSectionTasks(section: TabSectionItem): TabSectionItem {
  return {
    ...section,
    standaloneTasks: sortTabTasksByPriority(section.standaloneTasks),
    projects: section.projects.map((project) => ({
      ...project,
      tasks: sortTabTasksByPriority(project.tasks),
    })),
  };
}
