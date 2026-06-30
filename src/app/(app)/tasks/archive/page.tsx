import { ArchiveTasksShell } from "@/components/tasks/archive-tasks-shell";
import { AuthorizationService } from "@/services/authorization.service";
import { TaskService } from "@/services/task.service";

export default async function ArchiveTasksPage() {
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.ensureApproved();
  const access = await authorizationService.getTaskAccessContext(profile);
  const tasks = await new TaskService().getCompletedTasks(access);
  return <ArchiveTasksShell tasks={tasks} />;
}
