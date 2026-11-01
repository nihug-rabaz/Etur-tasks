import { BaseService } from "@/services/base.service";
import { generateCycleInviteSlug } from "@/modules/agam/lib/cycle-invite";
import { normalizeCycleSchedule } from "@/modules/agam/lib/cycle-schedule";
import type {
  AgamCandidate,
  AgamCycle,
  AgamCycleSchedule,
  AgamCycleScheduleKey,
  AgamRankingRow,
} from "@/modules/agam/types";

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

  public async getByInviteSlug(slug: string): Promise<AgamCycle | null> {
    const normalized = slug.trim();
    if (!normalized) return null;
    const db = this.getDb();
    const rows = await db<AgamCycle[]>`
      select
        c.*,
        coalesce(
          (select count(*)::int from agam_candidates cand where cand.cycle_id = c.id and cand.archived = false),
          0
        ) as candidate_count
      from agam_cycles c
      where c.invite_slug = ${normalized}
      limit 1
    `;
    return rows[0] ?? null;
  }

  private async insertWithSlug(input: {
    name: string;
    cycle_date: string;
    cohort_year?: number | null;
    notes?: string | null;
    schedule?: AgamCycleSchedule | null;
    created_by_id?: string | null;
  }): Promise<AgamCycle> {
    const db = this.getDb();
    const schedule = JSON.stringify(normalizeCycleSchedule(input.schedule));
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const inviteSlug = generateCycleInviteSlug();
      try {
        const rows = await db<AgamCycle[]>`
          insert into agam_cycles (name, cycle_date, cohort_year, notes, schedule, created_by_id, invite_slug)
          values (
            ${input.name},
            ${input.cycle_date},
            ${input.cohort_year ?? null},
            ${input.notes ?? null},
            ${schedule}::jsonb,
            ${input.created_by_id ?? null},
            ${inviteSlug}
          )
          returning *
        `;
        return { ...rows[0], candidate_count: 0 };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.toLowerCase().includes("invite_slug") || attempt === 5) throw error;
      }
    }
    throw new Error("Failed to allocate invite slug");
  }

  public async create(input: {
    name: string;
    cycle_date: string;
    cohort_year?: number | null;
    notes?: string | null;
    schedule?: AgamCycleSchedule | null;
    created_by_id?: string | null;
  }): Promise<AgamCycle> {
    return this.insertWithSlug(input);
  }

  public async setScheduleDate(id: string, key: AgamCycleScheduleKey, date: string | null): Promise<AgamCycle | null> {
    const existing = await this.getById(id);
    if (!existing) return null;
    const schedule = JSON.stringify(normalizeCycleSchedule({ ...normalizeCycleSchedule(existing.schedule), [key]: date }));
    const db = this.getDb();
    await db`update agam_cycles set schedule = ${schedule}::jsonb, updated_at = now() where id = ${id}`;
    return this.getById(id);
  }

  public async rotateInviteSlug(id: string): Promise<AgamCycle | null> {
    const existing = await this.getById(id);
    if (!existing) return null;
    const db = this.getDb();
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const inviteSlug = generateCycleInviteSlug();
      try {
        const rows = await db<AgamCycle[]>`
          update agam_cycles
          set invite_slug = ${inviteSlug}, updated_at = now()
          where id = ${id}
          returning *
        `;
        if (!rows[0]) return null;
        return this.getById(id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.toLowerCase().includes("invite_slug") || attempt === 5) throw error;
      }
    }
    throw new Error("Failed to rotate invite slug");
  }

  public async update(
    id: string,
    input: Partial<{
      name: string;
      cycle_date: string;
      cohort_year: number | null;
      notes: string | null;
      archived: boolean;
      schedule: AgamCycleSchedule;
    }>,
  ): Promise<AgamCycle | null> {
    const existing = await this.getById(id);
    if (!existing) return null;
    const db = this.getDb();
    const schedule = JSON.stringify(normalizeCycleSchedule(input.schedule ?? existing.schedule));
    const rows = await db<AgamCycle[]>`
      update agam_cycles set
        name = ${input.name ?? existing.name},
        cycle_date = ${input.cycle_date ?? existing.cycle_date},
        cohort_year = ${input.cohort_year !== undefined ? input.cohort_year : existing.cohort_year},
        notes = ${input.notes !== undefined ? input.notes : existing.notes},
        archived = ${input.archived !== undefined ? input.archived : existing.archived},
        schedule = ${schedule}::jsonb,
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
      select cand.*, c.name as cycle_name, nullif(c.schedule->>'bahad1_intake', '') as cycle_bahad1_date
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
      set cycle_id = ${cycleId},
        cycle_rank = case when cycle_id is distinct from ${cycleId} then null else cycle_rank end,
        updated_at = now()
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
      set cycle_id = null, cycle_rank = null, updated_at = now()
      where id = ${candidateId} and cycle_id = ${cycleId}
      returning id
    `;
    return rows.length > 0;
  }

  public async listRanking(cycleId: string): Promise<AgamRankingRow[]> {
    const db = this.getDb();
    return db<AgamRankingRow[]>`
      select
        cand.id, cand.full_name, cand.personal_number, cand.status, cand.planning_index, cand.dapar,
        cand.cycle_rank,
        (
          select round(avg(coalesce(ev.final_score, ev.weighted_score))::numeric, 1)::float
          from agam_day_evaluations ev where ev.candidate_id = cand.id
        ) as day_average,
        (
          select round(avg((
            select avg(v) from unnest(array[pd.mikra_score, pd.conversation_score, pd.social_dynamics_score]) v
          ))::numeric, 1)::float
          from agam_preparation_day_evaluations pd where pd.candidate_id = cand.id
        ) as prep_average,
        (
          select round(avg(sm.weighted_score)::numeric, 1)::float
          from agam_smach_evaluations sm where sm.candidate_id = cand.id
        ) as smach_average
      from agam_candidates cand
      where cand.cycle_id = ${cycleId}
      order by cand.cycle_rank nulls last, cand.full_name
    `;
  }

  /** Ranks candidates 1..n in the given order; candidates left out lose their rank. */
  public async saveRanking(cycleId: string, orderedIds: string[]): Promise<void> {
    const db = this.getDb();
    const ranks = orderedIds.map((_, index) => index + 1);
    await db`
      update agam_candidates cand
      set cycle_rank = ranked.rank, updated_at = now()
      from (
        select unnest(${orderedIds}::uuid[]) as id, unnest(${ranks}::int[]) as rank
      ) ranked
      where cand.id = ranked.id and cand.cycle_id = ${cycleId}
    `;
    await db`
      update agam_candidates
      set cycle_rank = null, updated_at = now()
      where cycle_id = ${cycleId}
        and cycle_rank is not null
        and not (id = any(${orderedIds}::uuid[]))
    `;
  }
}
