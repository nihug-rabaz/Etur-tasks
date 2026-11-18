import { isQuestionVisible } from "@/modules/agam/lib/questions";
import type { AgamInterview, AgamQuestion } from "@/modules/agam/types";

function asStringMap(data: Record<string, unknown> | null | undefined): Record<string, string> {
  const next: Record<string, string> = {};
  if (!data) return next;
  for (const [key, value] of Object.entries(data)) {
    next[key] = value == null ? "" : String(value);
  }
  return next;
}

function isAnswered(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

/** Candidate-facing interview questions (not staff-only evaluator fields). */
export function candidateInterviewQuestions(questions: AgamQuestion[]): AgamQuestion[] {
  return questions.filter((question) => question.is_active && !question.is_staff_only);
}

export type InterviewReadiness = {
  complete: boolean;
  /** The candidate opened the interview questions in the portal at least once. */
  started: boolean;
  requiredTotal: number;
  requiredAnswered: number;
  /** Required candidate questions that still have no answer. */
  unanswered: string[];
};

/** The candidate's part of the interview (answered in the candidate portal before the screener writes the interview). */
export function interviewReadiness(
  interview: AgamInterview | null | undefined,
  questions: AgamQuestion[],
): InterviewReadiness {
  const answers = asStringMap(interview?.candidate_part);
  const required = candidateInterviewQuestions(questions).filter(
    (question) => question.is_required && isQuestionVisible(question, answers),
  );
  const unanswered = required.filter((question) => !isAnswered(answers[question.field_key]));
  return {
    complete: Boolean(interview?.candidate_part_completed_at),
    started: Boolean(interview && Object.values(answers).some(isAnswered)),
    requiredTotal: required.length,
    requiredAnswered: required.length - unanswered.length,
    unanswered: unanswered.map((question) => question.question_text),
  };
}

/**
 * Plain-language list of what is missing in the candidate's part of the interview.
 * Empty array = ready to continue.
 */
export function interviewMissingItems(
  interview: AgamInterview | null | undefined,
  questions: AgamQuestion[],
): string[] {
  const readiness = interviewReadiness(interview, questions);
  if (readiness.complete) return [];

  const missing: string[] = [];
  if (!readiness.started) {
    missing.push(
      readiness.requiredTotal > 0
        ? `המועמד עוד לא ענה על שאלות הראיון שלו בפורטל המועמד (0 מתוך ${readiness.requiredTotal} שאלות חובה)`
        : "המועמד עוד לא נכנס לשאלות הראיון שלו בפורטל המועמד",
    );
  } else if (readiness.unanswered.length > 0) {
    missing.push(`המועמד ענה על ${readiness.requiredAnswered} מתוך ${readiness.requiredTotal} שאלות החובה`);
    for (const question of readiness.unanswered) missing.push(`חסרה תשובה לשאלה: ״${question}״`);
  }
  missing.push("המועמד עוד לא לחץ ״סיום והגשה״ על חלק הראיון בפורטל");
  return missing;
}

export function interviewReady(
  interview: AgamInterview | null | undefined,
  questions: AgamQuestion[],
): boolean {
  return interviewMissingItems(interview, questions).length === 0;
}
