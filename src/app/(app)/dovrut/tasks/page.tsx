import { AuthorizationService } from "@/services/authorization.service";
import { TaskService } from "@/services/task.service";
import { DovrutAccessService } from "@/modules/dovrut/services/access.service";
import { DovrutTasksShell } from "@/modules/dovrut/pages/tasks-page";

export default async function DovrutTasksPage() {
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.ensureApproved();
  const accessService = new DovrutAccessService();
  const role = await accessService.getModuleRole(profile.id);
  if (!role) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm font-semibold text-amber-900">
        אין לכם גישה למודול דוברות.
      </div>
    );
  }

  const taskAccess = await authorizationService.getTaskAccessContext(profile);
  const tasks = await new TaskService().getDovrutTasks(taskAccess);
  const canCreate = accessService.canEditContent(role);

  return <DovrutTasksShell tasks={tasks} canCreate={canCreate} />;
}
