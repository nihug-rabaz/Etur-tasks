import Link from "next/link";
import { DomainService } from "@/services/domain.service";
import { NeonDatabase } from "@/lib/db/neon";
import { TaskWithRelations } from "@/types/models";
import { TaskCard } from "@/components/task-card";
import { toHebrewSubtopicLabel } from "@/lib/ui/labels";

interface DomainPageProps {
  params: Promise<{ id: string }>;
}

export default async function DomainPage({ params }: DomainPageProps) {
  const { id } = await params;
  const domainService = new DomainService();
  const subtopics = await domainService.getSubtopicsByDomain(id);
  const db = NeonDatabase.createClient();
  const subtopicIds = subtopics.map((subtopic) => subtopic.id);
  const tasks =
    subtopicIds.length > 0
      ? await db<TaskWithRelations[]>`
          select *
          from task_details
          where subtopic_id = any(${subtopicIds})
          order by created_at desc
        `
      : [];

  return (
    <section>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">תתי-נושאים</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        בחר תת-נושא כדי לראות פרויקטים, והמשימות הקיימות מוצגות כאן מתחת לכל כותרת.
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {subtopics.map((subtopic) => {
          const subtopicTasks = tasks.filter((task) => task.subtopic_id === subtopic.id);
          return (
            <div
              key={subtopic.id}
              className="rounded-2xl bg-slate-100/70 p-4 dark:bg-slate-900/50"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {toHebrewSubtopicLabel(subtopic.name)}
                </h2>
                <Link
                  href={`/subtopics/${subtopic.id}`}
                  className="rounded-xl border border-slate-300 px-3 py-1 text-sm text-slate-700 transition hover:bg-slate-200 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  מעבר לנושא
                </Link>
              </div>
              {subtopicTasks.length === 0 ? (
                <p className="rounded-xl bg-white px-3 py-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
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
