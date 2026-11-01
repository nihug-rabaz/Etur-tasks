import { BaseService } from "@/services/base.service";
import { normalizeEmail } from "@/modules/agam/lib/email";
import { normalizePhone, phonesMatch } from "@/modules/agam/lib/phone";
import { AGAM_STAGES } from "@/modules/agam/lib/stages";
import type {
  AgamCandidate,
  AgamCandidateStatus,
  AgamRankColor,
  AgamTimelineEvent,
  AgamTimelineItem,
  AgamTrackStage,
} from "@/modules/agam/types";

export class AgamCandidateService extends BaseService {
  public async list(archived: boolean, limit = 200): Promise<AgamCandidate[]> {
    const db = this.getDb();
    return db<AgamCandidate[]>`
      select cand.*, c.name as cycle_name, nullif(c.schedule->>'bahad1_intake', '') as cycle_bahad1_date
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
      select cand.*, c.name as cycle_name, nullif(c.schedule->>'bahad1_intake', '') as cycle_bahad1_date,
        (
          select count(*)::int from agam_candidates peer
          where peer.cycle_id = cand.cycle_id and peer.cycle_rank is not null
        ) as cycle_rank_total
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

  public async findByEmail(emailRaw: string): Promise<AgamCandidate | null> {
    const email = normalizeEmail(emailRaw);
    if (!email) return null;
    const db = this.getDb();
    const rows = await db<AgamCandidate[]>`
      select cand.*, c.name as cycle_name, nullif(c.schedule->>'bahad1_intake', '') as cycle_bahad1_date
      from agam_candidates cand
      left join agam_cycles c on c.id = cand.cycle_id
      where lower(cand.email) = ${email}
         or lower(nullif(trim(cand.questionnaire_data->>'civilian_email'), '')) = ${email}
      order by cand.created_at desc
      limit 1
    `;
    return rows[0] ?? null;
  }

  public async findByLinkedUser(userId: string): Promise<AgamCandidate | null> {
    const db = this.getDb();
    const rows = await db<AgamCandidate[]>`
      select cand.*, c.name as cycle_name, nullif(c.schedule->>'bahad1_intake', '') as cycle_bahad1_date
      from agam_candidates cand
      left join agam_cycles c on c.id = cand.cycle_id
      where cand.linked_user_id = ${userId}
      order by cand.created_at desc
      limit 1
    `;
    return rows[0] ?? null;
  }

  public async setLinkedUser(id: string, userId: string): Promise<void> {
    const db = this.getDb();
    await db`
      update agam_candidates
      set linked_user_id = ${userId}, updated_at = now()
      where id = ${id}
    `;
  }

  public async create(input: {
    full_name: string;
    personal_number: string;
    phone?: string | null;
    email?: string | null;
    command?: string | null;
    direct_commander_name?: string | null;
    gaps?: string | null;
    exemptions?: string | null;
    km?: string | null;
    planning_index?: number | null;
    dapar?: number | null;
    remaining_cycles?: string | null;
    release_date?: string | null;
    kahas?: number | null;
    tash?: number | null;
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
    const email =
      normalizeEmail(input.email) ??
      normalizeEmail(input.questionnaire_data?.civilian_email);
    const rows = await db<AgamCandidate[]>`
      insert into agam_candidates (
        full_name, personal_number, phone, email, command, direct_commander_name, gaps, exemptions, km,
        planning_index, dapar, remaining_cycles, release_date, kahas, tash, rank_color, needs_sakmar, mabdak_approval, medical_issue,
        internet_test, questionnaire_data, created_by_id, cycle_id
      )
      values (
        ${input.full_name},
        ${input.personal_number},
        ${normalizePhone(input.phone)},
        ${email},
        ${input.command ?? null},
        ${input.direct_commander_name ?? null},
        ${input.gaps ?? null},
        ${input.exemptions ?? null},
        ${input.km ?? null},
        ${input.planning_index ?? null},
        ${input.dapar ?? null},
        ${input.remaining_cycles ?? null},
        ${input.release_date ?? null},
        ${input.kahas ?? null},
        ${input.tash ?? null},
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
      set cycle_id = ${cycleId},
        cycle_rank = case when cycle_id is distinct from ${cycleId} then null else cycle_rank end,
        updated_at = now()
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
    full_name?: string;
    phone?: string | null;
    email?: string | null;
    command?: string | null;
    direct_commander_name?: string | null;
    direct_commander_role?: string | null;
    gaps?: string | null;
    exemptions?: string | null;
    km?: string | null;
    planning_index?: number | null;
    dapar?: number | null;
    remaining_cycles?: string | null;
    release_date?: string | null;
    kahas?: number | null;
    tash?: number | null;
    rank_color?: AgamRankColor | null;
    needs_sakmar?: boolean | null;
    mabdak_approval?: boolean | null;
    medical_issue?: boolean | null;
    internet_test?: boolean | null;
    pre_bahad1_checklist?: Record<string, boolean>;
    questionnaire_data?: Record<string, unknown> | null;
  }): Promise<AgamCandidate | null> {
    const existing = await this.getById(id);
    if (!existing) return null;
    const nextQuestionnaire =
      input.questionnaire_data !== undefined ? input.questionnaire_data : existing.questionnaire_data;
    const nextEmail =
      input.email !== undefined
        ? normalizeEmail(input.email)
        : normalizeEmail(
            (nextQuestionnaire as Record<string, unknown> | null)?.civilian_email,
          ) ?? existing.email;
    const db = this.getDb();
    const rows = await db<AgamCandidate[]>`
      update agam_candidates set
        full_name = ${input.full_name !== undefined ? input.full_name : existing.full_name},
        phone = ${input.phone !== undefined ? input.phone : existing.phone},
        email = ${nextEmail},
        command = ${input.command !== undefined ? input.command : existing.command},
        direct_commander_name = ${input.direct_commander_name !== undefined ? input.direct_commander_name : existing.direct_commander_name},
        direct_commander_role = ${input.direct_commander_role !== undefined ? input.direct_commander_role : existing.direct_commander_role},
        gaps = ${input.gaps !== undefined ? input.gaps : existing.gaps},
        exemptions = ${input.exemptions !== undefined ? input.exemptions : existing.exemptions},
        km = ${input.km !== undefined ? input.km : existing.km},
        planning_index = ${input.planning_index !== undefined ? input.planning_index : existing.planning_index},
        dapar = ${input.dapar !== undefined ? input.dapar : existing.dapar},
        remaining_cycles = ${input.remaining_cycles !== undefined ? input.remaining_cycles : existing.remaining_cycles},
        release_date = ${input.release_date !== undefined ? input.release_date : existing.release_date},
        kahas = ${input.kahas !== undefined ? input.kahas : existing.kahas},
        tash = ${input.tash !== undefined ? input.tash : existing.tash},
        rank_color = ${input.rank_color !== undefined ? input.rank_color : existing.rank_color},
        needs_sakmar = ${input.needs_sakmar !== undefined ? input.needs_sakmar : existing.needs_sakmar},
        mabdak_approval = ${input.mabdak_approval !== undefined ? input.mabdak_approval : existing.mabdak_approval},
        medical_issue = ${input.medical_issue !== undefined ? input.medical_issue : existing.medical_issue},
        internet_test = ${input.internet_test !== undefined ? input.internet_test : existing.internet_test},
        pre_bahad1_checklist = ${input.pre_bahad1_checklist !== undefined ? input.pre_bahad1_checklist : existing.pre_bahad1_checklist},
        questionnaire_data = ${nextQuestionnaire},
        updated_at = now()
      where id = ${id}
      returning *
    `;
    return rows[0] ?? null;
  }

