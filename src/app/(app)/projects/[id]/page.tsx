import { ProjectService } from "@/services/project.service";
import { TaskService } from "@/services/task.service";
import { AuthorizationService } from "@/services/authorization.service";
import { redirect } from "next/navigation";
import { CreateTaskDrawer } from "@/components/create-task-drawer";
import { DeleteProjectButton } from "@/components/delete-project-button";
import { ProjectKanban } from "@/components/project-kanban";
import { CalendarClock, Layers } from "lucide-react";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; user?: string }>;
}

export default async function ProjectPage({ params, searchParams }: ProjectPageProps) {
  const { id } = await params;
  const filters = await searchParams;
  const projectService = new ProjectService();
  const taskService = new TaskService();
  const project = await projectService.getOne(id);
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.ensureAuthenticated();
  if (project && profile.role !== "admin") {
    const allowed = await authorizationService.canAccessSubtopic(profile.id, project.subtopic_id);
    if (!allowed) {
      redirect("/dashboard");
    }
  }
  const access = await authorizationService.getTaskAccessContext(profile);
  let tasks = await taskService.getByProject(access, id);
  if (filters.status) {
    tasks = tasks.filter((task) => task.status === filters.status);
  }
  const filterUserId = filters.user;
  if (filterUserId) {
    tasks = tasks.filter((task) => {
      const ids = task.assignee_ids ?? (task.assigned_to ? [task.assigned_to] : []);
      return ids.includes(filterUserId);
    });
  }

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-border-weak bg-gradient-to-l from-accent-primary/20 via-surface-1 to-accent-secondary/20 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">{project?.name ?? "פרויקט"}</h1>
            <p className="mt-2 text-sm text-text-secondary">{project?.description}</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full border border-border-weak bg-surface-2/70 px-3 py-1 text-text-secondary">
              <Layers size={12} className="me-1 inline" />
              קנבן חי
            </span>
            <span className="rounded-full border border-border-weak bg-surface-2/70 px-3 py-1 text-text-secondary">
              <CalendarClock size={12} className="me-1 inline" />
              {tasks.length} משימות
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <CreateTaskDrawer
          triggerLabel="הוספת משימה"
          defaultSubtopicId={project?.subtopic_id}
          defaultProjectId={project?.id}
        />
        {project ? <DeleteProjectButton projectId={project.id} redirectTo="/dashboard" /> : null}
      </div>
      <ProjectKanban tasks={tasks} />
    </section>
  );
}
