import { BaseService } from "@/services/base.service";
import type { AgamInterview, AgamRecommendation } from "@/modules/agam/types";

export class AgamInterviewService extends BaseService {
  public async listByCandidate(candidateId: string): Promise<AgamInterview[]> {
    const db = this.getDb();
    return db<AgamInterview[]>`
      select * from agam_interviews
      where candidate_id = ${candidateId}
      order by created_at desc
    `;
  }

  public async listAll(): Promise<AgamInterview[]> {
    const db = this.getDb();
    return db<AgamInterview[]>`
      select * from agam_interviews
      order by created_at desc
    `;
  }

  public async getById(id: string): Promise<AgamInterview | null> {
    const db = this.getDb();
    const rows = await db<AgamInterview[]>`
      select * from agam_interviews where id = ${id} limit 1
    `;
    return rows[0] ?? null;
  }

  public async getLatestForCandidate(candidateId: string): Promise<AgamInterview | null> {
    const rows = await this.listByCandidate(candidateId);
    return rows[0] ?? null;
  }

  public async create(input: {
    candidate_id: string;
    evaluator_id?: string | null;
    evaluator_name?: string | null;
    interview_data?: Record<string, unknown> | null;
    candidate_part?: Record<string, unknown> | null;
    candidate_part_completed_at?: string | null;
    evaluator_assessment?: string | null;
    recommendation?: AgamRecommendation | null;
  }): Promise<AgamInterview> {
    const db = this.getDb();
    const rows = await db<AgamInterview[]>`
      insert into agam_interviews (
        candidate_id, evaluator_id, evaluator_name, interview_data, candidate_part,
        candidate_part_completed_at, evaluator_assessment, recommendation
      )
      values (
        ${input.candidate_id},
        ${input.evaluator_id ?? null},
        ${input.evaluator_name ?? null},
        ${input.interview_data ?? null},
        ${input.candidate_part ?? null},
        ${input.candidate_part_completed_at ?? null},
        ${input.evaluator_assessment ?? null},
        ${input.recommendation ?? null}
      )
      returning *
    `;
    return rows[0];
  }

  public async update(
    id: string,
    input: {
      interview_data?: Record<string, unknown> | null;
      candidate_part?: Record<string, unknown> | null;
      candidate_part_completed_at?: string | null;
      evaluator_part_completed_at?: string | null;
      evaluator_id?: string | null;
      evaluator_name?: string | null;
      evaluator_assessment?: string | null;
      recommendation?: AgamRecommendation | null;
    },
  ): Promise<AgamInterview | null> {
    const existing = await this.getById(id);
    if (!existing) return null;
    const db = this.getDb();
    const rows = await db<AgamInterview[]>`
      update agam_interviews set
        interview_data = ${input.interview_data !== undefined ? input.interview_data : existing.interview_data},
        candidate_part = ${input.candidate_part !== undefined ? input.candidate_part : existing.candidate_part},
        candidate_part_completed_at = ${
          input.candidate_part_completed_at !== undefined
            ? input.candidate_part_completed_at
            : existing.candidate_part_completed_at
        },
        evaluator_part_completed_at = ${
          input.evaluator_part_completed_at !== undefined
            ? input.evaluator_part_completed_at
            : existing.evaluator_part_completed_at
        },
        evaluator_id = ${input.evaluator_id !== undefined ? input.evaluator_id : existing.evaluator_id},
        evaluator_name = ${input.evaluator_name !== undefined ? input.evaluator_name : existing.evaluator_name},
        evaluator_assessment = ${
          input.evaluator_assessment !== undefined
            ? input.evaluator_assessment
            : existing.evaluator_assessment
        },
        recommendation = ${input.recommendation !== undefined ? input.recommendation : existing.recommendation},
        updated_at = now()
      where id = ${id}
      returning *
    `;
    return rows[0] ?? null;
  }

  public async updateOwned(
    id: string,
    candidateId: string,
    evaluatorId: string,
    allowOverride: boolean,
    input: {
      interview_data: Record<string, unknown> | null;
      evaluator_assessment: string | null;
      recommendation: AgamRecommendation | null;
    },
  ): Promise<AgamInterview | null> {
    const existing = await this.getById(id);
    if (!existing || existing.candidate_id !== candidateId) return null;
    if (!allowOverride && existing.evaluator_id && existing.evaluator_id !== evaluatorId) return null;
    if (!existing.candidate_part_completed_at && !allowOverride) {
      throw new Error("CANDIDATE_PART_INCOMPLETE");
    }
    return this.update(id, {
      ...input,
      evaluator_id: existing.evaluator_id ?? evaluatorId,
      evaluator_part_completed_at: new Date().toISOString(),
    });
  }

  public async upsertCandidatePart(
    candidateId: string,
    candidatePart: Record<string, unknown>,
    complete: boolean,
  ): Promise<AgamInterview> {
    const existing = await this.getLatestForCandidate(candidateId);
    const completedAt = complete ? new Date().toISOString() : null;
    if (existing) {
      const updated = await this.update(existing.id, {
        candidate_part: candidatePart,
        candidate_part_completed_at: complete
          ? existing.candidate_part_completed_at ?? completedAt
          : existing.candidate_part_completed_at,
      });
      if (!updated) throw new Error("UPDATE_FAILED");
      return updated;
    }
    return this.create({
      candidate_id: candidateId,
      candidate_part: candidatePart,
      candidate_part_completed_at: completedAt,
    });
  }
}
