import { BaseService } from "@/services/base.service";
import { DEFAULT_STAGE, PIPELINE_STAGES } from "@/modules/nagadim/lib/stages";
import type {
  NagadimCandidate,
  NagadimCandidateWithEvents,
  NagadimCandidateWrite,
  NagadimStageEvent,
  NagadimStageEventWrite,
} from "@/modules/nagadim/types";

function stageRank(stage: string): number {
  const index = (PIPELINE_STAGES as string[]).indexOf(stage);
  return index >= 0 ? index : -1;
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

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
      insert into nagadim_candidates (
        full_name,
        phone,
        id_number,
        personal_number,
        family_status,
        children_count,
        residence,
        notes,
        current_stage,
        pipeline_outcome,
        created_by
      )
      values (
        ${input.full_name ?? ""},
        ${emptyToNull(input.phone)},
        ${emptyToNull(input.id_number)},
        ${emptyToNull(input.personal_number)},
        ${emptyToNull(input.family_status)},
        ${input.children_count ?? null},
        ${emptyToNull(input.residence)},
        ${emptyToNull(input.notes)},
        ${input.current_stage ?? DEFAULT_STAGE},
        ${input.pipeline_outcome ?? null},
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
        phone = ${
          input.phone !== undefined ? emptyToNull(input.phone) : existing.phone
        },
        id_number = ${
          input.id_number !== undefined ? emptyToNull(input.id_number) : existing.id_number
        },
        personal_number = ${
          input.personal_number !== undefined
            ? emptyToNull(input.personal_number)
            : existing.personal_number
        },
        family_status = ${
          input.family_status !== undefined
            ? emptyToNull(input.family_status)
            : existing.family_status
        },
        children_count = ${
          input.children_count !== undefined ? input.children_count : existing.children_count
        },
        residence = ${
          input.residence !== undefined ? emptyToNull(input.residence) : existing.residence
        },
        notes = ${input.notes !== undefined ? emptyToNull(input.notes) : existing.notes},
        current_stage = ${
          input.current_stage !== undefined ? input.current_stage : existing.current_stage
        },
        pipeline_outcome = ${
          input.pipeline_outcome !== undefined
            ? input.pipeline_outcome
            : existing.pipeline_outcome
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
      const updated = await db<{ id: string }[]>`
        update nagadim_stage_events set
          stage = ${input.stage},
          person_name = ${emptyToNull(input.person_name)},
          event_date = ${input.event_date ?? null},
          notes = ${emptyToNull(input.notes)},
          command = ${emptyToNull(input.command)},
          unit = ${emptyToNull(input.unit)},
          result = ${input.result ?? null},
          sort_order = ${input.sort_order ?? 0}
        where id = ${input.id} and candidate_id = ${candidateId}
        returning id
      `;
      if (!updated.length) return null;
    } else {
      await db`
        insert into nagadim_stage_events (
          candidate_id, stage, person_name, event_date, notes, command, unit, result, sort_order
        )
        values (
          ${candidateId},
          ${input.stage},
          ${emptyToNull(input.person_name)},
          ${input.event_date ?? null},
          ${emptyToNull(input.notes)},
          ${emptyToNull(input.command)},
          ${emptyToNull(input.unit)},
          ${input.result ?? null},
          ${input.sort_order ?? 0}
        )
      `;
    }

    const nextStage =
      stageRank(input.stage) >= stageRank(existing.current_stage)
        ? input.stage
        : existing.current_stage;

    await db`
      update nagadim_candidates set
        current_stage = ${nextStage},
        updated_at = now()
      where id = ${candidateId}
    `;

    return this.getById(candidateId);
  }
}
