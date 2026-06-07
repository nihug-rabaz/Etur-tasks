import Link from "next/link";
import { AuthorizationService } from "@/services/authorization.service";
import { NeonDatabase } from "@/lib/db/neon";
import { TaskWithRelations } from "@/types/models";
import { TaskCard } from "@/components/task-card";
import { toHebrewSubtopicLabel } from "@/lib/ui/labels";

interface DomainPageProps {
  params: Promise<{ id: string }>;
}

export default async function DomainPage({ params }: DomainPageProps) {
  const { id } = await params;
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.ensureApproved();
  const subtopics = await authorizationService.getAccessibleSubtopicsInDomain(profile, id);
  const access = await authorizationService.getTaskAccessContext(profile);
  const db = NeonDatabase.createClient();
  const subtopicIds = subtopics.map((subtopic) => subtopic.id);
  const tasks =
    subtopicIds.length > 0
      ? await db<TaskWithRelations[]>`
          select *
          from task_details
          where subtopic_id = any(${subtopicIds})
            and (
              ${access.unrestricted}::boolean
              or subtopic_id in (select subtopic_id from user_subtopic_permissions where user_id = ${access.userId})
            )
          order by created_at desc
        `
      : [];

  return (
    <section>
      <h1 className="text-2xl font-semibold text-text-primary">תתי-נושאים</h1>
      <p className="mt-1 text-sm text-text-secondary">
        בחר תת-נושא כדי לראות פרויקטים, והמשימות הקיימות מוצגות כאן מתחת לכל כותרת.
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {subtopics.map((subtopic) => {
          const subtopicTasks = tasks.filter((task) => task.subtopic_id === subtopic.id);
          return (
            <div key={subtopic.id} className="surface-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-text-primary">
                  {toHebrewSubtopicLabel(subtopic.name)}
                </h2>
                <Link
                  href={`/subtopics/${subtopic.id}`}
                  className="rounded-full bg-accent-primary/12 px-3 py-1 text-sm font-semibold text-accent-primary transition hover:bg-accent-primary/20"
                >
                  מעבר לנושא
                </Link>
              </div>
              {subtopicTasks.length === 0 ? (
                <p className="rounded-xl bg-surface-2 px-3 py-3 text-sm text-text-muted">
                  עדיין אין משימות בתת-נושא הזה.
                </p>
              ) : (
                <div className="space-y-3">
                  {subtopicTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
