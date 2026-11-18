import { toDateInputValue } from "@/modules/agam/lib/date-format";
import type { AgamCandidate } from "@/modules/agam/types";

export type AgamGapCandidate = Pick<AgamCandidate, "planning_index" | "release_date" | "cycle_bahad1_date" | "gaps">;

function addMonths(dateKey: string, months: number): string {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setMonth(date.getMonth() + months);
  return toDateInputValue(date);
}

/** Gaps derived from the candidate's data. */
export function derivedGaps(candidate: AgamGapCandidate): string[] {
  const gaps: string[] = [];
  const release = candidate.release_date ? toDateInputValue(candidate.release_date) : "";
  const bahad1 = candidate.cycle_bahad1_date ? toDateInputValue(candidate.cycle_bahad1_date) : "";
  if (release && bahad1 && release < addMonths(bahad1, 3)) gaps.push("הקצאת קבע");
  if (candidate.planning_index === 1) gaps.push("נדרש רח״ט תומכ״א");
  if (candidate.planning_index === 2) gaps.push("נדרש באישור ראש עתכא״ס");
  return gaps;
}

/** Gaps typed by staff, stored one per line in `agam_candidates.gaps`. */
export function manualGaps(candidate: Pick<AgamCandidate, "gaps">): string[] {
  return [
    ...new Set(
      (candidate.gaps ?? "")
        .split("\n")
        .map((gap) => gap.trim())
        .filter(Boolean),
    ),
  ];
}

export function serializeManualGaps(gaps: string[]): string | null {
  const clean = [...new Set(gaps.map((gap) => gap.trim()).filter(Boolean))];
  return clean.length > 0 ? clean.join("\n") : null;
}

export function candidateGaps(candidate: AgamGapCandidate): string[] {
  return [...new Set([...derivedGaps(candidate), ...manualGaps(candidate)])];
}
