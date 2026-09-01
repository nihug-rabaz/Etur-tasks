import * as XLSX from "xlsx";
import { STATUS_LABELS } from "@/modules/agam/lib/stages";
import type {
  AgamCandidate,
  AgamCriterion,
  AgamDayEvaluation,
  AgamInterview,
  AgamQuestion,
} from "@/modules/agam/types";

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

const EXPORT_GROUP_PREFIX: Record<ExportField["group"], string> = {
  candidate: "מועמד",
  pre_screening: "שאלון",
  interview: "ראיון",
  day: "יום מיונים",
};

const QUESTIONNAIRE_FIELD_LABELS: Record<string, string> = {
  full_name: "שם מלא",
  personal_number: "מספר אישי",
  phone: "טלפון",
  command: "פיקוד",
  direct_commander_name: "שם המפקד הישיר",
  planning_index: "מדד תכנוני",
  dapar: "דפ״ר",
  needs_sakmar: "צריך סכמר",
  mabdak_approval: "אישור למבדק",
  medical_issue: "בעיה רפואית",
  internet_test: "מבדק אינטרנט",
  gaps: "פערים",
};

export function exportColumnLabel(field: Pick<ExportField, "group" | "label">): string {
  return `${EXPORT_GROUP_PREFIX[field.group]}: ${field.label}`;
}

export function questionnaireFieldLabel(questions: AgamQuestion[], fieldKey: string): string {
  const question = questions.find(
    (row) => row.question_type === "pre_screening" && row.field_key === fieldKey,
  );
  return question?.question_text ?? QUESTIONNAIRE_FIELD_LABELS[fieldKey] ?? fieldKey;
}

export function buildQuestionnaireExportColumns(
  questions: AgamQuestion[],
  keys: string[],
): Array<{ key: string; label: string }> {
  return keys.map((key) => ({
    key: `q.${key}`,
    label: `שאלון: ${questionnaireFieldLabel(questions, key)}`,
  }));
}

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

export function downloadExcel(
  filename: string,
  rows: Array<Record<string, unknown>>,
  columns: Array<{ key: string; label: string }>,
): void {
  const normalizedFilename = filename.toLowerCase().endsWith(".xlsx") ? filename : filename.replace(/\.xls(x)?$/i, ".xlsx");
  const headerRow = columns.map((column) => column.label);
  const bodyRows = rows.map((row) =>
    columns.map((column) => {
      const value = row[column.key];
      if (value == null) return "";
      if (typeof value === "boolean") return value ? "כן" : "לא";
      return value;
    }),
  );
  const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...bodyRows]);
  worksheet["!cols"] = columns.map((column) => ({
    wch: Math.min(48, Math.max(12, column.label.length + 4)),
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "מועמדים");
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = normalizedFilename;
  link.click();
  URL.revokeObjectURL(url);
}

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
  { key: "candidate.command", label: "פיקוד", group: "candidate", get: (c) => c.command },
  {
    key: "candidate.direct_commander_name",
    label: "שם המפקד הישיר",
    group: "candidate",
    get: (c) => c.direct_commander_name,
  },
  { key: "candidate.gaps", label: "פערים", group: "candidate", get: (c) => c.gaps },
  { key: "candidate.planning_index", label: "מדד תכנוני", group: "candidate", get: (c) => c.planning_index },
  { key: "candidate.dapar", label: "דפ״ר", group: "candidate", get: (c) => c.dapar },
  { key: "candidate.rank_color", label: "דירוג צבע", group: "candidate", get: (c) => c.rank_color },
  {
    key: "candidate.needs_sakmar",
    label: "צריך סכמר",
    group: "candidate",
    get: (c) => (c.needs_sakmar == null ? "" : c.needs_sakmar ? "כן" : "לא"),
  },
  {
    key: "candidate.mabdak_approval",
    label: "אישור למבדק",
    group: "candidate",
    get: (c) => (c.mabdak_approval == null ? "" : c.mabdak_approval ? "כן" : "לא"),
  },
  {
    key: "candidate.medical_issue",
    label: "בעיה רפואית",
    group: "candidate",
    get: (c) => (c.medical_issue == null ? "" : c.medical_issue ? "כן" : "לא"),
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

export function buildCandidateListExportRow(
  candidate: AgamCandidate,
  questionnaireKeys: string[],
): Record<string, unknown> {
  const questionnaire = (candidate.questionnaire_data ?? {}) as Record<string, unknown>;
  const row: Record<string, unknown> = {};
  const emptyContext = {
    dayFinal: { final_score: "", weighted_score: "", final_feedback: "" },
    criterionScoreAvg: () => "",
    criterionFeedback: () => "",
    questionnaireValue: () => "",
    interviewAnswer: () => "",
  } satisfies ExportContext;

  for (const field of CANDIDATE_EXPORT_FIELDS) {
    row[field.key.replace("candidate.", "")] = field.get(candidate, emptyContext);
  }
  for (const key of questionnaireKeys) {
    const value = questionnaire[key];
    row[`q.${key}`] = value == null ? "" : value;
  }
  return row;
}

/** Backward-compatible alias used by candidates table basic export. */
export const BASIC_CANDIDATE_COLUMNS = CANDIDATE_EXPORT_FIELDS.map((field) => ({
  key: field.key.replace("candidate.", ""),
  label: exportColumnLabel(field),
}));

export function buildCandidateListExportColumns(
  questions: AgamQuestion[],
  questionnaireKeys: string[],
): Array<{ key: string; label: string }> {
  return [
    ...CANDIDATE_EXPORT_FIELDS.map((field) => ({
      key: field.key.replace("candidate.", ""),
      label: exportColumnLabel(field),
    })),
    ...buildQuestionnaireExportColumns(questions, questionnaireKeys),
  ];
}
