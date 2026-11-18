import { SCHEDULED_CANDIDATE_EXAMS } from "@/modules/agam/lib/candidate-exams-catalog";
import { normalizeCycleSchedule } from "@/modules/agam/lib/cycle-schedule";
import type { AgamCycle } from "@/modules/agam/types";

export type AgamExamOpenings = Record<string, string | null>;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeExamOpenings(raw: unknown): AgamExamOpenings {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const next: AgamExamOpenings = {};
  for (const exam of SCHEDULED_CANDIDATE_EXAMS) {
    const value = source[exam.id];
    if (typeof value === "string" && ISO_DAY.test(value.slice(0, 10))) next[exam.id] = value.slice(0, 10);
  }
  return next;
}

/** Today's civil date in Israel, as YYYY-MM-DD. */
export function israelTodayIso(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export type ExamOpening = {
  /** Effective open date, or null when neither an override nor a prep day is set. */
  opensOn: string | null;
  /** "custom" — set by staff; "prep_day" — default from the cycle schedule. */
  source: "custom" | "prep_day" | null;
  prepDay: string | null;
};

export function resolveExamOpening(
  cycle: Pick<AgamCycle, "schedule" | "exam_openings"> | null,
  examId: string,
): ExamOpening {
  if (!cycle) return { opensOn: null, source: null, prepDay: null };
  const prepDay = normalizeCycleSchedule(cycle.schedule).prep_day ?? null;
  const custom = normalizeExamOpenings(cycle.exam_openings)[examId] ?? null;
  if (custom) return { opensOn: custom, source: "custom", prepDay };
  if (prepDay) return { opensOn: prepDay, source: "prep_day", prepDay };
  return { opensOn: null, source: null, prepDay };
}

export function isExamOpen(opensOn: string | null, today = israelTodayIso()): boolean {
  return Boolean(opensOn && opensOn <= today);
}
