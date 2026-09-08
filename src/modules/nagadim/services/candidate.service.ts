import { BaseService } from "@/services/base.service";
import { DEFAULT_STAGE } from "@/modules/nagadim/lib/stages";
import type {
  NagadimCandidate,
  NagadimCandidateWithEvents,
  NagadimCandidateWrite,
  NagadimStageEvent,
  NagadimStageEventWrite,
} from "@/modules/nagadim/types";

export class NagadimCandidateService extends BaseService {
  public async list(limit = 500): Promise<NagadimCandidateWithEvents[]> {
    const db = this.getDb();
    const candidates = await db<NagadimCandidate[]>`
      select *
      from nagadim_candidates
      order by updated_at desc, created_at desc
      limit ${limit}
    `;
    if (!candidates.length) return [];

    const ids = candidates.map((row) => row.id);
    const events = await db<NagadimStageEvent[]>`
      select *
      from nagadim_stage_events
      where candidate_id = any(${ids})
      order by sort_order asc, event_date desc nulls last, created_at desc
    `;

    const byCandidate = new Map<string, NagadimStageEvent[]>();
    for (const event of events) {
      const list = byCandidate.get(event.candidate_id) ?? [];
      list.push(event);
      byCandidate.set(event.candidate_id, list);
    }

    return candidates.map((candidate) => ({
      ...candidate,
      stage_events: byCandidate.get(candidate.id) ?? [],
    }));
  }

  public async getById(id: string): Promise<NagadimCandidateWithEvents | null> {
    const db = this.getDb();
    const rows = await db<NagadimCandidate[]>`
      select * from nagadim_candidates
      where id = ${id}
      limit 1
    `;
    const candidate = rows[0];
    if (!candidate) return null;

    const events = await db<NagadimStageEvent[]>`
      select *
      from nagadim_stage_events
      where candidate_id = ${id}
      order by sort_order asc, event_date desc nulls last, created_at desc
    `;
    return { ...candidate, stage_events: events };
  }

  public async create(input: NagadimCandidateWrite): Promise<NagadimCandidateWithEvents> {
    const db = this.getDb();
    const rows = await db<NagadimCandidate[]>`
      insert into nagadim_candidates (full_name, notes, current_stage, created_by)
      values (
        ${input.full_name ?? ""},
        ${input.notes ?? null},
        ${input.current_stage ?? DEFAULT_STAGE},
        ${input.created_by ?? null}
      )
      returning *
    `;
    return { ...rows[0], stage_events: [] };
  }

  public async update(
    id: string,
    input: NagadimCandidateWrite,
  ): Promise<NagadimCandidateWithEvents | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const db = this.getDb();
    const rows = await db<NagadimCandidate[]>`
      update nagadim_candidates set
        full_name = ${input.full_name !== undefined ? input.full_name : existing.full_name},
        notes = ${input.notes !== undefined ? input.notes : existing.notes},
        current_stage = ${
          input.current_stage !== undefined ? input.current_stage : existing.current_stage
        },
        updated_at = now()
      where id = ${id}
      returning *
    `;
    if (!rows[0]) return null;
    return { ...rows[0], stage_events: existing.stage_events };
  }

  public async delete(id: string): Promise<boolean> {
    const db = this.getDb();
    const rows = await db<{ id: string }[]>`
      delete from nagadim_candidates
      where id = ${id}
      returning id
    `;
    return rows.length > 0;
  }

  public async addOrUpdateStageEvent(
    candidateId: string,
    input: NagadimStageEventWrite & { id?: string },
  ): Promise<NagadimCandidateWithEvents | null> {
    const existing = await this.getById(candidateId);
    if (!existing) return null;

    const db = this.getDb();

    if (input.id) {
      await db`
        update nagadim_stage_events set
          stage = ${input.stage},
          person_name = ${input.person_name ?? null},
          event_date = ${input.event_date ?? null},
          notes = ${input.notes ?? null},
          command = ${input.command ?? null},
          unit = ${input.unit ?? null},
          sort_order = ${input.sort_order ?? 0}
        where id = ${input.id} and candidate_id = ${candidateId}
      `;
    } else {
      await db`
        insert into nagadim_stage_events (
          candidate_id, stage, person_name, event_date, notes, command, unit, sort_order
        )
        values (
          ${candidateId},
          ${input.stage},
          ${input.person_name ?? null},
          ${input.event_date ?? null},
          ${input.notes ?? null},
          ${input.command ?? null},
          ${input.unit ?? null},
          ${input.sort_order ?? 0}
        )
      `;
    }

    await db`
      update nagadim_candidates set
        current_stage = ${input.stage},
        updated_at = now()
      where id = ${candidateId}
    `;

    return this.getById(candidateId);
  }
}
