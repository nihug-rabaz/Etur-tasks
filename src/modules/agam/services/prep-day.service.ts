import { BaseService } from "@/services/base.service";
import type { AgamPrepDayEvaluation } from "@/modules/agam/types";

export class AgamPrepDayService extends BaseService {
  public async listByCandidate(candidateId: string): Promise<AgamPrepDayEvaluation[]> {
    const db = this.getDb();
    return db<AgamPrepDayEvaluation[]>`
      select * from agam_preparation_day_evaluations
      where candidate_id = ${candidateId}
      order by created_at desc
    `;
  }

  public async upsertMine(input: {
    candidate_id: string;
    evaluator_id: string;
    evaluator_name: string | null;
    mikra_score: number | null;
    conversation_score: number | null;
    conversation_feedback: string | null;
    social_dynamics_score: number | null;
    social_dynamics_feedback: string | null;
    general_impression: string | null;
  }): Promise<AgamPrepDayEvaluation> {
    const existing = (await this.listByCandidate(input.candidate_id)).find(
      (row) => row.evaluator_id === input.evaluator_id,
    );
    const db = this.getDb();
    if (existing) {
      const rows = await db<AgamPrepDayEvaluation[]>`
        update agam_preparation_day_evaluations set
          evaluator_name = ${input.evaluator_name},
          mikra_score = ${input.mikra_score},
          conversation_score = ${input.conversation_score},
          conversation_feedback = ${input.conversation_feedback},
          social_dynamics_score = ${input.social_dynamics_score},
          social_dynamics_feedback = ${input.social_dynamics_feedback},
          general_impression = ${input.general_impression},
          updated_at = now()
        where id = ${existing.id}
        returning *
      `;
      return rows[0];
    }
    const rows = await db<AgamPrepDayEvaluation[]>`
      insert into agam_preparation_day_evaluations (
        candidate_id, evaluator_id, evaluator_name, mikra_score, conversation_score,
        conversation_feedback, social_dynamics_score, social_dynamics_feedback, general_impression
      )
      values (
        ${input.candidate_id},
        ${input.evaluator_id},
        ${input.evaluator_name},
        ${input.mikra_score},
        ${input.conversation_score},
        ${input.conversation_feedback},
        ${input.social_dynamics_score},
        ${input.social_dynamics_feedback},
        ${input.general_impression}
      )
      returning *
    `;
    return rows[0];
  }
}
