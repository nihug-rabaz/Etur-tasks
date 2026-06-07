import { BaseService } from "@/services/base.service";
import { Project } from "@/types/models";

export class ProjectService extends BaseService {
  public async getBySubtopic(subtopicId: string): Promise<Project[]> {
    const db = this.getDb();
    const data = await db<Project[]>`
      select id, name, description, subtopic_id, start_date, end_date, status
      from projects
      where subtopic_id = ${subtopicId}
      order by created_at desc
    `;
    return data;
  }

  public async getOne(projectId: string): Promise<Project | null> {
    const db = this.getDb();
    const data = await db<Project[]>`
      select id, name, description, subtopic_id, start_date, end_date, status
      from projects
      where id = ${projectId}
      limit 1
    `;
    if (data.length === 0) {
      return null;
    }
    return data[0];
  }

  // Atomically deletes a project together with all of its tasks (assignees cascade).
  public async delete(projectId: string): Promise<void> {
    const db = this.getDb();
    await db`
      with deleted_tasks as (
        delete from tasks where project_id = ${projectId}
      )
      delete from projects where id = ${projectId}
    `;
  }
}
