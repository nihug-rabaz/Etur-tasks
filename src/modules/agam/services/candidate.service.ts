import { BaseService } from "@/services/base.service";
import type { AgamCandidate, AgamCandidateStatus, AgamTimelineEvent, AgamTimelineItem } from "@/modules/agam/types";

export class AgamCandidateService extends BaseService {
  public async list(archived: boolean, limit = 200): Promise<AgamCandidate[]> {
    const db = this.getDb();
    return db<AgamCandidate[]>`
      select * from agam_candidates
      where archived = ${archived}
      order by created_at desc
      limit ${limit}
    `;
  }

  public async listRecent(limit = 8): Promise<AgamCandidate[]> {
    return this.list(false, limit);
  }

  public async getById(id: string): Promise<AgamCandidate | null> {
    const db = this.getDb();
    const rows = await db<AgamCandidate[]>`
      select * from agam_candidates where id = ${id} limit 1
    `;
    return rows[0] ?? null;
  }

  public async findByIdentity(personalNumber: string, phone: string): Promise<AgamCandidate | null> {
    const db = this.getDb();
    const rows = await db<AgamCandidate[]>`
      select * from agam_candidates
      where personal_number = ${personalNumber} and phone = ${phone}
      limit 1
    `;
    return rows[0] ?? null;
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
    questionnaire_data?: Record<string, unknown> | null;
    created_by_id?: string | null;
  }): Promise<AgamCandidate> {
    const db = this.getDb();
    const rows = await db<AgamCandidate[]>`
      insert into agam_candidates (full_name, personal_number, phone, questionnaire_data, created_by_id)
      values (
        ${input.full_name},
        ${input.personal_number},
        ${input.phone ?? null},
        ${input.questionnaire_data ?? null},
        ${input.created_by_id ?? null}
      )
      returning *
    `;
    return rows[0];
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
  }): Promise<void> {
    if (!input.candidate_id || !input.event_type || !input.title) return;
    try {
      const db = this.getDb();
      await db`
        insert into agam_candidate_timeline (
          candidate_id, event_type, title, description, actor_name, stage_key
        )
        values (
          ${input.candidate_id},
          ${input.event_type},
          ${input.title},
          ${input.description ?? null},
          ${input.actor_name ?? null},
          ${input.stage_key ?? null}
        )
      `;
    } catch (error) {
      console.error("[agam] addTimeline failed", error);
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
}
