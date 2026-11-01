import type { AgamStageKey } from "@/modules/agam/types";

export const AGAM_STAGES: Array<{
  key: AgamStageKey;
  name: string;
  description: string;
  ramadOnly?: boolean;
}> = [
  {
    key: "day_selection",
    name: "יום המיונים",
    description: "ריאיונות והערכות יום מיונים",
  },
  {
    key: "preparation_day",
    name: "היום המכין",
    description:
      "הערכת היום המכין — מקראות ישראל, העברת שיחה, דינמיקות חברתיות והתרשמות כללית",
  },
  {
    key: "smach",
    name: "סמ״ח",
    description: "הערכת סמ״ח — מבחני סף, הערכה מקצועית, ציון משוקלל והחלטה",
  },
  {
    key: "documents",
    name: "מסמכים",
    description: "ניהול מסמכי המועמד",
  },
  {
    key: "final_decision",
    name: "החלטה סופית",
    description: "החלטת מעבר ודוח סופי",
    ramadOnly: true,
  },
];

export const STATUS_LABELS: Record<string, string> = {
  pending: "ממתין",
  passed: "עבר",
  not_passed: "לא עבר",
};

export const STATUS_TONES: Record<string, string> = {
  pending: "bg-[var(--agam-orange-soft,#fff4e8)] text-text-primary ring-1 ring-[color-mix(in_srgb,#fb923c_22%,transparent)]",
  passed: "bg-surface-2 text-text-primary",
  not_passed: "bg-surface-2 text-text-primary",
};

export type AgamThresholdInputType = "score" | "time" | "count";

export type AgamThresholdFamily = "mikraot_israel" | "weapon_test" | "fitness_run" | "fitness_strength";

const THRESHOLD_ATTEMPTS = [1, 2, 3, 4] as const;

/** Old single-key fields → attempt #1 (read fallback only). */
export const LEGACY_THRESHOLD_KEYS: Record<string, string> = {
  mikraot_israel: "mikraot_israel_1",
  weapon_test: "weapon_test_1",
  fitness_run: "fitness_run_1",
  fitness_strength: "fitness_strength_1",
};

export function thresholdFamily(key: string): AgamThresholdFamily | null {
  const match = key.match(/^(mikraot_israel|weapon_test|fitness_run|fitness_strength)(?:_\d+)?$/);
  return (match?.[1] as AgamThresholdFamily | undefined) ?? null;
}

export const THRESHOLD_TESTS: Array<{
  key: string;
  label: string;
  inputType: AgamThresholdInputType;
  inputLabel?: string;
  family: AgamThresholdFamily;
  attempt: number;
}> = [
  ...THRESHOLD_ATTEMPTS.map((attempt) => ({
    key: `mikraot_israel_${attempt}`,
    label: `מקראות ישראל ${attempt}`,
    inputType: "score" as const,
    inputLabel: "ציון 1–100",
    family: "mikraot_israel" as const,
    attempt,
  })),
  ...THRESHOLD_ATTEMPTS.map((attempt) => ({
    key: `weapon_test_${attempt}`,
    label: `בוחן נשק ${attempt}`,
    inputType: "score" as const,
    inputLabel: "ציון 1–100",
    family: "weapon_test" as const,
    attempt,
  })),
  ...THRESHOLD_ATTEMPTS.map((attempt) => ({
    key: `fitness_run_${attempt}`,
    label: `ריצה ${attempt}`,
    inputType: "time" as const,
    inputLabel: "זמן ריצה:",
    family: "fitness_run" as const,
    attempt,
  })),
  ...THRESHOLD_ATTEMPTS.map((attempt) => ({
    key: `fitness_strength_${attempt}`,
    label: `שכיבות סמיכה ${attempt}`,
    inputType: "count" as const,
    inputLabel: "כמות שכיבות סמיכה:",
    family: "fitness_strength" as const,
    attempt,
  })),
];

/** Pass cutoffs by family (auto עבר / לא עבר). */
export const THRESHOLD_PASS: Record<AgamThresholdFamily, { scoreMin?: number; countMin?: number; timeMax?: string }> = {
  mikraot_israel: { scoreMin: 70 },
  weapon_test: { scoreMin: 70 },
  fitness_run: { timeMax: "17:10" },
  fitness_strength: { countMin: 12 },
};

