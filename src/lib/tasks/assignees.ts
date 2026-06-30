import { TaskWithRelations } from "@/types/models";

export function getTaskAssigneeIds(task: Pick<TaskWithRelations, "assignee_ids" | "assigned_to">): string[] {
  return task.assignee_ids ?? (task.assigned_to ? [task.assigned_to] : []);
}

export function isTaskAssignedToUser(
  task: Pick<TaskWithRelations, "assignee_ids" | "assigned_to">,
  userId: string,
): boolean {
  return getTaskAssigneeIds(task).includes(userId);
}
