import { BaseService } from "@/services/base.service";
import type { AgamLinkedTask } from "@/modules/agam/types";

export class AgamTaskLinkService extends BaseService {
  private async getAgamSubtopicId(): Promise<string | null> {
    const db = this.getDb();
    const rows = await db<Array<{ id: string }>>`
      select s.id
      from subtopics s
      join domains d on d.id = s.domain_id
      where s.name = 'איתור קצונה' or (d.slug = 'recruitment' and s.name = 'Candidates')
      order by case when s.name = 'איתור קצונה' then 0 else 1 end
      limit 1
    `;
    return rows[0]?.id ?? null;
  }

  public async list(input: {
    candidateId?: string | null;
    cycleId?: string | null;
    includeGeneral?: boolean;
  }): Promise<AgamLinkedTask[]> {
    const db = this.getDb();
    const candidateId = input.candidateId ?? null;
    const cycleId = input.cycleId ?? null;
    const includeGeneral = Boolean(input.includeGeneral);
    return db<AgamLinkedTask[]>`
      select
        t.id, t.title, t.description, t.priority, t.status, t.due_date,
        t.created_by, t.agam_candidate_id, t.agam_cycle_id, c.name as cycle_name, t.created_at, t.updated_at
      from tasks t
      left join agam_cycles c on c.id = t.agam_cycle_id
      where t.origin = 'agam'
        and (${candidateId}::uuid is null or agam_candidate_id = ${candidateId}::uuid)
        and (${cycleId}::uuid is null or agam_cycle_id = ${cycleId}::uuid)
        and (not ${includeGeneral}::boolean or agam_candidate_id is null)
      order by t.status asc, t.due_date asc nulls last, t.created_at desc
    `;
  }

  public async create(input: {
    title: string;
    description?: string | null;
    priority: "low" | "medium" | "high";
    due_date?: string | null;
    created_by: string;
    candidate_id?: string | null;
    cycle_id?: string | null;
  }): Promise<AgamLinkedTask> {
    const subtopicId = await this.getAgamSubtopicId();
    if (!subtopicId) throw new Error("AGAM_SUBTOPIC_MISSING");

    const db = this.getDb();
    await db`
      insert into user_subtopic_permissions (user_id, subtopic_id)
      values (${input.created_by}, ${subtopicId})
      on conflict do nothing
    `;
    const rows = await db<AgamLinkedTask[]>`
      insert into tasks (
        title, description, subtopic_id, assigned_to, created_by, priority, status, due_date,
        origin, agam_candidate_id, agam_cycle_id
      )
      values (
        ${input.title},
        ${input.description ?? null},
        ${subtopicId},
        ${input.created_by},
        ${input.created_by},
        ${input.priority},
        'in_progress',
        ${input.due_date ?? null},
        'agam',
        ${input.candidate_id ?? null},
        ${input.cycle_id ?? null}
      )
      returning id, title, description, priority, status, due_date, created_by, agam_candidate_id, agam_cycle_id, created_at, updated_at
    `;
    const task = rows[0];
    await db`
      insert into task_subtopics (task_id, subtopic_id)
      values (${task.id}, ${subtopicId})
      on conflict do nothing
    `;
    await db`
      insert into task_assignees (task_id, user_id)
      values (${task.id}, ${input.created_by})
      on conflict do nothing
    `;
    return task;
  }

  public async updateStatus(id: string, status: "in_progress" | "completed"): Promise<void> {
    const db = this.getDb();
    await db`
      update tasks set status = ${status}, updated_at = now()
      where id = ${id} and origin = 'agam'
    `;
  }

  public async getById(id: string): Promise<AgamLinkedTask | null> {
    const db = this.getDb();
    const rows = await db<AgamLinkedTask[]>`
      select
        id, title, description, priority, status, due_date,
        created_by, agam_candidate_id, agam_cycle_id, created_at, updated_at
      from tasks
      where id = ${id} and origin = 'agam'
      limit 1
    `;
    return rows[0] ?? null;
  }

  public async update(input: {
    id: string;
    title?: string;
    description?: string | null;
    priority?: "low" | "medium" | "high";
    due_date?: string | null;
    status?: "in_progress" | "completed";
  }): Promise<AgamLinkedTask | null> {
    const existing = await this.getById(input.id);
    if (!existing) return null;
    const db = this.getDb();
    const rows = await db<AgamLinkedTask[]>`
      update tasks set
        title = ${input.title ?? existing.title},
        description = ${input.description !== undefined ? input.description : existing.description},
        priority = ${input.priority ?? existing.priority},
        due_date = ${input.due_date !== undefined ? input.due_date : existing.due_date},
        status = ${input.status ?? existing.status},
        updated_at = now()
      where id = ${input.id} and origin = 'agam'
      returning id, title, description, priority, status, due_date, created_by, agam_candidate_id, agam_cycle_id, created_at, updated_at
    `;
    return rows[0] ?? null;
  }

  public async delete(id: string): Promise<void> {
    const db = this.getDb();
    await db`delete from tasks where id = ${id} and origin = 'agam'`;
  }
}
