import type { AgamExamResult } from "@/modules/agam/types";

/** Display value of a stored result for its test type. */
export function examResultValue(result: AgamExamResult | undefined): string | null {
  if (!result) return null;
  if (result.run_time) return result.run_time;
  if (result.count != null) return String(result.count);
  if (result.score != null) return String(result.score);
  return null;
}
