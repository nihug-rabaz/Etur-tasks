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

  public async create(input: {
    candidate_id: string;
    evaluator_id: string;
    evaluator_name: string | null;
    interview_data: Record<string, unknown> | null;
    evaluator_assessment: string | null;
    recommendation: AgamRecommendation | null;
  }): Promise<AgamInterview> {
    const db = this.getDb();
    const rows = await db<AgamInterview[]>`
      insert into agam_interviews (
        candidate_id, evaluator_id, evaluator_name, interview_data, evaluator_assessment, recommendation
      )
      values (
        ${input.candidate_id},
        ${input.evaluator_id},
        ${input.evaluator_name},
        ${input.interview_data},
        ${input.evaluator_assessment},
        ${input.recommendation}
      )
      returning *
    `;
    return rows[0];
  }

  public async update(
    id: string,
    input: {
      interview_data: Record<string, unknown> | null;
      evaluator_assessment: string | null;
      recommendation: AgamRecommendation | null;
    },
  ): Promise<AgamInterview | null> {
    const db = this.getDb();
    const rows = await db<AgamInterview[]>`
      update agam_interviews set
        interview_data = ${input.interview_data},
        evaluator_assessment = ${input.evaluator_assessment},
        recommendation = ${input.recommendation},
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
    if (!allowOverride && existing.evaluator_id !== evaluatorId) return null;
    return this.update(id, input);
  }
}
