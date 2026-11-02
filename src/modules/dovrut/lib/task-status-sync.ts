import type { DovrutConcept, DovrutWorkStatus } from "@/modules/dovrut/types";
import type { TaskStatus } from "@/types/models";
import { BaseService } from "@/services/base.service";

export type TaskStatusSyncSource = "concept" | "task";

export function workStatusToTaskStatus(
  workStatus: DovrutWorkStatus | null | undefined,
  archivedAt?: string | null,
): TaskStatus {
  if (archivedAt) return "completed";
  if (workStatus === "approved") return "completed";
  return "in_progress";
}

function resolveConceptWork(
  concept: Pick<DovrutConcept, "type" | "work_status_article" | "work_status_social">,
): DovrutWorkStatus | null {
  return concept.type === "article_interview"
    ? concept.work_status_article
    : concept.work_status_social;
}

/** Concept work / archive / publish → linked task status. */
export async function syncLinkedTaskFromConcept(
  concept: Pick<
    DovrutConcept,
    | "id"
    | "type"
    | "linked_task_id"
    | "work_status_article"
    | "work_status_social"
    | "archived_at"
  >,
  options?: { source?: TaskStatusSyncSource },
): Promise<void> {
  if (options?.source === "task") return;
  if (!concept.linked_task_id) return;
  const status = workStatusToTaskStatus(
    resolveConceptWork(concept),
    concept.archived_at,
  );
  const { TaskService } = await import("@/services/task.service");
  await new TaskService().updateStatus(concept.linked_task_id, status, {
    source: "concept",
  });
}

/** Task status → concept work status (via tasks.dovrut_concept_id). */
export async function syncConceptFromTaskStatus(
  taskId: string,
  newStatus: TaskStatus,
  options?: { source?: TaskStatusSyncSource; previousStatus?: TaskStatus | null },
): Promise<void> {
  if (options?.source === "concept") return;

  class TaskConceptLookup extends BaseService {
    public async getLink(id: string) {
      const db = this.getDb();
      const rows = await db<
        Array<{
          dovrut_concept_id: string | null;
          status: TaskStatus;
        }>
      >`
        select dovrut_concept_id, status from tasks where id = ${id} limit 1
      `;
      return rows[0] ?? null;
    }
  }

  const link = await new TaskConceptLookup().getLink(taskId);
  if (!link?.dovrut_concept_id) return;

  const { DovrutConceptService } = await import(
    "@/modules/dovrut/services/concept.service"
  );
  const service = new DovrutConceptService();
  const concept = await service.getById(link.dovrut_concept_id);
  if (!concept || concept.deleted_at) return;

  const currentWork = resolveConceptWork(concept);
  const previous = options?.previousStatus ?? null;

  // Lossy reverse map: task completed ≠ פורסם. Only publish/archive may set approved.
  if (newStatus === "completed") {
    if (currentWork === "approved" || concept.archived_at) return;
    if (currentWork === "production") return;
    await service.setWorkStatus(
      concept.id,
      "production",
      "סנכרון משימה",
      null,
      { source: "task" },
    );
    return;
  }

  if (
    newStatus === "in_progress" &&
    previous === "completed" &&
    (currentWork === "approved" || currentWork === "production")
  ) {
    await service.setWorkStatus(
      concept.id,
      "production",
      "סנכרון משימה",
      null,
      { source: "task" },
    );
  }
}
