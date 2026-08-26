import { STATUS_LABELS } from "@/modules/agam/lib/stages";
import type {
  AgamCandidate,
  AgamCriterion,
  AgamDayEvaluation,
  AgamInterview,
  AgamQuestion,
} from "@/modules/agam/types";

export function rowsToCsv(
  rows: Array<Record<string, unknown>>,
  columns: Array<{ key: string; label: string }>,
): string {
  const escape = (value: unknown) => {
    const text = value == null ? "" : String(value);
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };
  const header = columns.map((column) => escape(column.label)).join(",");
  const body = rows
    .map((row) => columns.map((column) => escape(row[column.key])).join(","))
    .join("\n");
  return `${header}\n${body}`;
}

export function downloadCsv(filename: string, csvString: string): void {
  const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export type ExportField = {
  key: string;
  label: string;
  group: "candidate" | "pre_screening" | "interview" | "day";
  get: (candidate: AgamCandidate, ctx: ExportContext) => unknown;
};

export type ExportContext = {
  interview?: AgamInterview;
  dayFinal: {
    final_score: number | "";
    weighted_score: number | "";
    final_feedback: string;
  };
  criterionScoreAvg: (key: string) => number | "";
  criterionFeedback: (key: string) => string;
  questionnaireValue: (fieldKey: string) => string;
  interviewAnswer: (fieldKey: string) => string;
};

export const CANDIDATE_EXPORT_FIELDS: ExportField[] = [
  { key: "candidate.full_name", label: "שם מלא", group: "candidate", get: (c) => c.full_name },
  {
    key: "candidate.personal_number",
    label: "מספר אישי",
    group: "candidate",
    get: (c) => c.personal_number,
  },
  { key: "candidate.phone", label: "טלפון", group: "candidate", get: (c) => c.phone },
  {
    key: "candidate.status",
    label: "סטטוס",
    group: "candidate",
    get: (c) => STATUS_LABELS[c.status] ?? c.status,
  },
  {
    key: "candidate.ramad_notes",
    label: "הערות רמ״ד",
    group: "candidate",
    get: (c) => c.ramad_notes,
  },
];

export const INTERVIEW_STATIC_FIELDS: ExportField[] = [
  {
    key: "interview.evaluator_name",
    label: "שם מראיין",
    group: "interview",
    get: (_c, ctx) => ctx.interview?.evaluator_name,
  },
  {
    key: "interview.evaluator_assessment",
    label: "הערכת מראיין",
    group: "interview",
    get: (_c, ctx) => ctx.interview?.evaluator_assessment,
  },
  {
    key: "interview.recommendation",
    label: "המלצת מראיין",
    group: "interview",
    get: (_c, ctx) => ctx.interview?.recommendation,
  },
];

export const STATIC_DAY_FIELDS: ExportField[] = [
  {
    key: "day.final_score",
    label: "ציון מסכם (ממוצע)",
    group: "day",
    get: (_c, ctx) => ctx.dayFinal.final_score,
  },
  {
    key: "day.final_feedback",
    label: "הערה מסכמת",
    group: "day",
    get: (_c, ctx) => ctx.dayFinal.final_feedback,
  },
  {
    key: "day.weighted_score",
    label: "ציון משוקלל (ממוצע)",
    group: "day",
    get: (_c, ctx) => ctx.dayFinal.weighted_score,
  },
];

export function buildPreScreeningFields(questions: AgamQuestion[]): ExportField[] {
  return questions
    .filter((q) => q.question_type === "pre_screening" && q.is_active)
    .map((q) => ({
      key: `pre.${q.field_key}`,
      label: q.question_text,
      group: "pre_screening" as const,
      get: (_c: AgamCandidate, ctx: ExportContext) => ctx.questionnaireValue(q.field_key),
    }));
}

export function buildInterviewQuestionFields(questions: AgamQuestion[]): ExportField[] {
  return questions
    .filter((q) => q.question_type === "interview" && q.is_active)
    .map((q) => ({
      key: `interview.q.${q.field_key}`,
      label: q.question_text,
      group: "interview" as const,
      get: (_c: AgamCandidate, ctx: ExportContext) => ctx.interviewAnswer(q.field_key),
    }));
}

export function buildDayCriterionFields(criteria: AgamCriterion[]): ExportField[] {
  return criteria.flatMap((criterion) => [
    {
      key: `day.score.${criterion.key}`,
      label: `${criterion.name} - ציון (ממוצע)`,
      group: "day" as const,
      get: (_c: AgamCandidate, ctx: ExportContext) => ctx.criterionScoreAvg(criterion.key),
    },
    {
      key: `day.feedback.${criterion.key}`,
      label: `${criterion.name} - הערה`,
      group: "day" as const,
      get: (_c: AgamCandidate, ctx: ExportContext) => ctx.criterionFeedback(criterion.key),
    },
  ]);
}

export function buildCandidateContext(
  candidate: AgamCandidate,
  interviews: AgamInterview[],
  dayEvals: AgamDayEvaluation[],
): ExportContext {
  const interview = interviews.find((row) => row.candidate_id === candidate.id);
  const evals = dayEvals.filter((row) => row.candidate_id === candidate.id);
  const avg = (key: "final_score" | "weighted_score") => {
    const nums = evals.map((row) => row[key]).filter((value): value is number => typeof value === "number");
    return nums.length
      ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
      : ("" as const);
  };
  const questionnaire = (candidate.questionnaire_data ?? {}) as Record<string, unknown>;
  const answers = (interview?.interview_data ?? {}) as Record<string, unknown>;

  return {
    interview,
    dayFinal: {
      final_score: avg("final_score"),
      weighted_score: avg("weighted_score"),
      final_feedback: evals
        .map((row) => row.final_feedback)
        .filter(Boolean)
        .join(" | "),
    },
    criterionScoreAvg: (ckey) => {
      const nums = evals
        .map((row) => row.scores_data?.[ckey])
        .filter((value): value is number => typeof value === "number");
      return nums.length
        ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
        : "";
    },
    criterionFeedback: (ckey) =>
      evals
        .map((row) => row.feedback_data?.[ckey])
        .filter(Boolean)
        .join(" | "),
    questionnaireValue: (fieldKey) => {
      const value = questionnaire[fieldKey];
      return value == null ? "" : String(value);
    },
    interviewAnswer: (fieldKey) => {
      const value = answers[fieldKey];
      return value == null ? "" : String(value);
    },
  };
}

/** Backward-compatible alias used by candidates table basic export. */
export const BASIC_CANDIDATE_COLUMNS = CANDIDATE_EXPORT_FIELDS.map((field) => ({
  key: field.key.replace("candidate.", ""),
  label: field.label,
}));
