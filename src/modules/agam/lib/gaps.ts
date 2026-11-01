import { toDateInputValue } from "@/modules/agam/lib/date-format";
import type { AgamCandidate } from "@/modules/agam/types";

export type AgamGapCandidate = Pick<AgamCandidate, "planning_index" | "release_date" | "cycle_bahad1_date">;

function addMonths(dateKey: string, months: number): string {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setMonth(date.getMonth() + months);
  return toDateInputValue(date);
}

/** Gaps are derived from the candidate's data — never typed by hand. */
export function candidateGaps(candidate: AgamGapCandidate): string[] {
  const gaps: string[] = [];
  const release = candidate.release_date ? toDateInputValue(candidate.release_date) : "";
  const bahad1 = candidate.cycle_bahad1_date ? toDateInputValue(candidate.cycle_bahad1_date) : "";
  if (release && bahad1 && release < addMonths(bahad1, 3)) gaps.push("הקצאת קבע");
  if (candidate.planning_index === 1) gaps.push("נדרש רח״ט תומכ״א");
  if (candidate.planning_index === 2) gaps.push("נדרש באישור ראש עתכא״ס");
  return gaps;
}
