import { BaseService } from "@/services/base.service";
import { TaskStatus, TaskWithRelations } from "@/types/models";

export class TaskService extends BaseService {
  public async getActiveTasks(): Promise<TaskWithRelations[]> {
    const db = this.getDb();
    const data = await db<TaskWithRelations[]>`
      select * from task_details
      where status <> 'completed'
      order by due_date asc nulls last
    `;
    return data;
  }

  public async getTasksDueInRange(rangeStart: Date, rangeEnd: Date): Promise<TaskWithRelations[]> {
    const db = this.getDb();
    const data = await db<TaskWithRelations[]>`
      select * from task_details
      where due_date >= ${rangeStart.toISOString()}
      and due_date <= ${rangeEnd.toISOString()}
      and status <> 'completed'
      order by due_date asc
    `;
    return data;
  }

  public async getBySubtopic(subtopicId: string): Promise<TaskWithRelations[]> {
    const db = this.getDb();
    const data = await db<TaskWithRelations[]>`
      select * from task_details
      where subtopic_id = ${subtopicId}
      order by created_at desc
    `;
    return data;
  }

  public async getByProject(projectId: string): Promise<TaskWithRelations[]> {
    const db = this.getDb();
    const data = await db<TaskWithRelations[]>`
      select * from task_details
      where project_id = ${projectId}
      order by created_at desc
    `;
    return data;
  }

  public async updateStatus(taskId: string, status: TaskStatus): Promise<void> {
    const db = this.getDb();
    await db`update tasks set status = ${status}, updated_at = now() where id = ${taskId}`;
  }
}
