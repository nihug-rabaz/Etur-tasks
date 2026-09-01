import { BaseService } from "@/services/base.service";
import { normalizePhone, phonesMatch } from "@/modules/agam/lib/phone";
import type {
  AgamCandidate,
  AgamCandidateStatus,
  AgamRankColor,
  AgamTimelineEvent,
  AgamTimelineItem,
} from "@/modules/agam/types";

export class AgamCandidateService extends BaseService {
  public async list(archived: boolean, limit = 200): Promise<AgamCandidate[]> {
    const db = this.getDb();
    return db<AgamCandidate[]>`
      select cand.*, c.name as cycle_name
      from agam_candidates cand
      left join agam_cycles c on c.id = cand.cycle_id
      where cand.archived = ${archived}
      order by cand.created_at desc
      limit ${limit}
    `;
  }

  public async getById(id: string): Promise<AgamCandidate | null> {
    const db = this.getDb();
    const rows = await db<AgamCandidate[]>`
      select cand.*, c.name as cycle_name
      from agam_candidates cand
      left join agam_cycles c on c.id = cand.cycle_id
      where cand.id = ${id}
      limit 1
    `;
    return rows[0] ?? null;
  }

  public async findByIdentity(personalNumber: string, phone: string): Promise<AgamCandidate | null> {
    const db = this.getDb();
    const rows = await db<AgamCandidate[]>`
      select * from agam_candidates
      where personal_number = ${personalNumber}
      limit 5
    `;
    return rows.find((row) => phonesMatch(row.phone, phone)) ?? null;
  }

  public async findByPersonalNumber(personalNumber: string): Promise<AgamCandidate | null> {
    const db = this.getDb();
    const rows = await db<AgamCandidate[]>`
      select * from agam_candidates
      where personal_number = ${personalNumber}
      limit 1
    `;
    return rows[0] ?? null;
  }

  public async create(input: {
    full_name: string;
    personal_number: string;
    phone?: string | null;
    command?: string | null;
    direct_commander_name?: string | null;
    gaps?: string | null;
    planning_index?: number | null;
    dapar?: number | null;
    rank_color?: AgamRankColor | null;
    needs_sakmar?: boolean | null;
    mabdak_approval?: boolean | null;
    medical_issue?: boolean | null;
    internet_test?: boolean | null;
    questionnaire_data?: Record<string, unknown> | null;
    created_by_id?: string | null;
    cycle_id?: string | null;
  }): Promise<AgamCandidate> {
    const db = this.getDb();
    const rows = await db<AgamCandidate[]>`
      insert into agam_candidates (
        full_name, personal_number, phone, command, direct_commander_name, gaps,
        planning_index, dapar, rank_color, needs_sakmar, mabdak_approval, medical_issue,
        internet_test, questionnaire_data, created_by_id, cycle_id
      )
      values (
        ${input.full_name},
        ${input.personal_number},
        ${normalizePhone(input.phone)},
        ${input.command ?? null},
        ${input.direct_commander_name ?? null},
        ${input.gaps ?? null},
        ${input.planning_index ?? null},
        ${input.dapar ?? null},
        ${input.rank_color ?? null},
        ${input.needs_sakmar ?? null},
        ${input.mabdak_approval ?? null},
        ${input.medical_issue ?? null},
        ${input.internet_test ?? null},
        ${input.questionnaire_data ?? null},
        ${input.created_by_id ?? null},
        ${input.cycle_id ?? null}
      )
      returning *
    `;
    return rows[0];
  }

  public async setCycle(id: string, cycleId: string | null): Promise<boolean> {
    const db = this.getDb();
    const rows = await db<{ id: string }[]>`
      update agam_candidates
      set cycle_id = ${cycleId}, updated_at = now()
      where id = ${id}
      returning id
    `;
    return rows.length > 0;
  }

  public async listUnassigned(limit = 300): Promise<AgamCandidate[]> {
    const db = this.getDb();
    return db<AgamCandidate[]>`
      select * from agam_candidates
      where archived = false and cycle_id is null
      order by full_name
      limit ${limit}
    `;
  }

  public async setArchived(id: string, archived: boolean): Promise<void> {
    const db = this.getDb();
    await db`
      update agam_candidates set archived = ${archived}, updated_at = now() where id = ${id}
    `;
  }

  public async updateStatus(id: string, status: AgamCandidateStatus): Promise<void> {
    const db = this.getDb();
    await db`
      update agam_candidates set status = ${status}, updated_at = now() where id = ${id}
    `;
  }

