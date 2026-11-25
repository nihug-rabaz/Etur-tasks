import { BaseService } from "@/services/base.service";
import { THRESHOLD_TESTS, computeThresholdPass } from "@/modules/agam/lib/stages";
import type { AgamExamResult } from "@/modules/agam/types";

const TEST_BY_KEY = new Map(THRESHOLD_TESTS.map((test) => [test.key, test]));

export type AgamExamResultInput = { test_key: string; value: string | null };

export class AgamExamResultService extends BaseService {
  public async listByCandidate(candidateId: string): Promise<AgamExamResult[]> {
    const db = this.getDb();
    return db<AgamExamResult[]>`
      select candidate_id, test_key, score::float8 as score, run_time, count, pass, updated_by_name, updated_at
      from agam_exam_results
      where candidate_id = ${candidateId}
    `;
  }

  /** Writes one value per test; an empty value clears that test. */
  public async saveMany(
    candidateId: string,
    inputs: AgamExamResultInput[],
    actor: { id: string; name: string | null },
  ): Promise<AgamExamResult[]> {
    const db = this.getDb();
    for (const input of inputs) {
      const test = TEST_BY_KEY.get(input.test_key);
      if (!test) continue;
      const raw = input.value?.trim() ?? "";
      if (!raw) {
        await db`delete from agam_exam_results where candidate_id = ${candidateId} and test_key = ${test.key}`;
        continue;
      }
      const score = test.inputType === "score" ? Number(raw) : null;
      const count = test.inputType === "count" ? Math.round(Number(raw)) : null;
      const runTime = test.inputType === "time" ? raw : null;
      const pass = computeThresholdPass(test.key, { score, count, time: runTime });
      await db`
        insert into agam_exam_results (candidate_id, test_key, score, run_time, count, pass, updated_by_id, updated_by_name)
        values (${candidateId}, ${test.key}, ${score}, ${runTime}, ${count}, ${pass}, ${actor.id}, ${actor.name})
        on conflict (candidate_id, test_key) do update set
          score = excluded.score,
          run_time = excluded.run_time,
          count = excluded.count,
          pass = excluded.pass,
          updated_by_id = excluded.updated_by_id,
          updated_by_name = excluded.updated_by_name,
          updated_at = now()
      `;
    }
    return this.listByCandidate(candidateId);
  }
}

