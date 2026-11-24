import { BaseService } from "@/services/base.service";
import type {
  AgamCandidate,
  AgamCycle,
  AgamPrepDayEvaluation,
  AgamRecommendation,
  AgamSmachEvaluation,
} from "@/modules/agam/types";
import { AgamCycleService } from "@/modules/agam/services/cycle.service";
import { AgamCandidateService } from "@/modules/agam/services/candidate.service";
import { AgamOrgSettingsService } from "@/modules/agam/services/org-settings.service";
import { AgamPrepDayService } from "@/modules/agam/services/prep-day.service";
import { AgamSmachService } from "@/modules/agam/services/smach.service";
import { toDateInputValue } from "@/modules/agam/lib/date-format";

export type EvaluatorEntryKind = "interview" | "evaluation" | "prep" | "smach";

export interface EvaluatorEntryState {
  /** Someone (anyone) filled this entry. */
  done: boolean;
  /** Current evaluator's own entry id, if any. */
  mineId: string | null;
  /** How many evaluators filled it (interview: 0/1). */
  count: number;
  passed: boolean | null;
  score: number | null;
  by: string | null;
  updatedAt: string | null;
}

export interface EvaluatorRosterItem {
  id: string;
  full_name: string;
  personal_number: string;
  command: string | null;
  entries: Record<EvaluatorEntryKind, EvaluatorEntryState>;
}

export interface EvaluatorCycleSummary {
  id: string;
  name: string;
  cycle_date: string | null;
  cohort_year: number | null;
  selection_day: string | null;
  prep_day: string | null;
  smach_start: string | null;
  smach_end: string | null;
  candidate_count: number;
}

export interface EvaluatorCandidateView {
  cycle: EvaluatorCycleSummary;
  candidate: {
    id: string;
    full_name: string;
    personal_number: string;
    phone: string | null;
    command: string | null;
    direct_commander_name: string | null;
    direct_commander_role: string | null;
  };
  entries: Record<EvaluatorEntryKind, EvaluatorEntryState>;
  interviewRecommendation: AgamRecommendation | null;
  myPrep: AgamPrepDayEvaluation | null;
  mySmach: AgamSmachEvaluation | null;
}

type EntryRow = {
  candidate_id: string;
  id: string;
  evaluator_id: string | null;
  evaluator_name: string | null;
  passed: boolean | null;
  score: number | null;
  updated_at: string;
};

function emptyEntry(): EvaluatorEntryState {
  return { done: false, mineId: null, count: 0, passed: null, score: null, by: null, updatedAt: null };
}

/** Rows are newest-first; "mine" wins over others for score/passed. */
function foldEntry(rows: EntryRow[], userId: string, singleShared = false): EvaluatorEntryState {
  if (rows.length === 0) return emptyEntry();
  const mine = rows.find((row) => row.evaluator_id === userId) ?? null;
  const shown = singleShared ? rows[0] : mine ?? rows[0];
  return {
    done: true,
    mineId: singleShared ? (rows[0].evaluator_id === userId ? rows[0].id : null) : mine?.id ?? null,
    count: singleShared ? 1 : new Set(rows.map((row) => row.evaluator_id ?? row.id)).size,
    passed: (mine ?? shown).passed,
    score: (mine ?? shown).score,
    by: shown.evaluator_name,
    updatedAt: (mine ?? shown).updated_at,
  };
}

export function summarizeCycle(cycle: AgamCycle): EvaluatorCycleSummary {
  const schedule = cycle.schedule ?? null;
  return {
    id: cycle.id,
    name: cycle.name,
    cycle_date: cycle.cycle_date ? toDateInputValue(cycle.cycle_date) : null,
    cohort_year: cycle.cohort_year,
    selection_day: schedule?.selection_day ?? null,
    prep_day: schedule?.prep_day ?? null,
    smach_start: schedule?.smach_start ?? null,
    smach_end: schedule?.smach_end ?? null,
    candidate_count: cycle.candidate_count ?? 0,
  };
}

export class AgamEvaluatorPortalService extends BaseService {
  /** Admin-pinned cycle, else (among cycles that have candidates) the nearest upcoming by date, else the latest. */
  public async getActiveCycle(): Promise<AgamCycle | null> {
    const [settings, cycles] = await Promise.all([
      new AgamOrgSettingsService().getSingleton(),
      new AgamCycleService().list(false),
    ]);
    const pinned = settings?.active_cycle_id
      ? cycles.find((cycle) => cycle.id === settings.active_cycle_id)
      : undefined;
    if (pinned) return pinned;

    const today = new Date().toISOString().slice(0, 10);
    const populated = cycles.filter((cycle) => (cycle.candidate_count ?? 0) > 0);
    const dated = (populated.length > 0 ? populated : cycles)
      .map((cycle) => ({ cycle, day: cycle.cycle_date ? toDateInputValue(cycle.cycle_date) : "" }))
      .filter((row) => row.day);
    const upcoming = dated.filter((row) => row.day >= today).sort((a, b) => a.day.localeCompare(b.day));
    if (upcoming[0]) return upcoming[0].cycle;
    return dated.sort((a, b) => b.day.localeCompare(a.day))[0]?.cycle ?? cycles[0] ?? null;
  }

