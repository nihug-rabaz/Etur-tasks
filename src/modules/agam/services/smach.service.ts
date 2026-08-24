import { BaseService } from "@/services/base.service";
import type { AgamSmachDecision, AgamSmachEvaluation } from "@/modules/agam/types";

export class AgamSmachService extends BaseService {
  public async listByCandidate(candidateId: string): Promise<AgamSmachEvaluation[]> {
    const db = this.getDb();
    return db<AgamSmachEvaluation[]>`
      select * from agam_smach_evaluations
      where candidate_id = ${candidateId}
      order by created_at desc
    `;
  }

  public async upsertMine(input: {
    candidate_id: string;
    evaluator_id: string;
    evaluator_name: string | null;
    threshold_tests: Record<string, unknown> | null;
    professional_scores: Record<string, number> | null;
    professional_feedback: Record<string, string> | null;
    weighted_score: number | null;
    key_points: string | null;
    decision: AgamSmachDecision | null;
    decision_reasoning: string | null;
  }): Promise<AgamSmachEvaluation> {
    const existing = (await this.listByCandidate(input.candidate_id)).find(
      (row) => row.evaluator_id === input.evaluator_id,
    );
    const db = this.getDb();
    if (existing) {
      const rows = await db<AgamSmachEvaluation[]>`
        update agam_smach_evaluations set
          evaluator_name = ${input.evaluator_name},
          threshold_tests = ${input.threshold_tests},
          professional_scores = ${input.professional_scores},
          professional_feedback = ${input.professional_feedback},
          weighted_score = ${input.weighted_score},
          key_points = ${input.key_points},
          decision = ${input.decision},
          decision_reasoning = ${input.decision_reasoning},
          updated_at = now()
        where id = ${existing.id}
        returning *
      `;
      return rows[0];
    }
    const rows = await db<AgamSmachEvaluation[]>`
      insert into agam_smach_evaluations (
        candidate_id, evaluator_id, evaluator_name, threshold_tests, professional_scores,
        professional_feedback, weighted_score, key_points, decision, decision_reasoning
      )
      values (
        ${input.candidate_id},
        ${input.evaluator_id},
        ${input.evaluator_name},
        ${input.threshold_tests},
        ${input.professional_scores},
        ${input.professional_feedback},
        ${input.weighted_score},
        ${input.key_points},
        ${input.decision},
        ${input.decision_reasoning}
      )
      returning *
    `;
    return rows[0];
  }
}
