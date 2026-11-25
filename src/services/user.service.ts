import { BaseService } from "@/services/base.service";
import { Profile } from "@/types/models";

export class UserService extends BaseService {
  public async getUsers(): Promise<Profile[]> {
    const db = this.getDb();
    const data = await db<Profile[]>`
      select id, name, email, role, telegram_id, avatar, is_approved, access_status, approved_at, approved_by, created_at
      from profiles
      order by name
    `;
    return data;
  }

  /**
   * Deletes a profile in one statement. Content whose FK forbids orphaning (tasks, task messages,
   * close requests, calendar events) moves to `transferToId`; officer evaluations keep their
   * evaluator_name and lose the link via ON DELETE SET NULL.
   */
  public async deleteUser(
    userId: string,
    transferToId: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const db = this.getDb();
    const deleted = await db<Array<{ id: string }>>`
      with target as (
        select id, name from profiles where id = ${userId} and role <> 'admin'
      ),
      moved_tasks as (
        update tasks set created_by = ${transferToId} where created_by in (select id from target)
      ),
      moved_messages as (
        update task_messages set author_id = ${transferToId} where author_id in (select id from target)
      ),
      moved_close_requests as (
        update task_close_requests set requested_by = ${transferToId} where requested_by in (select id from target)
      ),
      moved_events as (
        update calendar_events set created_by = ${transferToId} where created_by in (select id from target)
      ),
      named_day as (
        update agam_day_evaluations e set evaluator_name = t.name
        from target t where e.evaluator_id = t.id and coalesce(e.evaluator_name, '') = ''
      ),
      named_prep as (
        update agam_preparation_day_evaluations e set evaluator_name = t.name
        from target t where e.evaluator_id = t.id and coalesce(e.evaluator_name, '') = ''
      ),
      named_smach as (
        update agam_smach_evaluations e set evaluator_name = t.name
        from target t where e.evaluator_id = t.id and coalesce(e.evaluator_name, '') = ''
      ),
      named_interviews as (
        update agam_interviews e set evaluator_name = t.name
        from target t where e.evaluator_id = t.id and coalesce(e.evaluator_name, '') = ''
      )
      delete from profiles where id in (select id from target)
      returning id
    `;
    if (deleted.length > 0) return { ok: true };

    const [row] = await db<Array<{ role: string }>>`select role from profiles where id = ${userId}`;
    if (!row) return { ok: false, error: "המשתמש כבר לא קיים" };
    return { ok: false, error: "אי אפשר למחוק מנהל מערכת — יש להוריד קודם את הרשאת המנהל" };
  }

  public async getApprovedPickerUsers(): Promise<Array<{ id: string; name: string; avatar: string | null }>> {
    const db = this.getDb();
    return db<Array<{ id: string; name: string; avatar: string | null }>>`
      select id, name, avatar
      from profiles
      where is_approved = true
      order by name
    `;
  }
}
