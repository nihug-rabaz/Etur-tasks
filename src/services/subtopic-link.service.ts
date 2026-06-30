import { BaseService } from "@/services/base.service";
import { normalizeSubtopicIds, primarySubtopicId } from "@/lib/subtopics/ids";

export class SubtopicLinkService extends BaseService {
  public async getProjectSubtopicIds(projectId: string): Promise<string[]> {
    const db = this.getDb();
    const rows = await db<Array<{ subtopic_id: string }>>`
      select subtopic_id from project_subtopics where project_id = ${projectId} order by subtopic_id
    `;
    if (rows.length > 0) {
      return rows.map((row) => row.subtopic_id);
    }
    const fallback = await db<Array<{ subtopic_id: string }>>`
      select subtopic_id from projects where id = ${projectId} limit 1
    `;
    return fallback[0] ? [fallback[0].subtopic_id] : [];
  }

  public async getTaskSubtopicIds(taskId: string): Promise<string[]> {
    const db = this.getDb();
    const rows = await db<Array<{ subtopic_id: string }>>`
      select subtopic_id from task_subtopics where task_id = ${taskId} order by subtopic_id
    `;
    if (rows.length > 0) {
      return rows.map((row) => row.subtopic_id);
    }
    const fallback = await db<Array<{ subtopic_id: string }>>`
      select subtopic_id from tasks where id = ${taskId} limit 1
    `;
    return fallback[0] ? [fallback[0].subtopic_id] : [];
  }

  public async syncProjectSubtopics(projectId: string, subtopicIds: string[]): Promise<void> {
    const ids = normalizeSubtopicIds(subtopicIds);
    if (ids.length === 0) {
      throw new Error("At least one subtopic is required");
    }
    const db = this.getDb();
    await db`update projects set subtopic_id = ${primarySubtopicId(ids)} where id = ${projectId}`;
    await db`delete from project_subtopics where project_id = ${projectId}`;
    for (const subtopicId of ids) {
      await db`
        insert into project_subtopics (project_id, subtopic_id)
        values (${projectId}, ${subtopicId})
        on conflict do nothing
      `;
    }
  }

  public async syncTaskSubtopics(taskId: string, subtopicIds: string[]): Promise<void> {
    const ids = normalizeSubtopicIds(subtopicIds);
    if (ids.length === 0) {
      throw new Error("At least one subtopic is required");
    }
    const db = this.getDb();
    await db`update tasks set subtopic_id = ${primarySubtopicId(ids)} where id = ${taskId}`;
    await db`delete from task_subtopics where task_id = ${taskId}`;
    for (const subtopicId of ids) {
      await db`
        insert into task_subtopics (task_id, subtopic_id)
        values (${taskId}, ${subtopicId})
        on conflict do nothing
      `;
    }
  }
}
