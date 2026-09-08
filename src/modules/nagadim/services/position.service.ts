import { BaseService } from "@/services/base.service";
import { MAX_POSITION_CANDIDATES } from "@/modules/nagadim/lib/decisions";
import type {
  NagadimGapStatus,
  NagadimPosition,
  NagadimPositionCandidate,
  NagadimPositionCandidateWrite,
  NagadimPositionWithCandidates,
  NagadimPositionWrite,
} from "@/modules/nagadim/types";

export class NagadimPositionService extends BaseService {
  public async list(gapStatus?: NagadimGapStatus | null): Promise<NagadimPositionWithCandidates[]> {
    const db = this.getDb();
    const positions =
      gapStatus != null
        ? await db<NagadimPosition[]>`
            select *
            from nagadim_positions
            where gap_status = ${gapStatus}
            order by updated_at desc, created_at desc
          `
        : await db<NagadimPosition[]>`
            select *
            from nagadim_positions
            order by updated_at desc, created_at desc
          `;

    if (!positions.length) return [];

    const ids = positions.map((row) => row.id);
    const slots = await db<NagadimPositionCandidate[]>`
      select *
      from nagadim_position_candidates
      where position_id = any(${ids})
      order by sort_order asc, created_at asc
    `;

    const byPosition = new Map<string, NagadimPositionCandidate[]>();
    for (const slot of slots) {
      const list = byPosition.get(slot.position_id) ?? [];
      list.push(slot);
      byPosition.set(slot.position_id, list);
    }

    return positions.map((position) => ({
      ...position,
      candidates: byPosition.get(position.id) ?? [],
    }));
  }

  public async getById(id: string): Promise<NagadimPositionWithCandidates | null> {
    const db = this.getDb();
    const rows = await db<NagadimPosition[]>`
      select * from nagadim_positions
      where id = ${id}
      limit 1
    `;
    const position = rows[0];
    if (!position) return null;

    const candidates = await db<NagadimPositionCandidate[]>`
      select *
      from nagadim_position_candidates
      where position_id = ${id}
      order by sort_order asc, created_at asc
    `;
    return { ...position, candidates };
  }

  public async create(input: NagadimPositionWrite): Promise<NagadimPositionWithCandidates> {
    const db = this.getDb();
    const rows = await db<NagadimPosition[]>`
      insert into nagadim_positions (
        command, division, brigade, unit, activity_level, gap_status, notes
      )
      values (
        ${input.command ?? null},
        ${input.division ?? null},
        ${input.brigade ?? null},
        ${input.unit ?? null},
        ${input.activity_level ?? null},
        ${input.gap_status ?? "open"},
        ${input.notes ?? null}
      )
      returning *
    `;
    return { ...rows[0], candidates: [] };
  }

  public async update(
    id: string,
    input: NagadimPositionWrite,
  ): Promise<NagadimPositionWithCandidates | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const db = this.getDb();
    const rows = await db<NagadimPosition[]>`
      update nagadim_positions set
        command = ${input.command !== undefined ? input.command : existing.command},
        division = ${input.division !== undefined ? input.division : existing.division},
        brigade = ${input.brigade !== undefined ? input.brigade : existing.brigade},
        unit = ${input.unit !== undefined ? input.unit : existing.unit},
        activity_level = ${
          input.activity_level !== undefined ? input.activity_level : existing.activity_level
        },
        gap_status = ${input.gap_status !== undefined ? input.gap_status : existing.gap_status},
        notes = ${input.notes !== undefined ? input.notes : existing.notes},
        updated_at = now()
      where id = ${id}
      returning *
    `;
    if (!rows[0]) return null;
    return { ...rows[0], candidates: existing.candidates };
  }

  public async delete(id: string): Promise<boolean> {
    const db = this.getDb();
    const rows = await db<{ id: string }[]>`
      delete from nagadim_positions
      where id = ${id}
      returning id
    `;
    return rows.length > 0;
  }

  public async addCandidate(
    positionId: string,
    input: NagadimPositionCandidateWrite,
  ): Promise<NagadimPositionWithCandidates | null> {
    const existing = await this.getById(positionId);
    if (!existing) return null;
    if (existing.candidates.length >= MAX_POSITION_CANDIDATES) {
      throw new Error(`MAX_CANDIDATES:${MAX_POSITION_CANDIDATES}`);
    }

    const db = this.getDb();
    const sortOrder =
      input.sort_order ??
      (existing.candidates.reduce((max, row) => Math.max(max, row.sort_order), -1) + 1);

    await db`
      insert into nagadim_position_candidates (
        position_id, full_name, decision, sort_order, notes
      )
      values (
        ${positionId},
        ${input.full_name ?? ""},
        ${input.decision ?? null},
        ${sortOrder},
        ${input.notes ?? null}
      )
    `;

    await db`
      update nagadim_positions set updated_at = now() where id = ${positionId}
    `;

    return this.getById(positionId);
  }

  public async updateCandidate(
    positionId: string,
    slotId: string,
    input: NagadimPositionCandidateWrite,
  ): Promise<NagadimPositionWithCandidates | null> {
    const existing = await this.getById(positionId);
    if (!existing) return null;
    const slot = existing.candidates.find((row) => row.id === slotId);
    if (!slot) return null;

    const db = this.getDb();
    await db`
      update nagadim_position_candidates set
        full_name = ${input.full_name !== undefined ? input.full_name : slot.full_name},
        decision = ${input.decision !== undefined ? input.decision : slot.decision},
        sort_order = ${input.sort_order !== undefined ? input.sort_order : slot.sort_order},
        notes = ${input.notes !== undefined ? input.notes : slot.notes}
      where id = ${slotId} and position_id = ${positionId}
    `;

    await db`
      update nagadim_positions set updated_at = now() where id = ${positionId}
    `;

    return this.getById(positionId);
  }

  public async deleteCandidate(
    positionId: string,
    slotId: string,
  ): Promise<NagadimPositionWithCandidates | null> {
    const existing = await this.getById(positionId);
    if (!existing) return null;

    const db = this.getDb();
    const rows = await db<{ id: string }[]>`
      delete from nagadim_position_candidates
      where id = ${slotId} and position_id = ${positionId}
      returning id
    `;
    if (!rows.length) return null;

    await db`
      update nagadim_positions set updated_at = now() where id = ${positionId}
    `;

    return this.getById(positionId);
  }

  public async stats(): Promise<{
    openGaps: number;
    closedGaps: number;
    permanentlyClosedGaps: number;
    activeCandidates: number;
    positions: number;
  }> {
    const db = this.getDb();
    const [gapRows, candidateRows, positionRows] = await Promise.all([
      db<{ gap_status: string; count: number }[]>`
        select gap_status, count(*)::int as count
        from nagadim_positions
        group by gap_status
      `,
      db<{ count: number }[]>`
        select count(*)::int as count from nagadim_candidates
      `,
      db<{ count: number }[]>`
        select count(*)::int as count from nagadim_positions
      `,
    ]);

    const byStatus = Object.fromEntries(gapRows.map((row) => [row.gap_status, row.count]));
    return {
      openGaps: byStatus.open ?? 0,
      closedGaps: byStatus.closed ?? 0,
      permanentlyClosedGaps: byStatus.permanently_closed ?? 0,
      activeCandidates: candidateRows[0]?.count ?? 0,
      positions: positionRows[0]?.count ?? 0,
    };
  }
}