  /** Safe public track view — stage completion only, no scores or staff notes. */
  public async getTrackProgress(candidateId: string): Promise<AgamTrackStage[]> {
    const db = this.getDb();
    const candidate = await this.getById(candidateId);
    if (!candidate) return [];

    const [dayEval, interview, prep, smach, docs] = await Promise.all([
      db<{ n: number }[]>`
        select count(*)::int as n from agam_day_evaluations where candidate_id = ${candidateId}
      `,
      db<{ n: number }[]>`
        select count(*)::int as n from agam_interviews where candidate_id = ${candidateId}
      `,
      db<{ n: number }[]>`
        select count(*)::int as n from agam_preparation_day_evaluations where candidate_id = ${candidateId}
      `,
      db<{ n: number }[]>`
        select count(*)::int as n from agam_smach_evaluations where candidate_id = ${candidateId}
      `,
      db<{ n: number }[]>`
        select count(*)::int as n from agam_candidate_documents where candidate_id = ${candidateId}
      `,
    ]);

    const doneFlags = [
      (dayEval[0]?.n ?? 0) > 0 || (interview[0]?.n ?? 0) > 0,
      (prep[0]?.n ?? 0) > 0,
      (smach[0]?.n ?? 0) > 0,
      (docs[0]?.n ?? 0) > 0,
      candidate.status !== "pending",
    ];

    let currentAssigned = false;
    return AGAM_STAGES.map((stage, index) => {
      if (doneFlags[index]) {
        return { key: stage.key, name: stage.name, description: stage.description, state: "done" as const };
      }
      if (!currentAssigned) {
        currentAssigned = true;
        return {
          key: stage.key,
          name: stage.name,
          description: stage.description,
          state: "current" as const,
        };
      }
      return {
        key: stage.key,
        name: stage.name,
        description: stage.description,
        state: "pending" as const,
      };
    });
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