  public async updateNotes(id: string, ramad_notes: string): Promise<void> {
    const db = this.getDb();
    await db`
      update agam_candidates set ramad_notes = ${ramad_notes}, updated_at = now() where id = ${id}
    `;
  }

  public async updateProfile(id: string, input: {
    command?: string | null;
    direct_commander_name?: string | null;
    gaps?: string | null;
    planning_index?: number | null;
    dapar?: number | null;
    rank_color?: AgamRankColor | null;
    needs_sakmar?: boolean | null;
    mabdak_approval?: boolean | null;
    medical_issue?: boolean | null;
    internet_test?: boolean | null;
    pre_bahad1_checklist?: Record<string, boolean>;
    questionnaire_data?: Record<string, unknown> | null;
  }): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) return;
    const db = this.getDb();
    await db`
      update agam_candidates set
        command = ${input.command !== undefined ? input.command : existing.command},
        direct_commander_name = ${input.direct_commander_name !== undefined ? input.direct_commander_name : existing.direct_commander_name},
        gaps = ${input.gaps !== undefined ? input.gaps : existing.gaps},
        planning_index = ${input.planning_index !== undefined ? input.planning_index : existing.planning_index},
        dapar = ${input.dapar !== undefined ? input.dapar : existing.dapar},
        rank_color = ${input.rank_color !== undefined ? input.rank_color : existing.rank_color},
        needs_sakmar = ${input.needs_sakmar !== undefined ? input.needs_sakmar : existing.needs_sakmar},
        mabdak_approval = ${input.mabdak_approval !== undefined ? input.mabdak_approval : existing.mabdak_approval},
        medical_issue = ${input.medical_issue !== undefined ? input.medical_issue : existing.medical_issue},
        internet_test = ${input.internet_test !== undefined ? input.internet_test : existing.internet_test},
        pre_bahad1_checklist = ${input.pre_bahad1_checklist !== undefined ? input.pre_bahad1_checklist : existing.pre_bahad1_checklist},
        questionnaire_data = ${input.questionnaire_data !== undefined ? input.questionnaire_data : existing.questionnaire_data},
        updated_at = now()
      where id = ${id}
    `;
  }

  public async delete(id: string): Promise<void> {
    const db = this.getDb();
    await db`delete from agam_candidates where id = ${id}`;
  }

  public async addTimeline(input: {
    candidate_id: string;
    event_type: AgamTimelineEvent;
    title: string;
    description?: string | null;
    actor_name?: string | null;
    stage_key?: string | null;
    created_by_id?: string | null;
  }): Promise<void> {
    if (!input.candidate_id || !input.event_type || !input.title) return;
    try {
      const db = this.getDb();
      await db`
        insert into agam_candidate_timeline (
          candidate_id, event_type, title, description, actor_name, stage_key, created_by_id
        )
        values (
          ${input.candidate_id},
          ${input.event_type},
          ${input.title},
          ${input.description ?? null},
          ${input.actor_name ?? null},
          ${input.stage_key ?? null},
          ${input.created_by_id ?? null}
        )
      `;
    } catch (error) {
      console.error("[agam] addTimeline failed", {
        candidateId: input.candidate_id,
        eventType: input.event_type,
        title: input.title,
        error,
      });
      throw error;
    }
  }

  public async listTimeline(candidateId: string): Promise<AgamTimelineItem[]> {
    const db = this.getDb();
    return db<AgamTimelineItem[]>`
      select * from agam_candidate_timeline
      where candidate_id = ${candidateId}
      order by created_at desc
    `;
  }

  public async getTimelineItem(id: string): Promise<AgamTimelineItem | null> {
    const db = this.getDb();
    const rows = await db<AgamTimelineItem[]>`
      select * from agam_candidate_timeline
      where id = ${id}
      limit 1
    `;
    return rows[0] ?? null;
  }

  public async updateTimelineItem(
    id: string,
    input: { title: string; description: string | null; stage_key: string | null },
  ): Promise<void> {
    const db = this.getDb();
    await db`
      update agam_candidate_timeline
      set title = ${input.title},
          description = ${input.description},
          stage_key = ${input.stage_key}
      where id = ${id}
    `;
  }

  public async deleteTimelineItem(id: string): Promise<void> {
    const db = this.getDb();
    await db`
      delete from agam_candidate_timeline
      where id = ${id}
    `;
  }
}
