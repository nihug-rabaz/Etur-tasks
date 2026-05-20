import { ActiveTasksShell } from "@/components/tasks/active-tasks-shell";
import { TaskService } from "@/services/task.service";

interface ActiveTasksPageProps {
  searchParams: Promise<{ status?: string; subtopic?: string; user?: string }>;
}

export default async function ActiveTasksPage({ searchParams }: ActiveTasksPageProps) {
  const filters = await searchParams;
  const taskService = new TaskService();
  let tasks = await taskService.getActiveTasks();

  if (filters.status) {
    tasks = tasks.filter((task) => task.status === filters.status);
  }
  if (filters.subtopic) {
    tasks = tasks.filter((task) => task.subtopic_id === filters.subtopic);
  }
  const filterUserId = filters.user;
  if (filterUserId) {
    tasks = tasks.filter((task) => {
      const ids = task.assignee_ids ?? (task.assigned_to ? [task.assigned_to] : []);
      return ids.includes(filterUserId);
    });
  }

  return <ActiveTasksShell tasks={tasks} />;
}
