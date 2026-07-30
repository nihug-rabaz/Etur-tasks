import { BaseService } from "@/services/base.service";
import { TaskAccessContext } from "@/services/authorization.service";

export interface DailyPlanTaskRow {
  id: string;
  title: string;
  priority: "low" | "medium" | "high";
  status: "in_progress" | "completed";
  project_id: string | null;
  project_name: string | null;
}

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
    previousStartMinute?: number,
  ): Promise<void> {
    const db = this.getDb();
    if (previousStartMinute !== undefined && previousStartMinute !== startMinute) {
      await db`
        with removed_slot as (
          delete from user_daily_plan_slots
          where user_id = ${userId}
            and plan_date = ${planDate}::date
            and start_minute = ${previousStartMinute}
        )
        insert into user_daily_plan_slots (user_id, task_id, plan_date, start_minute, duration_minutes)
        values (${userId}, ${taskId}, ${planDate}::date, ${startMinute}, ${durationMinutes})
        on conflict (user_id, plan_date, start_minute)
        do update set
          task_id = excluded.task_id,
          duration_minutes = excluded.duration_minutes,
          updated_at = now()
      `;
      return;
    }
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

  public async getAssignableTasks(
    access: TaskAccessContext,
    userId: string,
  ): Promise<DailyPlanTaskRow[]> {
    const db = this.getDb();
    return db<DailyPlanTaskRow[]>`
      select distinct
        t.id,
        t.title,
        t.priority,
        t.status,
        t.project_id,
        p.name as project_name
      from tasks t
      left join projects p on p.id = t.project_id
      where t.status <> 'completed'
        and (
          ${access.unrestricted}::boolean
          or (
            (
              t.subtopic_id in (
                select subtopic_id
                from user_subtopic_permissions
                where user_id = ${access.userId}
              )
              or exists (
                select 1
                from task_subtopics ts
                join user_subtopic_permissions usp on usp.subtopic_id = ts.subtopic_id
                where ts.task_id = t.id
                  and usp.user_id = ${access.userId}
              )
            )
            and (
              t.assigned_to = ${userId}
              or exists (
                select 1
                from task_assignees ta
                where ta.task_id = t.id
                  and ta.user_id = ${userId}
              )
            )
          )
        )
      order by t.title asc
    `;
  }
}
