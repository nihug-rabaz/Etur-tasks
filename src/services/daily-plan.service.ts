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
  is_done: boolean;
}

export type TaskPlanPlacement = "bank" | "mine" | "other";

export class DailyPlanService extends BaseService {
  /** Resolve whether each task is only in the bank, on my plan, or on someone else's plan today. */
  public async getPlacementsForTasks(
    taskIds: string[],
    currentUserId: string,
    planDate: string,
  ): Promise<Record<string, TaskPlanPlacement>> {
    const uniqueIds = [...new Set(taskIds.filter(Boolean))];
    const result: Record<string, TaskPlanPlacement> = {};
    for (const id of uniqueIds) result[id] = "bank";
    if (uniqueIds.length === 0) return result;

    const db = this.getDb();
    const rows = await db<{ task_id: string; user_id: string }[]>`
      select task_id, user_id
      from user_daily_plan_slots
      where plan_date = ${planDate}::date
        and task_id = any(${uniqueIds})
    `;

    const byTask = new Map<string, string[]>();
    for (const row of rows) {
      const list = byTask.get(row.task_id) ?? [];
      list.push(row.user_id);
      byTask.set(row.task_id, list);
    }

    for (const [taskId, users] of byTask) {
      if (users.includes(currentUserId)) result[taskId] = "mine";
      else result[taskId] = "other";
    }
    return result;
  }

  public async getSlotsForDay(userId: string, planDate: string): Promise<DailyPlanSlotRow[]> {
    const db = this.getDb();
    return db<DailyPlanSlotRow[]>`
      select
        s.start_minute,
        s.duration_minutes,
        s.task_id,
        t.title,
        t.priority,
        t.status,
        s.is_done
      from user_daily_plan_slots s
      join tasks t on t.id = s.task_id
      where s.user_id = ${userId}
        and s.plan_date = ${planDate}::date
      order by
        case t.priority when 'high' then 0 when 'medium' then 1 else 2 end,
        s.start_minute,
        t.title
    `;
  }

  public async findSlotByTask(
    userId: string,
    planDate: string,
    taskId: string,
  ): Promise<DailyPlanSlotRow | null> {
    const db = this.getDb();
    const rows = await db<DailyPlanSlotRow[]>`
      select
        s.start_minute,
        s.duration_minutes,
        s.task_id,
        t.title,
        t.priority,
        t.status,
        s.is_done
      from user_daily_plan_slots s
      join tasks t on t.id = s.task_id
      where s.user_id = ${userId}
        and s.plan_date = ${planDate}::date
        and s.task_id = ${taskId}
      limit 1
    `;
    return rows[0] ?? null;
  }

  public async setTaskDone(
    userId: string,
    planDate: string,
    taskId: string,
    isDone: boolean,
  ): Promise<void> {
    const db = this.getDb();
    await db`
      update user_daily_plan_slots
      set is_done = ${isDone}, updated_at = now()
      where user_id = ${userId}
        and plan_date = ${planDate}::date
        and task_id = ${taskId}
    `;
  }

  public async addTaskToDay(
    userId: string,
    planDate: string,
    taskId: string,
    durationMinutes: number,
  ): Promise<{ startMinute: number; durationMinutes: number }> {
    const existing = await this.findSlotByTask(userId, planDate, taskId);
    if (existing) {
      return {
        startMinute: existing.start_minute,
        durationMinutes: existing.duration_minutes,
      };
    }

    const slots = await this.getSlotsForDay(userId, planDate);
    const used = new Set(slots.map((slot) => slot.start_minute));
    let startMinute = 0;
    while (used.has(startMinute) && startMinute < 24 * 60) {
      startMinute += 1;
    }
    if (startMinute >= 24 * 60) {
      throw new Error("DAY_FULL");
    }

    await this.assignTaskToSlot(userId, planDate, startMinute, taskId, durationMinutes);
    return { startMinute, durationMinutes };
  }

  public async removeTaskFromDay(userId: string, planDate: string, taskId: string): Promise<void> {
    const db = this.getDb();
    await db`
      delete from user_daily_plan_slots
      where user_id = ${userId}
        and plan_date = ${planDate}::date
        and task_id = ${taskId}
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
