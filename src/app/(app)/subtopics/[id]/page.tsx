import { AuthorizationService } from "@/services/authorization.service";
import { ProjectService } from "@/services/project.service";
import { TaskService } from "@/services/task.service";
import { TaskCard } from "@/components/task-card";
import { redirect } from "next/navigation";
import { CreateProjectDrawer } from "@/components/create-project-drawer";
import { CreateTaskDrawer } from "@/components/create-task-drawer";

interface SubtopicPageProps {
  params: Promise<{ id: string }>;
}

export default async function SubtopicPage({ params }: SubtopicPageProps) {
  const { id } = await params;
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.ensureAuthenticated();
  if (profile.role !== "admin") {
    const allowed = await authorizationService.canAccessSubtopic(profile.id, id);
    if (!allowed) {
      redirect("/dashboard");
    }
  }
  const projectService = new ProjectService();
  const taskService = new TaskService();
  const access = await authorizationService.getTaskAccessContext(profile);
  const projects = await projectService.getBySubtopic(id);
  const tasks = await taskService.getBySubtopic(access, id);
  const tasksWithoutProject = tasks.filter((task) => !task.project_id);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">תת-נושא</h1>
        <div className="flex items-center gap-2">
          <CreateProjectDrawer triggerLabel="פרויקט חדש" defaultSubtopicId={id} lockSubtopic />
          <CreateTaskDrawer triggerLabel="משימה חדשה" defaultSubtopicId={id} />
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
        <h2 className="mb-3 font-semibold">פרויקטים</h2>
        <div className="space-y-2">
          {projects.map((project) => (
            <a
              key={project.id}
              href={`/projects/${project.id}`}
              className="block rounded-xl border border-slate-200 px-3 py-2 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              {project.name}
            </a>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">משימות ללא פרויקט</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {tasksWithoutProject.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </div>
    </section>
  );
}
