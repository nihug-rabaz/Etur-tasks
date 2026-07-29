import { BaseService } from "@/services/base.service";
import { TaskAccessContext } from "@/services/authorization.service";
import { TaskWithRelations } from "@/types/models";

export interface DailyPlanSlotRow {
  start_minute: number;
  duration_minutes: number;
  task_id: string;
  title: string;
  priority: "low" | "medium" | "high";
  status: "in_progress" | "completed";
}

export class DailyPlanService extends BaseService {
  public async getSlotsForDay(userId: string, planDate: string): Promise<DailyPlanSlotRow[]> {
    const db = this.getDb();
    return db<DailyPlanSlotRow[]>`
      select
        s.start_minute,
        s.duration_minutes,
        s.task_id,
        t.title,
        t.priority,
        t.status
      from user_daily_plan_slots s
      join tasks t on t.id = s.task_id
      where s.user_id = ${userId}
        and s.plan_date = ${planDate}::date
      order by s.start_minute
    `;
  }

  public async assignTaskToSlot(
    userId: string,
    planDate: string,
    startMinute: number,
    taskId: string,
    durationMinutes: number,
  ): Promise<void> {
    const db = this.getDb();
    await db`
      insert into user_daily_plan_slots (user_id, task_id, plan_date, start_minute, duration_minutes)
      values (${userId}, ${taskId}, ${planDate}::date, ${startMinute}, ${durationMinutes})
      on conflict (user_id, plan_date, start_minute)
      do update set
        task_id = excluded.task_id,
        duration_minutes = excluded.duration_minutes,
        updated_at = now()
    `;
  }

  public async clearSlot(userId: string, planDate: string, startMinute: number): Promise<void> {
    const db = this.getDb();
    await db`
      delete from user_daily_plan_slots
      where user_id = ${userId}
        and plan_date = ${planDate}::date
        and start_minute = ${startMinute}
    `;
  }

  public async getAssignableTasks(access: TaskAccessContext, userId: string): Promise<TaskWithRelations[]> {
    const db = this.getDb();
    const rows = await db<TaskWithRelations[]>`
      select * from task_details
      where status <> 'completed'
        and (
          ${access.unrestricted}::boolean
          or subtopic_id in (select subtopic_id from user_subtopic_permissions where user_id = ${access.userId})
          or id in (
            select ts.task_id
            from task_subtopics ts
            join user_subtopic_permissions usp on usp.subtopic_id = ts.subtopic_id
            where usp.user_id = ${access.userId}
          )
        )
      order by due_date asc nulls last, title asc
    `;
    if (access.unrestricted) return rows;
    return rows.filter((task) => {
      const assigneeIds = task.assignee_ids ?? [];
      if (assigneeIds.includes(userId)) return true;
      return task.assigned_to === userId;
    });
  }
}
