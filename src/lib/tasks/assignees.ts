export type TaskAssigneeFields = {
  assignee_ids?: string[] | null;
  assigned_to?: string | null;
};

export function getTaskAssigneeIds(task: TaskAssigneeFields): string[] {
  return task.assignee_ids ?? (task.assigned_to ? [task.assigned_to] : []);
}

export function isTaskAssignedToUser(task: TaskAssigneeFields, userId: string): boolean {
  return getTaskAssigneeIds(task).includes(userId);
}
