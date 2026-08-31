import { BaseService } from "@/services/base.service";
import type { AgamCandidate, AgamCycle } from "@/modules/agam/types";

export class AgamCycleService extends BaseService {
  public async list(archived = false): Promise<AgamCycle[]> {
    const db = this.getDb();
    return db<AgamCycle[]>`
      select
        c.*,
        coalesce(
          (select count(*)::int from agam_candidates cand where cand.cycle_id = c.id and cand.archived = false),
          0
        ) as candidate_count
      from agam_cycles c
      where c.archived = ${archived}
      order by c.cycle_date desc, c.created_at desc
    `;
  }

  public async getById(id: string): Promise<AgamCycle | null> {
    const db = this.getDb();
    const rows = await db<AgamCycle[]>`
      select
        c.*,
        coalesce(
          (select count(*)::int from agam_candidates cand where cand.cycle_id = c.id and cand.archived = false),
          0
        ) as candidate_count
      from agam_cycles c
      where c.id = ${id}
      limit 1
    `;
    return rows[0] ?? null;
  }

  public async create(input: {
    name: string;
    cycle_date: string;
    cohort_year?: number | null;
    notes?: string | null;
    created_by_id?: string | null;
  }): Promise<AgamCycle> {
    const db = this.getDb();
    const rows = await db<AgamCycle[]>`
      insert into agam_cycles (name, cycle_date, cohort_year, notes, created_by_id)
      values (
        ${input.name},
        ${input.cycle_date},
        ${input.cohort_year ?? null},
        ${input.notes ?? null},
        ${input.created_by_id ?? null}
      )
      returning *
    `;
    return { ...rows[0], candidate_count: 0 };
  }

  public async update(
    id: string,
    input: Partial<{ name: string; cycle_date: string; cohort_year: number | null; notes: string | null; archived: boolean }>,
  ): Promise<AgamCycle | null> {
    const existing = await this.getById(id);
    if (!existing) return null;
    const db = this.getDb();
    const rows = await db<AgamCycle[]>`
      update agam_cycles set
        name = ${input.name ?? existing.name},
        cycle_date = ${input.cycle_date ?? existing.cycle_date},
        cohort_year = ${input.cohort_year !== undefined ? input.cohort_year : existing.cohort_year},
        notes = ${input.notes !== undefined ? input.notes : existing.notes},
        archived = ${input.archived !== undefined ? input.archived : existing.archived},
        updated_at = now()
      where id = ${id}
      returning *
    `;
    return rows[0] ? await this.getById(id) : null;
  }

  public async setArchived(id: string, archived: boolean): Promise<boolean> {
    const db = this.getDb();
    const rows = await db<{ id: string }[]>`
      update agam_cycles
      set archived = ${archived}, updated_at = now()
      where id = ${id}
      returning id
    `;
    if (archived) {
      await db`
        update agam_candidates
        set archived = true, updated_at = now()
        where cycle_id = ${id}
      `;
    }
    return rows.length > 0;
  }

  public async delete(id: string): Promise<boolean> {
    const db = this.getDb();
    await db`update agam_candidates set cycle_id = null, updated_at = now() where cycle_id = ${id}`;
    const rows = await db<{ id: string }[]>`
      delete from agam_cycles where id = ${id} returning id
    `;
    return rows.length > 0;
  }

  public async listCandidates(cycleId: string): Promise<AgamCandidate[]> {
    const db = this.getDb();
    return db<AgamCandidate[]>`
      select cand.*, c.name as cycle_name
      from agam_candidates cand
      left join agam_cycles c on c.id = cand.cycle_id
      where cand.cycle_id = ${cycleId}
      order by cand.full_name
    `;
  }

  public async assignCandidates(cycleId: string, candidateIds: string[]): Promise<number> {
    if (candidateIds.length === 0) return 0;
    const db = this.getDb();
    const rows = await db<{ id: string }[]>`
      update agam_candidates
      set cycle_id = ${cycleId}, updated_at = now()
      where id = any(${candidateIds}::uuid[])
        and archived = false
      returning id
    `;
    return rows.length;
  }

  public async unassignCandidate(cycleId: string, candidateId: string): Promise<boolean> {
    const db = this.getDb();
    const rows = await db<{ id: string }[]>`
      update agam_candidates
      set cycle_id = null, updated_at = now()
      where id = ${candidateId} and cycle_id = ${cycleId}
      returning id
    `;
    return rows.length > 0;
  }
}
