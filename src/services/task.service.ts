import { BaseService } from "@/services/base.service";
import { TaskAccessContext } from "@/services/authorization.service";
import { TaskStatus, TaskWithRelations } from "@/types/models";

export class TaskService extends BaseService {
  public async getActiveTasks(access: TaskAccessContext): Promise<TaskWithRelations[]> {
    const db = this.getDb();
    return db<TaskWithRelations[]>`
      select * from task_details
      where status <> 'completed'
        and (
          ${access.unrestricted}::boolean
          or subtopic_id in (select subtopic_id from user_subtopic_permissions where user_id = ${access.userId})
        )
      order by due_date asc nulls last
    `;
  }

  public async getTasksDueInRange(
    access: TaskAccessContext,
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<TaskWithRelations[]> {
    const db = this.getDb();
    return db<TaskWithRelations[]>`
      select * from task_details
      where due_date >= ${rangeStart.toISOString()}
        and due_date <= ${rangeEnd.toISOString()}
        and status <> 'completed'
        and (
          ${access.unrestricted}::boolean
          or subtopic_id in (select subtopic_id from user_subtopic_permissions where user_id = ${access.userId})
        )
      order by due_date asc
    `;
  }

  public async getBySubtopic(
    access: TaskAccessContext,
    subtopicId: string,
  ): Promise<TaskWithRelations[]> {
    const db = this.getDb();
    return db<TaskWithRelations[]>`
      select * from task_details
      where subtopic_id = ${subtopicId}
        and (
          ${access.unrestricted}::boolean
          or subtopic_id in (select subtopic_id from user_subtopic_permissions where user_id = ${access.userId})
        )
      order by created_at desc
    `;
  }

  public async getByProject(
    access: TaskAccessContext,
    projectId: string,
  ): Promise<TaskWithRelations[]> {
    const db = this.getDb();
    return db<TaskWithRelations[]>`
      select * from task_details
      where project_id = ${projectId}
        and (
          ${access.unrestricted}::boolean
          or subtopic_id in (select subtopic_id from user_subtopic_permissions where user_id = ${access.userId})
        )
      order by created_at desc
    `;
  }

  public async getOne(
    access: TaskAccessContext,
    taskId: string,
  ): Promise<TaskWithRelations | null> {
    const db = this.getDb();
    const rows = await db<TaskWithRelations[]>`
      select * from task_details
      where id = ${taskId}
        and (
          ${access.unrestricted}::boolean
          or subtopic_id in (select subtopic_id from user_subtopic_permissions where user_id = ${access.userId})
        )
      limit 1
    `;
    return rows[0] ?? null;
  }

  public async updateStatus(taskId: string, status: TaskStatus): Promise<void> {
    const db = this.getDb();
    await db`update tasks set status = ${status}, updated_at = now() where id = ${taskId}`;
  }
}