  public async isCandidateInActiveCycle(candidateId: string): Promise<boolean> {
    const [cycle, candidate] = await Promise.all([
      this.getActiveCycle(),
      new AgamCandidateService().getById(candidateId),
    ]);
    return Boolean(cycle && candidate && !candidate.archived && candidate.cycle_id === cycle.id);
  }

  private async entryRows(candidateIds: string[]) {
    if (candidateIds.length === 0) {
      return { interviews: [], evaluations: [], prep: [], smach: [] } as Record<string, EntryRow[]>;
    }
    const db = this.getDb();
    const [interviews, evaluations, prep, smach] = await Promise.all([
      db<EntryRow[]>`
        select candidate_id, id, evaluator_id, evaluator_name, null::boolean as passed, null::numeric as score, updated_at
        from agam_interviews
        where candidate_id = any(${candidateIds}::uuid[]) and evaluator_part_completed_at is not null
        order by updated_at desc
      `,
      db<EntryRow[]>`
        select candidate_id, id, evaluator_id, evaluator_name, passed,
          coalesce(final_score, weighted_score)::float8 as score, updated_at
        from agam_day_evaluations
        where candidate_id = any(${candidateIds}::uuid[])
        order by updated_at desc
      `,
      db<EntryRow[]>`
        select candidate_id, id, evaluator_id, evaluator_name, passed, mikra_score::float8 as score, updated_at
        from agam_preparation_day_evaluations
        where candidate_id = any(${candidateIds}::uuid[])
        order by updated_at desc
      `,
      db<EntryRow[]>`
        select candidate_id, id, evaluator_id, evaluator_name, passed, weighted_score::float8 as score, updated_at
        from agam_smach_evaluations
        where candidate_id = any(${candidateIds}::uuid[])
        order by updated_at desc
      `,
    ]);
    return { interviews, evaluations, prep, smach };
  }

  private buildEntries(
    candidateId: string,
    rows: Record<string, EntryRow[]>,
    userId: string,
  ): Record<EvaluatorEntryKind, EvaluatorEntryState> {
    const pick = (list: EntryRow[]) => list.filter((row) => row.candidate_id === candidateId);
    return {
      interview: foldEntry(pick(rows.interviews), userId, true),
      evaluation: foldEntry(pick(rows.evaluations), userId),
      prep: foldEntry(pick(rows.prep), userId),
      smach: foldEntry(pick(rows.smach), userId),
    };
  }

  public async roster(userId: string): Promise<{ cycle: EvaluatorCycleSummary | null; candidates: EvaluatorRosterItem[] }> {
    const cycle = await this.getActiveCycle();
    if (!cycle) return { cycle: null, candidates: [] };
    const candidates = (await new AgamCycleService().listCandidates(cycle.id)).filter((row) => !row.archived);
    const rows = await this.entryRows(candidates.map((row) => row.id));
    return {
      cycle: summarizeCycle(cycle),
      candidates: candidates.map((row: AgamCandidate) => ({
        id: row.id,
        full_name: row.full_name,
        personal_number: row.personal_number,
        command: row.command,
        entries: this.buildEntries(row.id, rows, userId),
      })),
    };
  }

  public async candidateView(candidateId: string, userId: string): Promise<EvaluatorCandidateView | null> {
    const cycle = await this.getActiveCycle();
    if (!cycle) return null;
    const candidateService = new AgamCandidateService();
    const candidate = await candidateService.getById(candidateId);
    if (!candidate || candidate.archived || candidate.cycle_id !== cycle.id) return null;

    const db = this.getDb();
    const [rows, prepList, smachList, latestInterview] = await Promise.all([
      this.entryRows([candidateId]),
      new AgamPrepDayService().listByCandidate(candidateId),
      new AgamSmachService().listByCandidate(candidateId),
      db<{ recommendation: AgamRecommendation | null }[]>`
        select recommendation from agam_interviews
        where candidate_id = ${candidateId} and evaluator_part_completed_at is not null
        order by updated_at desc limit 1
      `,
    ]);

    return {
      cycle: summarizeCycle(cycle),
      candidate: {
        id: candidate.id,
        full_name: candidate.full_name,
        personal_number: candidate.personal_number,
        phone: candidate.phone,
        command: candidate.command,
        direct_commander_name: candidate.direct_commander_name,
        direct_commander_role: candidate.direct_commander_role,
      },
      entries: this.buildEntries(candidateId, rows, userId),
      interviewRecommendation: latestInterview[0]?.recommendation ?? null,
      myPrep: prepList.find((row) => row.evaluator_id === userId) ?? null,
      mySmach: smachList.find((row) => row.evaluator_id === userId) ?? null,
    };
  }
}
