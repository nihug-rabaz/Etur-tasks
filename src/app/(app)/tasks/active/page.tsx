import { ActiveTasksShell } from "@/components/tasks/active-tasks-shell";
import { AuthorizationService } from "@/services/authorization.service";
import { TaskService } from "@/services/task.service";

interface ActiveTasksPageProps {
  searchParams: Promise<{ status?: string; subtopic?: string; user?: string }>;
}

export default async function ActiveTasksPage({ searchParams }: ActiveTasksPageProps) {
  const filters = await searchParams;
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.ensureApproved();
  const access = await authorizationService.getTaskAccessContext(profile);
  const taskService = new TaskService();
  const tasks = await taskService.getActiveTasks(access, {
    status: filters.status,
    subtopicId: filters.subtopic,
    assigneeUserId: filters.user,
  });

  return <ActiveTasksShell tasks={tasks} currentUserId={profile.id} />;
}
