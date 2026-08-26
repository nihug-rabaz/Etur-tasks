import { BaseService } from "@/services/base.service";
import type { AgamCriterion, AgamDayEvaluation } from "@/modules/agam/types";
import { ScoringEngine } from "@/modules/agam/lib/scoring";

export class AgamCriterionService extends BaseService {
  public async listActive(): Promise<AgamCriterion[]> {
    const db = this.getDb();
    return db<AgamCriterion[]>`
      select * from agam_day_evaluation_criteria
      where is_active = true
      order by sort_order
    `;
  }

  public async listAll(): Promise<AgamCriterion[]> {
    const db = this.getDb();
    return db<AgamCriterion[]>`
      select * from agam_day_evaluation_criteria order by sort_order
    `;
  }

  public async create(input: {
    name: string;
    key: string;
    bullets: string | null;
    weight: number;
    sort_order: number;
    is_active: boolean;
  }): Promise<AgamCriterion> {
    const db = this.getDb();
    const rows = await db<AgamCriterion[]>`
      insert into agam_day_evaluation_criteria (name, key, bullets, weight, sort_order, is_active)
      values (
        ${input.name}, ${input.key}, ${input.bullets}, ${input.weight}, ${input.sort_order}, ${input.is_active}
      )
      returning *
    `;
    return rows[0];
  }

  public async update(
    id: string,
    input: {
      name: string;
      key: string;
      bullets: string | null;
      weight: number;
      sort_order: number;
      is_active: boolean;
    },
  ): Promise<AgamCriterion | null> {
    const db = this.getDb();
    const rows = await db<AgamCriterion[]>`
      update agam_day_evaluation_criteria set
        name = ${input.name},
        key = ${input.key},
        bullets = ${input.bullets},
        weight = ${input.weight},
        sort_order = ${input.sort_order},
        is_active = ${input.is_active},
        updated_at = now()
      where id = ${id}
      returning *
    `;
    return rows[0] ?? null;
  }

  public async delete(id: string): Promise<void> {
    const db = this.getDb();
    await db`delete from agam_day_evaluation_criteria where id = ${id}`;
  }
}

export class AgamDayEvaluationService extends BaseService {
  public async listByCandidate(candidateId: string): Promise<AgamDayEvaluation[]> {
    const db = this.getDb();
    return db<AgamDayEvaluation[]>`
      select * from agam_day_evaluations
      where candidate_id = ${candidateId}
      order by created_at desc
    `;
  }

  public async listAll(): Promise<AgamDayEvaluation[]> {
    const db = this.getDb();
    return db<AgamDayEvaluation[]>`
      select * from agam_day_evaluations
      order by created_at desc
    `;
  }

  public async getById(id: string): Promise<AgamDayEvaluation | null> {
    const db = this.getDb();
    const rows = await db<AgamDayEvaluation[]>`
      select * from agam_day_evaluations where id = ${id} limit 1
    `;
    return rows[0] ?? null;
  }

  public async save(input: {
    id?: string;
    candidate_id: string;
    evaluator_id: string;
    evaluator_name: string | null;
    scores_data: Record<string, number>;
    feedback_data: Record<string, string>;
    final_score: number | null;
    final_feedback: string | null;
    criteria: Array<{ key: string; weight: number }>;
  }): Promise<AgamDayEvaluation> {
    const weighted = ScoringEngine.calcWeightedScore(input.scores_data, input.criteria);
    const db = this.getDb();
    if (input.id) {
      const rows = await db<AgamDayEvaluation[]>`
        update agam_day_evaluations set
          scores_data = ${input.scores_data},
          feedback_data = ${input.feedback_data},
          final_score = ${input.final_score},
          final_feedback = ${input.final_feedback},
          weighted_score = ${weighted},
          updated_at = now()
        where id = ${input.id}
        returning *
      `;
      return rows[0];
    }
    const rows = await db<AgamDayEvaluation[]>`
      insert into agam_day_evaluations (
        candidate_id, evaluator_id, evaluator_name, scores_data, feedback_data,
        final_score, final_feedback, weighted_score
      )
      values (
        ${input.candidate_id},
        ${input.evaluator_id},
        ${input.evaluator_name},
        ${input.scores_data},
        ${input.feedback_data},
        ${input.final_score},
        ${input.final_feedback},
        ${weighted}
      )
      returning *
    `;
    return rows[0];
  }
}