/** Parse "m:ss" / "mm:ss" into total seconds. Returns null if invalid. */
export function parseThresholdTime(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const match = String(raw).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds >= 60) return null;
  return minutes * 60 + seconds;
}

type ThresholdPassInput = {
  score?: number | null;
  time?: string | null;
  count?: number | null;
};

/** Derive עבר/לא עבר from the entered value. Null when there is no usable value. */
export function computeThresholdPass(key: string, entry: ThresholdPassInput | null | undefined): boolean | null {
  if (!entry) return null;
  const family = thresholdFamily(key);
  const rule = family ? THRESHOLD_PASS[family] : undefined;
  if (!rule) return null;

  if (rule.scoreMin != null) {
    const score = entry.score;
    if (score == null || !Number.isFinite(Number(score))) return null;
    return Number(score) >= rule.scoreMin;
  }
  if (rule.countMin != null) {
    const count = entry.count;
    if (count == null || !Number.isFinite(Number(count))) return null;
    return Number(count) >= rule.countMin;
  }
  if (rule.timeMax != null) {
    const actual = parseThresholdTime(entry.time);
    const max = parseThresholdTime(rule.timeMax);
    if (actual == null || max == null) return null;
    return actual <= max;
  }
  return null;
}

/** Attach auto `pass` onto a threshold entry from its numeric/time fields. */
export function withAutoThresholdPass<T extends ThresholdPassInput & { pass?: boolean | null }>(
  key: string,
  entry: T,
): T {
  return { ...entry, pass: computeThresholdPass(key, entry) };
}

/** Map legacy single keys onto attempt #1; keep modern keys as-is. */
export function normalizeThresholdTests<T>(
  raw: Record<string, T> | null | undefined,
): Record<string, T> {
  if (!raw) return {};
  const next: Record<string, T> = { ...raw };
  for (const [legacy, modern] of Object.entries(LEGACY_THRESHOLD_KEYS)) {
    if (next[modern] == null && next[legacy] != null) {
      next[modern] = next[legacy];
    }
  }
  return next;
}

export const PROFESSIONAL_CRITERIA: Array<{ key: string; label: string }> = [
  { key: "public_speaking", label: "עמידה ודיבור בפני קהל" },
  { key: "content_preparation", label: "הכנת והעברת תוכן" },
  { key: "odt_engagement", label: "ODT ומעורבות" },
  { key: "command_experience", label: "התנסות פיקודית" },
  { key: "self_confidence", label: "ביטחון עצמי" },
  { key: "command_simulations", label: "סימולציות פיקודיות" },
  {
    key: "general_conduct",
    label: "התנהלות כללית (השתתפות, מעורבות, עמידה בזמנים, יחס לעמיתים וכד׳)",
  },
];

export const RECOMMENDATION_TONES: Record<string, string> = {
  ממליץ: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-100",
  "ממליץ בהסתייגות": "bg-amber-500/15 text-amber-800 dark:text-amber-100",
  "לא ממליץ": "bg-rose-500/15 text-rose-800 dark:text-rose-100",
};

export const RECOMMENDATIONS = ["ממליץ", "ממליץ בהסתייגות", "לא ממליץ"] as const;

export const SMACH_DECISIONS = ["מומלץ", "מומלץ בהסתייגות", "לא מומלץ"] as const;

export const STAGE_VIEWS: Array<{
  key: AgamStageKey;
  label: string;
  columnHeader: string;
  actionLabel: string;
}> = [
  {
    key: "day_selection",
    label: "יום המיונים",
    columnHeader: "ציון יום מיונים",
    actionLabel: "הערכת יום מיונים",
  },
  {
    key: "preparation_day",
    label: "היום המכין",
    columnHeader: "ממוצע היום המכין",
    actionLabel: "הערכת היום המכין",
  },
  {
    key: "smach",
    label: "סמ״ח",
    columnHeader: "סמ״ח",
    actionLabel: "הערכת סמ״ח",
  },
  {
    key: "documents",
    label: "מסמכים",
    columnHeader: "מסמכים",
    actionLabel: "פתח מסמכים",
  },
  {
    key: "final_decision",
    label: "החלטה סופית",
    columnHeader: "החלטה",
    actionLabel: "פתח החלטה סופית",
  },
];
