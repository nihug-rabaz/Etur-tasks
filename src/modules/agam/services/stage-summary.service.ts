import { BaseService } from "@/services/base.service";
import { STATUS_LABELS } from "@/modules/agam/lib/stages";
import type {
  AgamCandidate,
  AgamDayEvaluation,
  AgamDocument,
  AgamInterview,
  AgamPrepDayEvaluation,
  AgamSmachEvaluation,
  AgamStageKey,
  AgamStageSummary,
} from "@/modules/agam/types";

export class AgamStageSummaryService extends BaseService {
  public async loadMap(stage: AgamStageKey): Promise<Record<string, AgamStageSummary>> {
    const db = this.getDb();
    if (stage === "day_selection") {
      const [evals, interviews] = await Promise.all([
        db<AgamDayEvaluation[]>`select * from agam_day_evaluations`,
        db<AgamInterview[]>`select * from agam_interviews`,
      ]);
      return this.daySelectionMap(evals, interviews);
    }
    if (stage === "preparation_day") {
      const rows = await db<AgamPrepDayEvaluation[]>`select * from agam_preparation_day_evaluations`;
      return this.prepMap(rows);
    }
    if (stage === "smach") {
      const rows = await db<AgamSmachEvaluation[]>`select * from agam_smach_evaluations`;
      return this.smachMap(rows);
    }
    if (stage === "documents") {
      const rows = await db<AgamDocument[]>`select * from agam_candidate_documents`;
      const counts = new Map<string, number>();
      for (const row of rows) {
        counts.set(row.candidate_id, (counts.get(row.candidate_id) ?? 0) + 1);
      }
      const map: Record<string, AgamStageSummary> = {};
      for (const [id, count] of counts) map[id] = { text: `${count} קבצים` };
      return map;
    }
    const rows = await db<AgamCandidate[]>`select * from agam_candidates`;
    const map: Record<string, AgamStageSummary> = {};
    for (const row of rows) {
      map[row.id] = {
        text: STATUS_LABELS[row.status] ?? row.status,
        detail: row.ramad_notes ?? undefined,
      };
    }
    return map;
  }

  private avg(nums: number[]): number | null {
    if (nums.length === 0) return null;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }

  private fmt(n: number | null): string | null {
    if (n == null || Number.isNaN(n)) return null;
    return n.toFixed(1);
  }

  private daySelectionMap(
    evals: AgamDayEvaluation[],
    interviews: AgamInterview[],
  ): Record<string, AgamStageSummary> {
    const byCandidate = new Map<string, AgamDayEvaluation[]>();
    for (const row of evals) {
      const list = byCandidate.get(row.candidate_id) ?? [];
      list.push(row);
      byCandidate.set(row.candidate_id, list);
    }
    const interviewCounts = new Map<string, number>();
    for (const row of interviews) {
      interviewCounts.set(row.candidate_id, (interviewCounts.get(row.candidate_id) ?? 0) + 1);
    }
    const ids = new Set([...byCandidate.keys(), ...interviewCounts.keys()]);
    const map: Record<string, AgamStageSummary> = {};
    for (const id of ids) {
      const list = byCandidate.get(id) ?? [];
      const scores = list
        .map((row) => row.final_score ?? row.weighted_score)
        .filter((n): n is number => n != null);
      const mean = this.avg(scores);
      const interviewsCount = interviewCounts.get(id) ?? 0;
      map[id] = {
        text:
          mean != null
            ? `ממוצע ${this.fmt(mean)}`
            : interviewsCount > 0
              ? `${interviewsCount} ראיונות`
              : `${list.length} הערכות`,
        detail: [list.length ? `${list.length} הערכות` : null, interviewsCount ? `${interviewsCount} ראיונות` : null]
          .filter(Boolean)
          .join(" · "),
      };
    }
    return map;
  }

  private prepMap(rows: AgamPrepDayEvaluation[]): Record<string, AgamStageSummary> {
    const byCandidate = new Map<string, AgamPrepDayEvaluation[]>();
    for (const row of rows) {
      const list = byCandidate.get(row.candidate_id) ?? [];
      list.push(row);
      byCandidate.set(row.candidate_id, list);
    }
    const map: Record<string, AgamStageSummary> = {};
    for (const [id, list] of byCandidate) {
      const scores = list.flatMap((row) =>
        [row.mikra_score, row.conversation_score, row.social_dynamics_score].filter(
          (n): n is number => n != null,
        ),
      );
      const mean = this.avg(scores);
      map[id] = {
        text: mean != null ? `ממוצע ${this.fmt(mean)}` : `${list.length} הערכות`,
        detail: `${list.length} מעריכים`,
      };
    }
    return map;
  }

  private smachMap(rows: AgamSmachEvaluation[]): Record<string, AgamStageSummary> {
    const byCandidate = new Map<string, AgamSmachEvaluation[]>();
    for (const row of rows) {
      const list = byCandidate.get(row.candidate_id) ?? [];
      list.push(row);
      byCandidate.set(row.candidate_id, list);
    }
    const map: Record<string, AgamStageSummary> = {};
    for (const [id, list] of byCandidate) {
      const decisions = list.map((row) => row.decision).filter(Boolean);
      const scores = list.map((row) => row.weighted_score).filter((n): n is number => n != null);
      const mean = this.avg(scores);
      map[id] = {
        text: decisions[0] ?? (mean != null ? `ציון ${this.fmt(mean)}` : `${list.length} הערכות`),
        detail: mean != null ? `ממוצע ${this.fmt(mean)}` : undefined,
      };
    }
    return map;
  }
}
