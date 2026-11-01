export const REMAINING_CYCLES_OPTIONS = ["0", "1", "2", "2+"] as const;

export type AgamRemainingCycles = (typeof REMAINING_CYCLES_OPTIONS)[number];

export function isRemainingCycles(value: unknown): value is AgamRemainingCycles {
  return typeof value === "string" && (REMAINING_CYCLES_OPTIONS as readonly string[]).includes(value);
}
